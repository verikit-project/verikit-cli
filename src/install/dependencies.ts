import { spawn } from "node:child_process";
import { installCommand, type PackageManager } from "../detect/package-manager.js";

export interface InstallResult {
  ok: boolean;
  output: string;
}

/** Runs `command args` in `cwd`, capturing combined stdout/stderr. Never rejects. */
export function runCommand(command: string, args: string[], cwd: string): Promise<InstallResult> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd, shell: process.platform === "win32" });
    let output = "";
    child.stdout?.on("data", (chunk: Buffer) => (output += chunk));
    child.stderr?.on("data", (chunk: Buffer) => (output += chunk));
    child.on("error", (err: Error) => resolve({ ok: false, output: String(err) }));
    child.on("close", (code: number | null) => resolve({ ok: code === 0, output }));
  });
}

export type InstallPackages = (
  manager: PackageManager,
  packages: string[],
  cwd: string,
) => Promise<InstallResult>;

/** Runs the package manager's add/install command for `packages` in `cwd`, capturing output. */
export function installPackages(
  manager: PackageManager,
  packages: string[],
  cwd: string,
  run: typeof runCommand = runCommand,
): Promise<InstallResult> {
  const { command, args } = installCommand(manager, packages);
  return run(command, args, cwd);
}
