#!/usr/bin/env node
import { Command } from "commander";
import { realpathSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { InitAbort, runInit, type InitOptions } from "./commands/init.js";

export type RunInit = (options: InitOptions) => Promise<void>;

/**
 * Bridges a commander action to `runInit`, translating a thrown `InitAbort` into
 * `process.exitCode` instead of letting it surface as an unhandled rejection.
 */
export async function runInitCommand(
  opts: InitOptions,
  run: RunInit = runInit,
): Promise<void> {
  try {
    await run(opts);
  } catch (err) {
    if (err instanceof InitAbort) {
      process.exitCode = err.code;
      return;
    }
    throw err;
  }
}

/** `run` overrides what `init`/`install` ultimately call  used in tests to avoid driving a real interactive prompt. */
export function createProgram(run: RunInit = runInit): Command {
  const program = new Command();

  program
    .name("verikit")
    .description("Scaffolding CLI for VeriKit")
    .version("0.1.0");

  program
    .command("init")
    .description(
      "Detect your stack, install VeriKit packages, and generate the integration",
    )
    .option("--skip-install", "Generate files without installing dependencies")
    .option(
      "--dry-run",
      "Show what would be installed and generated without changing anything",
    )
    .action((opts: { skipInstall?: boolean; dryRun?: boolean }) =>
      runInitCommand(opts, run),
    );

  program
    .command("install")
    .description(
      "Install VeriKit packages for your detected stack, without generating integration files",
    )
    .option(
      "--dry-run",
      "Show what would be installed without changing anything",
    )
    .action((opts: { dryRun?: boolean }) =>
      runInitCommand({ ...opts, packagesOnly: true }, run),
    );

  return program;
}

/* node:coverage disable */
// `process.argv[1]` is the path used to invoke this script  when run through npm/npx's `bin`
// symlink (node_modules/.bin/verikit -> .../dist/index.js), that's the symlink path, while
// `import.meta.url` is Node's ESM loader resolving to the real, symlink-followed path. Without
// realpathSync here the two never match, `isMain` is always false, and the CLI silently no-ops
// for every real install  only direct `node dist/index.js` invocations happened to line up.
const isMain =
  typeof process.argv[1] === "string" &&
  import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;

if (isMain) {
  void createProgram().parseAsync(process.argv);
}
/* node:coverage enable */
