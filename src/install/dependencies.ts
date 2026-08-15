import { spawn } from "node:child_process";
import { installCommand, type PackageManager } from "../detect/package-manager.js";

export interface InstallResult {
  ok: boolean;
  output: string;
}

/** Runs the package manager's add/install command for `packages` in `cwd`, capturing output. */
export function installPackages(
  manager: PackageManager,
  packages: string[],
  cwd: string,
): Promise<InstallResult> {
  const { command, args } = installCommand(manager, packages);

  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd, shell: process.platform === "win32" });
    let output = "";
    child.stdout?.on("data", (chunk) => (output += chunk));
    child.stderr?.on("data", (chunk) => (output += chunk));
    child.on("error", (err) => resolve({ ok: false, output: String(err) }));
    child.on("close", (code) => resolve({ ok: code === 0, output }));
  });
}
