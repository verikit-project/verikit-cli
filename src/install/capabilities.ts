import type { Adapter } from "../detect/database.js";
import type { UiFramework } from "../detect/framework.js";

/**
 * Top-level packages to install per capability, kept explicit rather than relying on transitive
 * resolution: package managers with isolated node_modules (pnpm, Yarn PnP/strict) don't expose a
 * dependency's own dependencies to application code, so anything the generated integration code
 * imports directly (e.g. `@verikit/theme/globals.css`) has to be a direct dependency too.
 *
 * Mirrors the workspace at framework/ (@verikit/* 0.23.x)  update alongside it.
 */
const VERIKIT_VERSION = "^0.23.1";

function verikit(...names: string[]): string[] {
  return names.map((name) => `@verikit/${name}@${VERIKIT_VERSION}`);
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
  /** Peer packages already present in the target project (skip re-adding these). */
  existing: Set<string>;
}

export function resolvePackages(selection: StackSelection): ResolvedPackages {
  const packages: string[] = [];
  const add = (...names: string[]) => {
    for (const name of names) {
      if (!selection.existing.has(name)) packages.push(name);
    }
  };

  if (selection.server) add(...verikit("server"));

  if (selection.ui === "react" || selection.ui === "next") {
    add(
      ...verikit("react"),
      "@tanstack/react-query",
      "@tanstack/react-form",
      "@tanstack/react-table",
      "@base-ui/react",
    );
    if (selection.theme) add(...verikit("theme"));
  } else if (selection.ui === "vue") {
    add(
      ...verikit("vue"),
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
