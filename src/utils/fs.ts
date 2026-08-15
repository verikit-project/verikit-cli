import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export type WriteOutcome = "created" | "exists";

/**
 * Writes `contents` to `file`, creating parent directories as needed. Never overwrites an
 * existing file. With `dryRun`, reports what would happen without touching the filesystem.
 */
export function writeFileIfAbsent(
  file: string,
  contents: string,
  dryRun = false,
): WriteOutcome {
  if (existsSync(file)) return "exists";
  if (!dryRun) {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, contents, "utf8");
  }
  return "created";
}

export type InsertOutcome = "inserted" | "already-present" | "not-found";

/**
 * Inserts `line` at the top of `file` if it isn't already present anywhere in the file. With
 * `dryRun`, reports what would happen without touching the filesystem.
 */
export function insertLineIfAbsent(
  file: string,
  line: string,
  dryRun = false,
): InsertOutcome {
  if (!existsSync(file)) return "not-found";
  const contents = readFileSync(file, "utf8");
  if (contents.includes(line)) return "already-present";
  if (!dryRun) writeFileSync(file, `${line}\n${contents}`, "utf8");
  return "inserted";
}
