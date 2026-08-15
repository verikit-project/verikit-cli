import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { generateServer } from "../../src/generators/server.js";
import { makeFixture, removeFixture } from "../support/fixture.js";

test("generateServer writes server.ts and example.ts with a Prisma note", () => {
  const dir = makeFixture();
  try {
    const result = generateServer(dir, "prisma");
    assert.equal(result.serverOutcome, "created");
    assert.equal(result.exampleOutcome, "created");
    assert.match(
      readFileSync(result.serverFile, "utf8"),
      /createPrismaAdapter/,
    );
    assert.match(readFileSync(result.exampleFile, "utf8"), /defineResource/);
  } finally {
    removeFixture(dir);
  }
});

test("generateServer notes Drizzle when that's the adapter", () => {
  const dir = makeFixture();
  try {
    const result = generateServer(dir, "drizzle");
    assert.match(
      readFileSync(result.serverFile, "utf8"),
      /createDrizzleAdapter/,
    );
  } finally {
    removeFixture(dir);
  }
});

test("generateServer notes no adapter when none is chosen", () => {
  const dir = makeFixture();
  try {
    const result = generateServer(dir, null);
    assert.match(
      readFileSync(result.serverFile, "utf8"),
      /Give each resource a storage adapter/,
    );
  } finally {
    removeFixture(dir);
  }
});

test("generateServer is idempotent: re-running reports 'exists' and doesn't overwrite", () => {
  const dir = makeFixture();
  try {
    generateServer(dir, "prisma");
    const original = readFileSync(
      path.join(dir, "verikit", "server.ts"),
      "utf8",
    );

    const second = generateServer(dir, "drizzle");
    assert.equal(second.serverOutcome, "exists");
    assert.equal(second.exampleOutcome, "exists");
    assert.equal(
      readFileSync(path.join(dir, "verikit", "server.ts"), "utf8"),
      original,
    );
  } finally {
    removeFixture(dir);
  }
});

test("generateServer in dry-run mode reports 'created' but writes nothing", () => {
  const dir = makeFixture();
  try {
    const result = generateServer(dir, "prisma", true);
    assert.equal(result.serverOutcome, "created");
    assert.equal(result.exampleOutcome, "created");
    assert.equal(existsSync(result.serverFile), false);
    assert.equal(existsSync(result.exampleFile), false);
  } finally {
    removeFixture(dir);
  }
});
