import assert from "node:assert/strict";
import test from "node:test";
import { installPackages, runCommand } from "../../src/install/dependencies.js";
import { makeFixture, removeFixture } from "../support/fixture.js";

test("runCommand resolves ok:true and captures stdout on success", async () => {
  const dir = makeFixture();
  try {
    const result = await runCommand(
      process.execPath,
      ["-e", "console.log('hello')"],
      dir,
    );
    assert.equal(result.ok, true);
    assert.match(result.output, /hello/);
  } finally {
    removeFixture(dir);
  }
});

test("runCommand resolves ok:false on a non-zero exit code", async () => {
  const dir = makeFixture();
  try {
    const result = await runCommand(
      process.execPath,
      ["-e", "process.exit(1)"],
      dir,
    );
    assert.equal(result.ok, false);
  } finally {
    removeFixture(dir);
  }
});

test("runCommand captures stderr output too", async () => {
  const dir = makeFixture();
  try {
    const result = await runCommand(
      process.execPath,
      ["-e", "console.error('oops'); process.exit(1)"],
      dir,
    );
    assert.equal(result.ok, false);
    assert.match(result.output, /oops/);
  } finally {
    removeFixture(dir);
  }
});

test("runCommand resolves ok:false when the command can't be spawned", async () => {
  const dir = makeFixture();
  try {
    const result = await runCommand(
      "verikit-cli-definitely-not-a-real-binary",
      [],
      dir,
    );
    assert.equal(result.ok, false);
    assert.ok(result.output.length > 0);
  } finally {
    removeFixture(dir);
  }
});

test("installPackages delegates to installCommand and the injected runner", async () => {
  const calls: { command: string; args: string[]; cwd: string }[] = [];
  const fakeRun = async (command: string, args: string[], cwd: string) => {
    calls.push({ command, args, cwd });
    return { ok: true, output: "" };
  };

  const result = await installPackages(
    "pnpm",
    ["@verikit/server@latest"],
    "/some/dir",
    fakeRun,
  );

  assert.equal(result.ok, true);
  assert.deepEqual(calls, [
    {
      command: "pnpm",
      args: ["add", "@verikit/server@latest"],
      cwd: "/some/dir",
    },
  ]);
});
