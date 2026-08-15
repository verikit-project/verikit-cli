import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { insertLineIfAbsent, writeFileIfAbsent } from "../../src/utils/fs.js";
import { makeFixture, removeFixture } from "../support/fixture.js";

test("writeFileIfAbsent creates the file and parent directories", () => {
  const dir = makeFixture();
  try {
    const file = path.join(dir, "nested", "deep", "file.txt");
    const outcome = writeFileIfAbsent(file, "hello");
    assert.equal(outcome, "created");
    assert.equal(readFileSync(file, "utf8"), "hello");
  } finally {
    removeFixture(dir);
  }
});

test("writeFileIfAbsent never overwrites an existing file", () => {
  const dir = makeFixture({ "file.txt": "original" });
  try {
    const file = path.join(dir, "file.txt");
    const outcome = writeFileIfAbsent(file, "new contents");
    assert.equal(outcome, "exists");
    assert.equal(readFileSync(file, "utf8"), "original");
  } finally {
    removeFixture(dir);
  }
});

test("writeFileIfAbsent in dry-run mode reports 'created' without writing", () => {
  const dir = makeFixture();
  try {
    const file = path.join(dir, "file.txt");
    const outcome = writeFileIfAbsent(file, "hello", true);
    assert.equal(outcome, "created");
    assert.equal(existsSync(file), false);
  } finally {
    removeFixture(dir);
  }
});

test("insertLineIfAbsent returns not-found when the file doesn't exist", () => {
  const dir = makeFixture();
  try {
    const outcome = insertLineIfAbsent(
      path.join(dir, "missing.css"),
      "@import x;",
    );
    assert.equal(outcome, "not-found");
  } finally {
    removeFixture(dir);
  }
});

test("insertLineIfAbsent inserts the line at the top when absent", () => {
  const dir = makeFixture({ "file.css": "body {}" });
  try {
    const file = path.join(dir, "file.css");
    const outcome = insertLineIfAbsent(file, "@import x;");
    assert.equal(outcome, "inserted");
    assert.equal(readFileSync(file, "utf8"), "@import x;\nbody {}");
  } finally {
    removeFixture(dir);
  }
});

test("insertLineIfAbsent reports already-present without duplicating the line", () => {
  const dir = makeFixture({ "file.css": "@import x;\nbody {}" });
  try {
    const file = path.join(dir, "file.css");
    const outcome = insertLineIfAbsent(file, "@import x;");
    assert.equal(outcome, "already-present");
    assert.equal(readFileSync(file, "utf8"), "@import x;\nbody {}");
  } finally {
    removeFixture(dir);
  }
});

test("insertLineIfAbsent in dry-run mode reports 'inserted' without writing", () => {
  const dir = makeFixture({ "file.css": "body {}" });
  try {
    const file = path.join(dir, "file.css");
    const outcome = insertLineIfAbsent(file, "@import x;", true);
    assert.equal(outcome, "inserted");
    assert.equal(readFileSync(file, "utf8"), "body {}");
  } finally {
    removeFixture(dir);
  }
});
