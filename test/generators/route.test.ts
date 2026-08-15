import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { generateNextRoute } from "../../src/generators/route.js";
import { makeFixture, removeFixture } from "../support/fixture.js";

test("generateNextRoute writes a catch-all route importing the server handler", () => {
  const dir = makeFixture();
  try {
    const serverFile = path.join(dir, "verikit", "server.ts");
    const result = generateNextRoute(dir, serverFile);

    assert.equal(result.outcome, "created");
    assert.equal(
      result.routeFile,
      path.join(dir, "app", "api", "verikit", "[...path]", "route.ts"),
    );

    const contents = readFileSync(result.routeFile, "utf8");
    assert.match(contents, /import \{ verikit \} from "\.\.\/\.\.\/\.\.\/\.\.\/verikit\/server";/);
    assert.match(contents, /export const GET = verikit;/);
    assert.match(contents, /export const POST = verikit;/);
    assert.match(contents, /export const PATCH = verikit;/);
    assert.match(contents, /export const DELETE = verikit;/);
  } finally {
    removeFixture(dir);
  }
});

test("generateNextRoute prefixes a bare relative import with './'", () => {
  const dir = makeFixture();
  try {
    // Server file placed inside the route's own directory tree, so path.relative()
    // returns a path with no leading ".." segment.
    const serverFile = path.join(dir, "app", "api", "verikit", "[...path]", "nested", "server.ts");
    const result = generateNextRoute(dir, serverFile);
    const contents = readFileSync(result.routeFile, "utf8");
    assert.match(contents, /import \{ verikit \} from "\.\/nested\/server";/);
  } finally {
    removeFixture(dir);
  }
});

test("generateNextRoute is idempotent", () => {
  const dir = makeFixture();
  try {
    const serverFile = path.join(dir, "verikit", "server.ts");
    generateNextRoute(dir, serverFile);
    const second = generateNextRoute(dir, serverFile);
    assert.equal(second.outcome, "exists");
  } finally {
    removeFixture(dir);
  }
});

test("generateNextRoute in dry-run mode writes nothing", () => {
  const dir = makeFixture();
  try {
    const serverFile = path.join(dir, "verikit", "server.ts");
    const result = generateNextRoute(dir, serverFile, true);
    assert.equal(result.outcome, "created");
    assert.equal(existsSync(result.routeFile), false);
  } finally {
    removeFixture(dir);
  }
});
