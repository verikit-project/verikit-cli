import { existsSync } from "node:fs";
import path from "node:path";
import { insertLineIfAbsent } from "../utils/fs.js";

const THEME_IMPORT = '@import "@verikit/theme/globals.css";';

const CANDIDATE_STYLESHEETS = [
  "src/app/globals.css",
  "app/globals.css",
  "src/styles/globals.css",
  "styles/globals.css",
  "src/index.css",
  "src/style.css",
];

export type ThemeOutcome =
  | { status: "inserted" | "already-present"; file: string }
  | { status: "not-found" };

/** Finds the project's global stylesheet and inserts the VeriKit theme import if it's missing. */
export function applyTheme(cwd: string, dryRun = false): ThemeOutcome {
  for (const candidate of CANDIDATE_STYLESHEETS) {
    const file = path.join(cwd, candidate);
    if (!existsSync(file)) continue;
    // The existsSync check above guarantees insertLineIfAbsent can't return "not-found" here.
    const status = insertLineIfAbsent(file, THEME_IMPORT, dryRun) as "inserted" | "already-present";
    return { status, file };
  }
  return { status: "not-found" };
}

export { THEME_IMPORT };
