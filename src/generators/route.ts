import path from "node:path";
import { writeFileIfAbsent, type WriteOutcome } from "../utils/fs.js";

export interface RouteGenerationResult {
  routeFile: string;
  outcome: WriteOutcome;
}

/** Generates a Next.js App Router catch-all route that forwards every method to the VeriKit request handler. */
export function generateNextRoute(
  appRoot: string,
  serverFile: string,
  dryRun = false,
): RouteGenerationResult {
  const routeDir = path.join(appRoot, "app", "api", "verikit", "[...path]");
  const routeFile = path.join(routeDir, "route.ts");

  let importPath = path
    .relative(routeDir, serverFile)
    .replace(/\.ts$/, "")
    .split(path.sep)
    .join("/");
  if (!importPath.startsWith(".")) importPath = `./${importPath}`;

  const source = `import { verikit } from "${importPath}";

export const GET = verikit;
export const POST = verikit;
export const PATCH = verikit;
export const DELETE = verikit;
`;

  return { routeFile, outcome: writeFileIfAbsent(routeFile, source, dryRun) };
}
