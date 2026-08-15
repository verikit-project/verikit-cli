import type { Adapter } from "../detect/database.js";
import type { UiFramework } from "../detect/framework.js";

/**
 * Top-level dependencies required by each capability. Kept explicit because
 * generated integrations may import packages directly, which isolated
 * node_modules setups don't expose transitively.
 *
 * Keep in sync with the framework's @verikit/* versions.
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
