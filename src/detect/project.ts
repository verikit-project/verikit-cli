import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export interface PackageJson {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

/** Reads and parses `package.json` from `cwd`, or `null` if it doesn't exist / isn't valid JSON. */
export function readPackageJson(cwd: string): PackageJson | null {
  const file = path.join(cwd, "package.json");
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8")) as PackageJson;
  } catch {
    return null;
  }
}

/** True if `name` appears in either `dependencies` or `devDependencies`. */
export function hasDependency(pkg: PackageJson, name: string): boolean {
  return Boolean(pkg.dependencies?.[name] ?? pkg.devDependencies?.[name]);
}

/** The directory generated source files should live under: `src/` if the project has one, else the project root. */
export function detectSrcRoot(cwd: string): string {
  return existsSync(path.join(cwd, "src")) ? path.join(cwd, "src") : cwd;
}
