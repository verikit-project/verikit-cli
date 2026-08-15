import path from "node:path";
import type { Adapter } from "../detect/database.js";
import { writeFileIfAbsent, type WriteOutcome } from "../utils/fs.js";

export interface ServerGenerationResult {
  serverFile: string;
  serverOutcome: WriteOutcome;
  exampleFile: string;
  exampleOutcome: WriteOutcome;
}

const EXAMPLE_RESOURCE = `import { boolean, defineResource, text } from "@verikit/core";

export const example = defineResource("example", {
  fields: {
    title: text().required(),
    completed: boolean().default(false),
  },
});
`;

function serverSource(adapter: Adapter): string {
  const adapterNote =
    adapter === "prisma"
      ? `// Wire up @verikit/prisma's createPrismaAdapter() for each resource's storage, then\n// add the resource below.\n`
      : adapter === "drizzle"
        ? `// Wire up @verikit/drizzle's createDrizzleAdapter() for each resource's storage, then\n// add the resource below.\n`
        : `// Give each resource a storage adapter (see @verikit/prisma or @verikit/drizzle), then\n// add it below.\n`;

  return `import { createServer } from "@verikit/server";

${adapterNote}export const verikit = createServer({
  resources: [
    // {
    //   resource: example,
    //   adapter: /* your adapter for "example" */,
    //   permissions: "open",
    // },
  ],
});
`;
}

/** Generates `verikit/server.ts` and a starter `verikit/resources/example.ts` under `srcRoot`. Never overwrites existing files. */
export function generateServer(
  srcRoot: string,
  adapter: Adapter,
  dryRun = false,
): ServerGenerationResult {
  const serverFile = path.join(srcRoot, "verikit", "server.ts");
  const exampleFile = path.join(srcRoot, "verikit", "resources", "example.ts");

  const serverOutcome = writeFileIfAbsent(
    serverFile,
    serverSource(adapter),
    dryRun,
  );
  const exampleOutcome = writeFileIfAbsent(
    exampleFile,
    EXAMPLE_RESOURCE,
    dryRun,
  );

  return { serverFile, serverOutcome, exampleFile, exampleOutcome };
}
