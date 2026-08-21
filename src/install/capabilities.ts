import type { Adapter } from "../detect/database.js";
import type { UiFramework } from "../detect/framework.js";
import { hasDependency, type PackageJson } from "../detect/project.js";

/**
 * Top-level dependencies required by each capability. Kept explicit because
 * generated integrations may import packages directly, which isolated
 * node_modules setups don't expose transitively.
 *
 * Keep in sync with the framework's @verikit/* versions.
 */
const VERIKIT_VERSION = "latest";

function verikit(...names: string[]): string[] {
  return names.map((name) => `@verikit/${name}@${VERIKIT_VERSION}`);
}

/** Strips a trailing `@version` from an install spec, e.g. `"@verikit/react@latest"` -> `"@verikit/react"`. */
function bareName(spec: string): string {
  const at = spec.lastIndexOf("@");
  return at > 0 ? spec.slice(0, at) : spec;
}

export interface ResolvedPackages {
  /** Packages to add as normal dependencies. */
  packages: string[];
}

export interface StackSelection {
  server: boolean;
  ui: UiFramework;
  theme: boolean;
  adapter: Adapter;
  /** The target project's `package.json`, used to skip packages it already declares. */
  pkg: PackageJson;
}

export function resolvePackages(selection: StackSelection): ResolvedPackages {
  const packages: string[] = [];
  const add = (...specs: string[]) => {
    for (const spec of specs) {
      if (
        !hasDependency(selection.pkg, bareName(spec)) &&
        !packages.includes(spec)
      ) {
        packages.push(spec);
      }
    }
  };

  if (selection.server) add(...verikit("core", "runtime", "client", "server"));

  if (selection.ui === "react" || selection.ui === "next") {
    add(
      ...verikit("core", "react"),
      "@tanstack/react-query",
      "@tanstack/react-form",
      "@tanstack/react-table",
      "@base-ui/react",
    );
    if (selection.theme) add(...verikit("theme"));
  } else if (selection.ui === "vue") {
    add(
      ...verikit("core", "vue"),
      "@tanstack/vue-query",
      "@tanstack/vue-form",
      "@tanstack/vue-table",
      "reka-ui",
    );
    if (selection.theme) add(...verikit("theme"));
  }

  if (selection.adapter === "prisma") add(...verikit("prisma"));
  if (selection.adapter === "drizzle") add(...verikit("drizzle"));

  return { packages };
}
