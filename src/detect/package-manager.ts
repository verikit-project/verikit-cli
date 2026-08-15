import { existsSync } from "node:fs";
import path from "node:path";

export type PackageManager = "pnpm" | "npm" | "yarn" | "bun";

const LOCKFILES: Record<string, PackageManager> = {
  "pnpm-lock.yaml": "pnpm",
  "package-lock.json": "npm",
  "yarn.lock": "yarn",
  "bun.lockb": "bun",
  "bun.lock": "bun",
};

/** Detects the package manager from lockfiles in `cwd`, falling back to the `npm_config_user_agent` env var, then npm. */
export function detectPackageManager(cwd: string): PackageManager {
  for (const [file, manager] of Object.entries(LOCKFILES)) {
    if (existsSync(path.join(cwd, file))) return manager;
  }

  const userAgent = process.env.npm_config_user_agent;
  if (userAgent) {
    if (userAgent.startsWith("pnpm")) return "pnpm";
    if (userAgent.startsWith("yarn")) return "yarn";
    if (userAgent.startsWith("bun")) return "bun";
    if (userAgent.startsWith("npm")) return "npm";
  }

  return "npm";
}

/** Builds the install invocation for adding the given packages as production dependencies. */
export function installCommand(
  manager: PackageManager,
  packages: string[],
): { command: string; args: string[] } {
  switch (manager) {
    case "pnpm":
      return { command: "pnpm", args: ["add", ...packages] };
    case "yarn":
      return { command: "yarn", args: ["add", ...packages] };
    case "bun":
      return { command: "bun", args: ["add", ...packages] };
    case "npm":
      return { command: "npm", args: ["install", ...packages] };
  }
}
