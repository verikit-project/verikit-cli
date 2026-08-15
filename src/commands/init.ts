import * as clack from "@clack/prompts";
import path from "node:path";
import { detectDatabase, type Adapter } from "../detect/database.js";
import { detectFramework } from "../detect/framework.js";
import {
  detectPackageManager,
  type PackageManager,
} from "../detect/package-manager.js";
import { detectSrcRoot, readPackageJson } from "../detect/project.js";
import { generateServer } from "../generators/server.js";
import { generateNextRoute } from "../generators/route.js";
import { applyTheme, THEME_IMPORT } from "../generators/theme.js";
import { resolvePackages } from "../install/capabilities.js";
import {
  installPackages,
  type InstallPackages,
} from "../install/dependencies.js";
import { logo } from "../utils/banner.js";

export interface InitOptions {
  skipInstall?: boolean;
  dryRun?: boolean;
  /** Install the resolved packages but skip generating server.ts/route/theme files. */
  packagesOnly?: boolean;
}

export interface SelectOption {
  value: string;
  label: string;
}

/** The subset of `@clack/prompts` the init flow depends on, kept narrow so it can be faked in tests. */
export interface Prompts {
  intro(title: string): void;
  outro(message: string): void;
  log: {
    success(message: string): void;
    warn(message: string): void;
    error(message: string): void;
    step(message: string): void;
  };
  select(opts: {
    message: string;
    options: SelectOption[];
  }): Promise<string | symbol>;
  confirm(opts: { message: string }): Promise<boolean | symbol>;
  spinner(): { start(message: string): void; stop(message: string): void };
  isCancel(value: unknown): value is symbol;
  cancel(message: string): void;
}

/* node:coverage disable */
// Thin passthrough to @clack/prompts' real terminal I/O  exercising select/confirm here would
// block on stdin, so this whole adapter is excluded from coverage in favor of the Prompts fake
// used throughout the test suite.
export const realPrompts: Prompts = {
  intro: (title) => clack.intro(title),
  outro: (message) => clack.outro(message),
  log: {
    success: (message) => clack.log.success(message),
    warn: (message) => clack.log.warn(message),
    error: (message) => clack.log.error(message),
    step: (message) => clack.log.step(message),
  },
  select: (opts) => clack.select(opts),
  confirm: (opts) => clack.confirm(opts),
  spinner: () => clack.spinner(),
  isCancel: (value): value is symbol => clack.isCancel(value),
  cancel: (message) => clack.cancel(message),
};
/* node:coverage enable */

export interface InitDeps {
  prompts: Prompts;
  installPackages: InstallPackages;
}

const defaultDeps: InitDeps = { prompts: realPrompts, installPackages };

/** Thrown to unwind out of `runInit` when the flow stops early; the CLI entrypoint maps `code` to `process.exitCode`. */
export class InitAbort extends Error {
  constructor(public readonly code: number) {
    super(`init aborted with code ${code}`);
    this.name = "InitAbort";
  }
}

const DEV_COMMAND: Record<PackageManager, string> = {
  pnpm: "pnpm dev",
  npm: "npm run dev",
  yarn: "yarn dev",
  bun: "bun dev",
};

