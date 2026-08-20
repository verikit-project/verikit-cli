import assert from "node:assert/strict";
import test from "node:test";
import { detectFramework } from "../../src/detect/framework.js";
import { makeFixture, removeFixture } from "../support/fixture.js";
import path from "node:path";

test("detectFramework finds Next.js with a src/app router", () => {
  const dir = makeFixture({ "src/app/layout.tsx": "" });
  try {
    const result = detectFramework(dir, {
      dependencies: { next: "15.0.0", react: "19.0.0" },
    });
    assert.equal(result.ui, "next");
    assert.equal(result.appDir, path.join(dir, "src"));
  } finally {
    removeFixture(dir);
  }
});

test("detectFramework finds Next.js with a root-level app router", () => {
  const dir = makeFixture({ "app/layout.tsx": "" });
  try {
    const result = detectFramework(dir, { dependencies: { next: "15.0.0" } });
    assert.equal(result.ui, "next");
    assert.equal(result.appDir, dir);
  } finally {
    removeFixture(dir);
  }
});

test("detectFramework flags Next.js with the Pages Router as having no app dir", () => {
  const dir = makeFixture({ "pages/index.tsx": "" });
  try {
    const result = detectFramework(dir, { dependencies: { next: "15.0.0" } });
    assert.equal(result.ui, "next");
    assert.equal(result.appDir, null);
  } finally {
    removeFixture(dir);
  }
});

test("detectFramework finds Vue", () => {
  const dir = makeFixture();
  try {
    const result = detectFramework(dir, { dependencies: { vue: "3.5.0" } });
    assert.equal(result.ui, "vue");
    assert.equal(result.appDir, null);
  } finally {
    removeFixture(dir);
  }
});

test("detectFramework treats Nuxt as Vue", () => {
  const dir = makeFixture();
  try {
    const result = detectFramework(dir, { dependencies: { nuxt: "4.0.0" } });
    assert.equal(result.ui, "vue");
    assert.equal(result.appDir, null);
  } finally {
    removeFixture(dir);
  }
});

test("detectFramework finds plain React", () => {
  const dir = makeFixture();
  try {
    const result = detectFramework(dir, { dependencies: { react: "19.0.0" } });
    assert.equal(result.ui, "react");
  } finally {
    removeFixture(dir);
  }
});

test("detectFramework reports no UI framework when none is detected", () => {
  const dir = makeFixture();
  try {
    const result = detectFramework(dir, {});
    assert.equal(result.ui, null);
    assert.equal(result.appDir, null);
  } finally {
    removeFixture(dir);
  }
});

test("detectFramework detects TypeScript via the dependency", () => {
  const dir = makeFixture();
  try {
    const result = detectFramework(dir, {
      devDependencies: { typescript: "5.0.0" },
    });
    assert.equal(result.typescript, true);
  } finally {
    removeFixture(dir);
  }
});

test("detectFramework detects TypeScript via tsconfig.json", () => {
  const dir = makeFixture({ "tsconfig.json": "{}" });
  try {
    const result = detectFramework(dir, {});
    assert.equal(result.typescript, true);
  } finally {
    removeFixture(dir);
  }
});

test("detectFramework reports no TypeScript when neither signal is present", () => {
  const dir = makeFixture();
  try {
    const result = detectFramework(dir, {});
    assert.equal(result.typescript, false);
  } finally {
    removeFixture(dir);
  }
});
