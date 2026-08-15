import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/** Creates a temp directory populated with `files` (relative path -> contents), returning its absolute path. */
export function makeFixture(files: Record<string, string> = {}): string {
  const dir = mkdtempSync(path.join(tmpdir(), "verikit-cli-test-"));
  for (const [rel, contents] of Object.entries(files)) {
    const full = path.join(dir, rel);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, contents, "utf8");
  }
  return dir;
}

export function removeFixture(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

/** Runs `fn` with `process.cwd()` set to `dir`, always restoring the original cwd afterward. */
export async function withCwd<T>(dir: string, fn: () => Promise<T> | T): Promise<T> {
  const previous = process.cwd();
  process.chdir(dir);
  try {
    return await fn();
  } finally {
    process.chdir(previous);
  }
}

export const PACKAGE_JSON = (deps: Record<string, string> = {}): string =>
  JSON.stringify({ name: "fixture", private: true, dependencies: deps });
