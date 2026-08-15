import assert from "node:assert/strict";
import test from "node:test";
import { InitAbort } from "../src/commands/init.js";
import { createProgram, runInitCommand } from "../src/index.js";

test("runInitCommand forwards parsed options to runInit", async () => {
  const calls: { skipInstall?: boolean; dryRun?: boolean }[] = [];
  await runInitCommand({ skipInstall: true, dryRun: false }, async (options) => {
    calls.push(options);
  });
  assert.deepEqual(calls, [{ skipInstall: true, dryRun: false }]);
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

test("createProgram's init command parses flags and invokes the injected run function", async () => {
  const calls: { skipInstall?: boolean; dryRun?: boolean }[] = [];
  const program = createProgram(async (options) => {
    calls.push(options);
  });

  await program.parseAsync(["node", "verikit", "init", "--skip-install", "--dry-run"]);

  assert.deepEqual(calls, [{ skipInstall: true, dryRun: true }]);
});

test("createProgram's init command defaults flags to undefined when omitted", async () => {
  const calls: { skipInstall?: boolean; dryRun?: boolean }[] = [];
  const program = createProgram(async (options) => {
    calls.push(options);
  });

  await program.parseAsync(["node", "verikit", "init"]);

  assert.deepEqual(calls, [{ skipInstall: undefined, dryRun: undefined }]);
});
