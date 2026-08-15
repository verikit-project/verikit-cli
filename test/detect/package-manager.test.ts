import assert from "node:assert/strict";
import test from "node:test";
import { detectPackageManager, installCommand } from "../../src/detect/package-manager.js";
import { makeFixture, removeFixture } from "../support/fixture.js";

test("detectPackageManager finds pnpm via pnpm-lock.yaml", () => {
  const dir = makeFixture({ "pnpm-lock.yaml": "" });
  try {
    assert.equal(detectPackageManager(dir), "pnpm");
  } finally {
    removeFixture(dir);
  }
});

test("detectPackageManager finds npm via package-lock.json", () => {
  const dir = makeFixture({ "package-lock.json": "{}" });
  try {
    assert.equal(detectPackageManager(dir), "npm");
  } finally {
    removeFixture(dir);
  }
});

test("detectPackageManager finds yarn via yarn.lock", () => {
  const dir = makeFixture({ "yarn.lock": "" });
  try {
    assert.equal(detectPackageManager(dir), "yarn");
  } finally {
    removeFixture(dir);
  }
});

test("detectPackageManager finds bun via bun.lockb", () => {
  const dir = makeFixture({ "bun.lockb": "" });
  try {
    assert.equal(detectPackageManager(dir), "bun");
  } finally {
    removeFixture(dir);
  }
});

test("detectPackageManager finds bun via bun.lock", () => {
  const dir = makeFixture({ "bun.lock": "" });
  try {
    assert.equal(detectPackageManager(dir), "bun");
  } finally {
    removeFixture(dir);
  }
});

test("detectPackageManager falls back to npm_config_user_agent", async (t) => {
  const dir = makeFixture();
  // Force the "already set" case deterministically, regardless of the ambient environment.
  process.env.npm_config_user_agent = "sentinel/0.0.0";
  const previous = process.env.npm_config_user_agent;
  t.after(() => {
    removeFixture(dir);
    if (previous === undefined) delete process.env.npm_config_user_agent;
    else process.env.npm_config_user_agent = previous;
  });

  process.env.npm_config_user_agent = "pnpm/9.0.0 node/v24.0.0";
  assert.equal(detectPackageManager(dir), "pnpm");

  process.env.npm_config_user_agent = "yarn/4.0.0 node/v24.0.0";
  assert.equal(detectPackageManager(dir), "yarn");

  process.env.npm_config_user_agent = "bun/1.0.0 node/v24.0.0";
  assert.equal(detectPackageManager(dir), "bun");

  process.env.npm_config_user_agent = "npm/10.0.0 node/v24.0.0";
  assert.equal(detectPackageManager(dir), "npm");
});

test("detectPackageManager defaults to npm with an unrecognized user agent", async (t) => {
  const dir = makeFixture();
  const previous = process.env.npm_config_user_agent;
  t.after(() => {
    removeFixture(dir);
    if (previous === undefined) delete process.env.npm_config_user_agent;
    else process.env.npm_config_user_agent = previous;
  });

  process.env.npm_config_user_agent = "some-other-tool/1.0.0";
  assert.equal(detectPackageManager(dir), "npm");
});

test("detectPackageManager defaults to npm with no lockfile and no user agent", async (t) => {
  const dir = makeFixture();
  // Force the "unset" case deterministically: the ambient environment (e.g. under pnpm) may
  // already have this set, which would otherwise make `previous` environment-dependent.
  delete process.env.npm_config_user_agent;
  const previous = process.env.npm_config_user_agent;
  t.after(() => {
    removeFixture(dir);
    if (previous === undefined) delete process.env.npm_config_user_agent;
    else process.env.npm_config_user_agent = previous;
  });

  delete process.env.npm_config_user_agent;
  assert.equal(detectPackageManager(dir), "npm");
});

test("installCommand builds the right invocation per package manager", () => {
  assert.deepEqual(installCommand("pnpm", ["a", "b"]), { command: "pnpm", args: ["add", "a", "b"] });
  assert.deepEqual(installCommand("yarn", ["a"]), { command: "yarn", args: ["add", "a"] });
  assert.deepEqual(installCommand("bun", ["a"]), { command: "bun", args: ["add", "a"] });
  assert.deepEqual(installCommand("npm", ["a"]), { command: "npm", args: ["install", "a"] });
});