export async function runInit(
  options: InitOptions,
  deps: InitDeps = defaultDeps,
): Promise<void> {
  const { prompts, installPackages: install } = deps;
  const cwd = process.cwd();
  const dryRun = Boolean(options.dryRun);

  prompts.intro(logo(dryRun ? "(dry run)" : undefined));

  const pkg = readPackageJson(cwd);
  if (!pkg) {
    prompts.log.error(
      "No package.json found here  run `verikit init` inside an existing project.",
    );
    prompts.outro("Stopped.");
    throw new InitAbort(1);
  }

  const packageManager = detectPackageManager(cwd);
  const framework = detectFramework(cwd, pkg);
  const database = detectDatabase(pkg);

  prompts.log.success(`Detected ${packageManager}`);
  if (framework.ui === "next") prompts.log.success("Detected Next.js");
  if (framework.ui === "react" || framework.ui === "next")
    prompts.log.success("Detected React");
  if (framework.ui === "vue") prompts.log.success("Detected Vue");
  if (framework.typescript) prompts.log.success("Detected TypeScript");
  if (database.prisma) prompts.log.success("Detected Prisma");
  if (database.drizzle) prompts.log.success("Detected Drizzle");

  let ui = framework.ui;
  if (!ui) {
    prompts.log.warn("Couldn't detect React or Vue.");
    const choice = await prompts.select({
      message: "Which UI framework are you using?",
      options: [
        { value: "react", label: "React" },
        { value: "vue", label: "Vue" },
        { value: "none", label: "None  server only" },
      ],
    });
    if (prompts.isCancel(choice)) return cancelled(prompts);
    ui = choice === "none" ? null : (choice as "react" | "vue");
  }

  let adapter: Adapter;
  if (database.prisma && database.drizzle) {
    const choice = await prompts.select({
      message:
        "Both Prisma and Drizzle were detected. Use as your VeriKit storage adapter?",
      options: [
        { value: "prisma", label: "Prisma" },
        { value: "drizzle", label: "Drizzle" },
      ],
    });
    if (prompts.isCancel(choice)) return cancelled(prompts);
    adapter = choice as Adapter;
  } else if (database.prisma) {
    const confirmed = await prompts.confirm({
      message: "Use Prisma as your VeriKit storage adapter?",
    });
    if (prompts.isCancel(confirmed)) return cancelled(prompts);
    adapter = confirmed ? "prisma" : null;
  } else if (database.drizzle) {
    const confirmed = await prompts.confirm({
      message: "Use Drizzle as your VeriKit storage adapter?",
    });
    if (prompts.isCancel(confirmed)) return cancelled(prompts);
    adapter = confirmed ? "drizzle" : null;
  } else {
    const choice = await prompts.select({
      message: "Use a storage adapter?",
      options: [
        { value: "prisma", label: "Prisma" },
        { value: "drizzle", label: "Drizzle" },
        { value: "none", label: "Skip for now" },
      ],
    });
    if (prompts.isCancel(choice)) return cancelled(prompts);
    adapter = choice === "none" ? null : (choice as Adapter);
  }

  let theme = false;
  if (ui) {
    const confirmed = await prompts.confirm({
      message: "Install VeriKit's default theme?",
    });
    if (prompts.isCancel(confirmed)) return cancelled(prompts);
    theme = confirmed;
  }

  const proceed = await prompts.confirm({
    message: dryRun
      ? "Preview this configuration?"
      : options.packagesOnly
        ? "Install these packages?"
        : "Set up VeriKit with this configuration?",
  });
  if (prompts.isCancel(proceed) || !proceed) return cancelled(prompts);

  // Always non-empty: `server: true` above guarantees at least `@verikit/server` is included.
  const { packages } = resolvePackages({
    server: true,
    ui,
    theme,
    adapter,
    pkg,
  });

  if (dryRun) {
    prompts.log.step(
      `Would install ${packages.length} package${packages.length === 1 ? "" : "s"}: ${packages.join(", ")}`,
    );
  } else if (options.skipInstall) {
    prompts.log.step(
      `Skipped install (--skip-install): ${packages.join(", ")}`,
    );
  } else {
    const spinner = prompts.spinner();
    spinner.start(
      `Installing ${packages.length} package${packages.length === 1 ? "" : "s"}`,
    );
    const result = await install(packageManager, packages, cwd);
    if (result.ok) {
      spinner.stop("Installed dependencies");
    } else {
      spinner.stop("Failed to install dependencies");
      prompts.log.error(result.output.trim().slice(-2000));
      prompts.log.warn(
        options.packagesOnly
          ? "Install manually to finish setup."
          : "Continuing to generate integration files  install manually to finish setup.",
      );
    }
  }

  if (!options.packagesOnly) {
    const srcRoot = detectSrcRoot(cwd);
    const server = generateServer(srcRoot, adapter, dryRun);
    report(
      prompts,
      server.serverOutcome,
      `verikit/server.ts`,
      relative(cwd, server.serverFile),
      dryRun,
    );
    report(
      prompts,
      server.exampleOutcome,
      `example resource`,
      relative(cwd, server.exampleFile),
      dryRun,
    );

    if (framework.ui === "next") {
      if (framework.appDir) {
        const route = generateNextRoute(
          framework.appDir,
          server.serverFile,
          dryRun,
        );
        report(
          prompts,
          route.outcome,
          "API route",
          relative(cwd, route.routeFile),
          dryRun,
        );
      } else {
        prompts.log.warn(
          "Pages Router detected VeriKit CLI only wires up the App Router automatically. " +
            "Mount `verikit` from `verikit/server.ts` as a catch-all route handler manually.",
        );
      }
    }

    if (theme) {
      const result = applyTheme(cwd, dryRun);
      if (result.status === "not-found") {
        prompts.log.warn(
          `Couldn't find a global stylesheet to configure. Add this import to your app's global CSS:\n  ${THEME_IMPORT}`,
        );
      } else {
        report(
          prompts,
          result.status === "inserted" ? "created" : "exists",
          "theme import",
          relative(cwd, result.file),
          dryRun,
        );
      }
    }
  }

  prompts.outro(
    outroMessage({
      dryRun,
      packagesOnly: Boolean(options.packagesOnly),
      packageManager,
    }),
  );
}

function outroMessage(opts: {
  dryRun: boolean;
  packagesOnly: boolean;
  packageManager: PackageManager;
}): string {
  if (opts.dryRun) {
    return opts.packagesOnly
      ? `${logo()} dry run complete  nothing was installed.`
      : `${logo()} dry run complete  nothing was installed or written.`;
  }
  if (opts.packagesOnly) {
    return `${logo()} packages installed.`;
  }
  return `${logo()} is ready.\n\nRun:\n  ${DEV_COMMAND[opts.packageManager]}\n\nDocs:\n  verikit.dev/getting-started`;
}

function report(
  prompts: Prompts,
  outcome: "created" | "exists",
  label: string,
  file: string,
  dryRun: boolean,
): void {
  if (outcome === "created") {
    prompts.log.success(
      `${dryRun ? "Would create" : "Created"} ${label} (${file})`,
    );
  } else {
    prompts.log.step(`${label} already exists, skipping (${file})`);
  }
}

function relative(cwd: string, file: string): string {
  return path.relative(cwd, file);
}

function cancelled(prompts: Prompts): never {
  prompts.cancel("Cancelled.");
  throw new InitAbort(0);
}
