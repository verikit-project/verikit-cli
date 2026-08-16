import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { InitAbort } from "../src/commands/init.js";
import { createProgram, runInitCommand } from "../src/index.js";

test("runInitCommand forwards parsed options to runInit", async () => {
  const calls: object[] = [];
  await runInitCommand(
    { skipInstall: true, dryRun: false, packagesOnly: true },
    async (options) => {
      calls.push(options);
    },
  );
  assert.deepEqual(calls, [
    { skipInstall: true, dryRun: false, packagesOnly: true },
  ]);
});

test("runInitCommand sets process.exitCode from an InitAbort and swallows it", async () => {
  const previous = process.exitCode;
  try {
    await runInitCommand({}, async () => {
      throw new InitAbort(1);
    });
    assert.equal(process.exitCode, 1);
  } finally {
    process.exitCode = previous;
  }
});

test("runInitCommand sets exitCode 0 for a cancelled InitAbort", async () => {
  const previous = process.exitCode;
  try {
    await runInitCommand({}, async () => {
      throw new InitAbort(0);
    });
    assert.equal(process.exitCode, 0);
  } finally {
    process.exitCode = previous;
  }
});

test("runInitCommand rethrows errors that aren't InitAbort", async () => {
  await assert.rejects(
    () =>
      runInitCommand({}, async () => {
        throw new Error("boom");
      }),
    /boom/,
  );
});

test("createProgram wires up the init command with its options", () => {
  const program = createProgram();
  assert.equal(program.name(), "verikit");

  const init = program.commands.find((c) => c.name() === "init");
  assert.ok(init);
  const optionFlags = init.options.map((o) => o.long);
  assert.ok(optionFlags.includes("--skip-install"));
  assert.ok(optionFlags.includes("--dry-run"));
});

test("createProgram wires up the install command with its options", () => {
  const program = createProgram();

  const install = program.commands.find((c) => c.name() === "install");
  assert.ok(install);
  const optionFlags = install.options.map((o) => o.long);
  assert.ok(optionFlags.includes("--dry-run"));
  assert.ok(!optionFlags.includes("--skip-install"));
});

test("createProgram's init command parses flags and invokes the injected run function", async () => {
  const calls: { skipInstall?: boolean; dryRun?: boolean }[] = [];
  const program = createProgram(async (options) => {
    calls.push(options);
  });

  await program.parseAsync([
    "node",
    "verikit",
    "init",
    "--skip-install",
    "--dry-run",
  ]);

  assert.deepEqual(calls, [{ skipInstall: true, dryRun: true }]);
});

test("createProgram's init command defaults flags to undefined when omitted", async () => {
  const calls: object[] = [];
  const program = createProgram(async (options) => {
    calls.push(options);
  });

  await program.parseAsync(["node", "verikit", "init"]);

  assert.deepEqual(calls, [{}]);
});

test("createProgram's install command forces packagesOnly and parses --dry-run", async () => {
  const calls: object[] = [];
  const program = createProgram(async (options) => {
    calls.push(options);
  });

  await program.parseAsync(["node", "verikit", "install", "--dry-run"]);

  assert.deepEqual(calls, [{ dryRun: true, packagesOnly: true }]);
});

test("createProgram's install command defaults dryRun to undefined when omitted", async () => {
  const calls: object[] = [];
  const program = createProgram(async (options) => {
    calls.push(options);
  });

  await program.parseAsync(["node", "verikit", "install"]);

  assert.deepEqual(calls, [{ packagesOnly: true }]);
});

test("the built entrypoint still runs when invoked through a symlink (npm/npx's bin layout)", () => {
  // node_modules/.bin/<name> is always a symlink to the package's real file, never a copy  this
  // reproduces that so the isMain check's realpath handling can't silently regress.
  const compiledEntry = path.resolve(process.cwd(), ".test-dist/src/index.js");
  const dir = mkdtempSync(path.join(tmpdir(), "verikit-cli-bin-symlink-"));
  const link = path.join(dir, "verikit");
  symlinkSync(compiledEntry, link);

  try {
    const output = execFileSync(process.execPath, [link, "--help"], {
      encoding: "utf8",
    });
    assert.match(output, /Usage: verikit/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
