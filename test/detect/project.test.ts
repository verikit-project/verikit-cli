import assert from "node:assert/strict";
import test from "node:test";
import {
  detectSrcRoot,
  hasDependency,
  readPackageJson,
} from "../../src/detect/project.js";
import { makeFixture, removeFixture } from "../support/fixture.js";
import path from "node:path";

test("readPackageJson parses an existing package.json", () => {
  const dir = makeFixture({
    "package.json": '{"name":"fixture","dependencies":{"react":"19.0.0"}}',
  });
  try {
    assert.deepEqual(readPackageJson(dir), {
      name: "fixture",
      dependencies: { react: "19.0.0" },
    });
  } finally {
    removeFixture(dir);
  }
});

test("readPackageJson returns null when package.json is missing", () => {
  const dir = makeFixture();
  try {
    assert.equal(readPackageJson(dir), null);
  } finally {
    removeFixture(dir);
  }
});

test("readPackageJson returns null for invalid JSON", () => {
  const dir = makeFixture({ "package.json": "{ not valid json" });
  try {
    assert.equal(readPackageJson(dir), null);
  } finally {
    removeFixture(dir);
  }
});

test("hasDependency checks dependencies and devDependencies", () => {
  assert.equal(
    hasDependency({ dependencies: { react: "19.0.0" } }, "react"),
    true,
  );
  assert.equal(
    hasDependency({ devDependencies: { typescript: "5.0.0" } }, "typescript"),
    true,
  );
  assert.equal(hasDependency({}, "react"), false);
  assert.equal(hasDependency({ dependencies: {} }, "react"), false);
});

test("detectSrcRoot prefers an existing src/ directory", () => {
  const dir = makeFixture({ "src/index.ts": "" });
  try {
    assert.equal(detectSrcRoot(dir), path.join(dir, "src"));
  } finally {
    removeFixture(dir);
  }
});

test("detectSrcRoot falls back to the project root", () => {
  const dir = makeFixture();
  try {
    assert.equal(detectSrcRoot(dir), dir);
  } finally {
    removeFixture(dir);
  }
});
