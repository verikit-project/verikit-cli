import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { applyTheme, THEME_IMPORT } from "../../src/generators/theme.js";
import { makeFixture, removeFixture } from "../support/fixture.js";

test("applyTheme inserts the import into the first stylesheet it finds", () => {
  const dir = makeFixture({ "src/app/globals.css": "body { margin: 0; }" });
  try {
    const result = applyTheme(dir);
    assert.deepEqual(result, { status: "inserted", file: path.join(dir, "src/app/globals.css") });
    assert.equal(
      readFileSync(path.join(dir, "src/app/globals.css"), "utf8"),
      `${THEME_IMPORT}\nbody { margin: 0; }`,
    );
  } finally {
    removeFixture(dir);
  }
});

test("applyTheme skips missing candidates before finding one that exists", () => {
  // No src/app/globals.css or app/globals.css, but styles/globals.css exists.
  const dir = makeFixture({ "styles/globals.css": "" });
  try {
    const result = applyTheme(dir);
    assert.equal(result.status, "inserted");
    assert.equal((result as { file: string }).file, path.join(dir, "styles/globals.css"));
  } finally {
    removeFixture(dir);
  }
});

test("applyTheme reports already-present when the import is already there", () => {
  const dir = makeFixture({ "src/index.css": `${THEME_IMPORT}\nbody {}` });
  try {
    const result = applyTheme(dir);
    assert.equal(result.status, "already-present");
  } finally {
    removeFixture(dir);
  }
});

test("applyTheme reports not-found when no candidate stylesheet exists", () => {
  const dir = makeFixture();
  try {
    assert.deepEqual(applyTheme(dir), { status: "not-found" });
  } finally {
    removeFixture(dir);
  }
});

test("applyTheme in dry-run mode reports inserted but writes nothing", () => {
  const dir = makeFixture({ "src/style.css": "body {}" });
  try {
    const result = applyTheme(dir, true);
    assert.equal(result.status, "inserted");
    assert.equal(readFileSync(path.join(dir, "src/style.css"), "utf8"), "body {}");
  } finally {
    removeFixture(dir);
  }
});
