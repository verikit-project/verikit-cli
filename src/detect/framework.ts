import { existsSync } from "node:fs";
import path from "node:path";
import { hasDependency, type PackageJson } from "./project.js";

export type UiFramework = "next" | "react" | "vue" | null;

export interface FrameworkInfo {
  ui: UiFramework;
  /** Next.js only: the source root actually holds `app/`, so routes are generated under it. */
  appDir: string | null;
  typescript: boolean;
}

/** Locates a Next.js App Router `app/` directory, preferring `src/app`. Returns its parent (the source root) or `null` if neither exists. */
function findAppRouterRoot(cwd: string): string | null {
  if (existsSync(path.join(cwd, "src", "app"))) return path.join(cwd, "src");
  if (existsSync(path.join(cwd, "app"))) return cwd;
  return null;
}

export function detectFramework(cwd: string, pkg: PackageJson): FrameworkInfo {
  const typescript =
    hasDependency(pkg, "typescript") || existsSync(path.join(cwd, "tsconfig.json"));

  if (hasDependency(pkg, "next")) {
    return { ui: "next", appDir: findAppRouterRoot(cwd), typescript };
  }
  if (hasDependency(pkg, "vue")) {
    return { ui: "vue", appDir: null, typescript };
  }
  if (hasDependency(pkg, "react")) {
    return { ui: "react", appDir: null, typescript };
  }
  return { ui: null, appDir: null, typescript };
}
