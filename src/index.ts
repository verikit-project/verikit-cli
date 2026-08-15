#!/usr/bin/env node
import { Command } from "commander";
import { pathToFileURL } from "node:url";
import { InitAbort, runInit, type InitOptions } from "./commands/init.js";

export type RunInit = (options: InitOptions) => Promise<void>;

/**
 * Bridges commander's `init` action to `runInit`, translating a thrown `InitAbort` into
 * `process.exitCode` instead of letting it surface as an unhandled rejection.
 */
export async function runInitCommand(
  opts: { skipInstall?: boolean; dryRun?: boolean },
  run: RunInit = runInit,
): Promise<void> {
  try {
    await run({ skipInstall: opts.skipInstall, dryRun: opts.dryRun });
  } catch (err) {
    if (err instanceof InitAbort) {
      process.exitCode = err.code;
      return;
    }
    throw err;
  }
}

/** `run` overrides what `init` ultimately calls — used in tests to avoid driving a real interactive prompt. */
export function createProgram(run: RunInit = runInit): Command {
  const program = new Command();

  program.name("verikit").description("Scaffolding CLI for VeriKit").version("0.1.0");

  program
    .command("init")
    .description("Detect your stack, install VeriKit packages, and generate the integration")
    .option("--skip-install", "Generate files without installing dependencies")
    .option("--dry-run", "Show what would be installed and generated without changing anything")
    .action((opts: { skipInstall?: boolean; dryRun?: boolean }) => runInitCommand(opts, run));

  return program;
}

/* node:coverage disable */
const isMain =
  typeof process.argv[1] === "string" &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  void createProgram().parseAsync(process.argv);
}
/* node:coverage enable */
