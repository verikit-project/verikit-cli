#!/usr/bin/env node
import { Command } from "commander";
import { runInit } from "./commands/init.js";

const program = new Command();

program.name("verikit").description("Scaffolding CLI for VeriKit").version("0.1.0");

program
  .command("init")
  .description("Detect your stack, install VeriKit packages, and generate the integration")
  .option("--skip-install", "Generate files without installing dependencies")
  .option("--dry-run", "Show what would be installed and generated without changing anything")
  .action(async (opts: { skipInstall?: boolean; dryRun?: boolean }) => {
    await runInit({ skipInstall: opts.skipInstall, dryRun: opts.dryRun });
  });

program.parseAsync(process.argv);
