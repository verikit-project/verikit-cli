import * as clack from "@clack/prompts";
import path from "node:path";
import { detectDatabase, type Adapter } from "../detect/database.js";
import { detectFramework } from "../detect/framework.js";
import { detectPackageManager, type PackageManager } from "../detect/package-manager.js";
import { detectSrcRoot, hasDependency, readPackageJson } from "../detect/project.js";
import { generateServer } from "../generators/server.js";
import { generateNextRoute } from "../generators/route.js";
import { applyTheme, THEME_IMPORT } from "../generators/theme.js";
import { resolvePackages } from "../install/capabilities.js";
import { installPackages } from "../install/dependencies.js";
import { logo } from "../utils/banner.js";

export interface InitOptions {
  skipInstall?: boolean;
  dryRun?: boolean;
}

const DEV_COMMAND: Record<PackageManager, string> = {
  pnpm: "pnpm dev",
  npm: "npm run dev",
  yarn: "yarn dev",
  bun: "bun dev",
};

function fail(message: string): never {
  clack.log.error(message);
  clack.outro("Stopped.");
  process.exit(1);
}

export async function runInit(options: InitOptions): Promise<void> {
  const cwd = process.cwd();
  const dryRun = Boolean(options.dryRun);

  clack.intro(logo(dryRun ? "(dry run)" : undefined));

  const pkg = readPackageJson(cwd);
  if (!pkg) {
    fail("No package.json found here — run `verikit init` inside an existing project.");
  }

  const packageManager = detectPackageManager(cwd);
  const framework = detectFramework(cwd, pkg);
  const database = detectDatabase(pkg);

  clack.log.success(`Detected ${packageManager}`);
  if (framework.ui === "next") clack.log.success("Detected Next.js");
  if (framework.ui === "react" || framework.ui === "next") clack.log.success("Detected React");
  if (framework.ui === "vue") clack.log.success("Detected Vue");
  if (framework.typescript) clack.log.success("Detected TypeScript");
  if (database.prisma) clack.log.success("Detected Prisma");
  if (database.drizzle) clack.log.success("Detected Drizzle");

  let ui = framework.ui;
  if (!ui) {
    clack.log.warn("Couldn't detect React or Vue.");
    const choice = await clack.select({
      message: "Which UI framework are you using?",
      options: [
        { value: "react", label: "React" },
        { value: "vue", label: "Vue" },
        { value: "none", label: "None — server only" },
      ],
    });
    if (clack.isCancel(choice)) return cancelled();
    ui = choice === "none" ? null : (choice as "react" | "vue");
  }

  let adapter: Adapter = null;
  if (database.prisma && database.drizzle) {
    const choice = await clack.select({
      message: "Both Prisma and Drizzle were detected. Use as your VeriKit storage adapter?",
      options: [
        { value: "prisma", label: "Prisma" },
        { value: "drizzle", label: "Drizzle" },
      ],
    });
    if (clack.isCancel(choice)) return cancelled();
    adapter = choice as Adapter;
  } else if (database.prisma) {
    const confirmed = await clack.confirm({ message: "Use Prisma as your VeriKit storage adapter?" });
    if (clack.isCancel(confirmed)) return cancelled();
    adapter = confirmed ? "prisma" : null;
  } else if (database.drizzle) {
    const confirmed = await clack.confirm({ message: "Use Drizzle as your VeriKit storage adapter?" });
    if (clack.isCancel(confirmed)) return cancelled();
    adapter = confirmed ? "drizzle" : null;
  } else {
    const choice = await clack.select({
      message: "Use a storage adapter?",
      options: [
        { value: "prisma", label: "Prisma" },
        { value: "drizzle", label: "Drizzle" },
        { value: "none", label: "Skip for now" },
      ],
    });
    if (clack.isCancel(choice)) return cancelled();
    adapter = choice === "none" ? null : (choice as Adapter);
  }

  let theme = false;
  if (ui) {
    const confirmed = await clack.confirm({ message: "Install VeriKit's default theme?" });
    if (clack.isCancel(confirmed)) return cancelled();
    theme = confirmed;
  }

  const proceed = await clack.confirm({
    message: dryRun ? "Preview this configuration?" : "Set up VeriKit with this configuration?",
  });
  if (clack.isCancel(proceed) || !proceed) return cancelled();

  const existing = new Set(
    ["@prisma/client", "drizzle-orm", "react", "react-dom", "vue"].filter((name) =>
      hasDependency(pkg, name),
    ),
  );
  const { packages } = resolvePackages({ server: true, ui, theme, adapter, existing });

  if (packages.length > 0) {
    if (dryRun) {
      clack.log.step(`Would install ${packages.length} package${packages.length === 1 ? "" : "s"}: ${packages.join(", ")}`);
    } else if (options.skipInstall) {
      clack.log.step(`Skipped install (--skip-install): ${packages.join(", ")}`);
    } else {
      const spinner = clack.spinner();
      spinner.start(`Installing ${packages.length} package${packages.length === 1 ? "" : "s"}`);
      const result = await installPackages(packageManager, packages, cwd);
      if (result.ok) {
        spinner.stop("Installed dependencies");
      } else {
        spinner.stop("Failed to install dependencies");
        clack.log.error(result.output.trim().slice(-2000));
        clack.log.warn("Continuing to generate integration files — install manually to finish setup.");
      }
    }
  }

  const srcRoot = detectSrcRoot(cwd);
  const server = generateServer(srcRoot, adapter, dryRun);
  report(server.serverOutcome, `verikit/server.ts`, relative(cwd, server.serverFile), dryRun);
  report(server.exampleOutcome, `example resource`, relative(cwd, server.exampleFile), dryRun);

  if (framework.ui === "next") {
    if (framework.appDir) {
      const route = generateNextRoute(framework.appDir, server.serverFile, dryRun);
      report(route.outcome, "API route", relative(cwd, route.routeFile), dryRun);
    } else {
      clack.log.warn(
        "Pages Router detected — VeriKit CLI only wires up the App Router automatically. " +
          "Mount `verikit` from `verikit/server.ts` as a catch-all route handler manually.",
      );
    }
  }

  if (theme) {
    const result = applyTheme(cwd, dryRun);
    if (result.status === "not-found") {
      clack.log.warn(
        `Couldn't find a global stylesheet to configure. Add this import to your app's global CSS:\n  ${THEME_IMPORT}`,
      );
    } else {
      report(
        result.status === "inserted" ? "created" : "exists",
        "theme import",
        relative(cwd, result.file),
        dryRun,
      );
    }
  }

  clack.outro(
    dryRun
      ? `${logo()} dry run complete — nothing was installed or written.`
      : `${logo()} is ready.\n\nRun:\n  ${DEV_COMMAND[packageManager]}\n\nDocs:\n  verikit.dev/getting-started`,
  );
}

function report(outcome: "created" | "exists", label: string, file: string, dryRun: boolean): void {
  if (outcome === "created") {
    clack.log.success(`${dryRun ? "Would create" : "Created"} ${label} (${file})`);
  } else {
    clack.log.step(`${label} already exists, skipping (${file})`);
  }
}

function relative(cwd: string, file: string): string {
  return path.relative(cwd, file);
}

function cancelled(): void {
  clack.cancel("Cancelled.");
  process.exit(0);
}
