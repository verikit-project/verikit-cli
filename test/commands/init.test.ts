import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { InitAbort, runInit } from "../../src/commands/init.js";
import {
  CANCEL,
  makeFakeInstall,
  makeFakePrompts,
} from "../support/fake-prompts.js";
import {
  PACKAGE_JSON,
  makeFixture,
  removeFixture,
  withCwd,
} from "../support/fixture.js";

const OK = { ok: true, output: "" };

test("runInit throws InitAbort(1) when there's no package.json", async () => {
  const dir = makeFixture();
  try {
    const { prompts } = makeFakePrompts([]);
    const { installPackages } = makeFakeInstall(OK);
    await assert.rejects(
      () => withCwd(dir, () => runInit({}, { prompts, installPackages })),
      (err: unknown) => err instanceof InitAbort && err.code === 1,
    );
  } finally {
    removeFixture(dir);
  }
});

test("runInit: full happy path with Next.js + Prisma detected, install succeeds", async () => {
  const dir = makeFixture({
    "package.json": PACKAGE_JSON({
      next: "15.0.0",
      react: "19.0.0",
      "@prisma/client": "6.0.0",
    }),
    "package-lock.json": "{}",
    "src/app/globals.css": "body {}",
  });
  try {
    // Prompts in order: use-Prisma confirm, install-theme confirm, proceed confirm.
    const { prompts, events } = makeFakePrompts([true, true, true]);
    const { installPackages, calls } = makeFakeInstall(OK);

    await withCwd(dir, () => runInit({}, { prompts, installPackages }));

    assert.ok(events.some((e) => e.includes("Detected Next.js")));
    assert.ok(events.some((e) => e.includes("Detected Prisma")));
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.manager, "npm");
    assert.ok(calls[0]?.packages.includes("@verikit/prisma@latest"));
    assert.ok(calls[0]?.packages.includes("@verikit/theme@latest"));
    assert.ok(events.some((e) => e === "spinner:stop:Installed dependencies"));

    assert.equal(existsSync(path.join(dir, "src/verikit/server.ts")), true);
    assert.equal(
      existsSync(path.join(dir, "src/app/api/verikit/[...path]/route.ts")),
      true,
    );
    assert.equal(
      readFileSync(path.join(dir, "src/app/globals.css"), "utf8").startsWith(
        '@import "@verikit/theme/globals.css";',
      ),
      true,
    );
    assert.ok(
      events.some((e) => e.startsWith("outro:") && e.includes("is ready")),
    );
  } finally {
    removeFixture(dir);
  }
});

test("runInit: install failure still generates files and warns", async () => {
  const dir = makeFixture({
    "package.json": PACKAGE_JSON({ react: "19.0.0" }),
  });
  try {
    // ui detected as react (no select). adapter: neither detected -> select "none". theme confirm true. proceed true.
    const { prompts, events } = makeFakePrompts(["none", true, true]);
    const { installPackages } = makeFakeInstall({
      ok: false,
      output: "network error",
    });

    await withCwd(dir, () => runInit({}, { prompts, installPackages }));

    assert.ok(
      events.some((e) => e === "spinner:stop:Failed to install dependencies"),
    );
    assert.ok(events.some((e) => e.includes("network error")));
    assert.ok(
      events.some((e) =>
        e.includes("Continuing to generate integration files"),
      ),
    );
    assert.equal(existsSync(path.join(dir, "verikit/server.ts")), true);
  } finally {
    removeFixture(dir);
  }
});

test("runInit --dry-run reports the plan and writes nothing", async () => {
  const dir = makeFixture({
    "package.json": PACKAGE_JSON({ react: "19.0.0" }),
  });
  try {
    const { prompts, events } = makeFakePrompts(["none", true, true]);
    const { installPackages, calls } = makeFakeInstall(OK);

    await withCwd(dir, () =>
      runInit({ dryRun: true }, { prompts, installPackages }),
    );

    assert.equal(calls.length, 0);
    assert.ok(events.some((e) => e.startsWith("log:step:Would install")));
    assert.ok(events.some((e) => e.includes("Would create verikit/server.ts")));
    assert.equal(existsSync(path.join(dir, "verikit/server.ts")), false);
    assert.ok(
      events.some(
        (e) => e.startsWith("outro:") && e.includes("dry run complete"),
      ),
    );
  } finally {
    removeFixture(dir);
  }
});

test("runInit --skip-install skips installing but still writes files", async () => {
  const dir = makeFixture({
    "package.json": PACKAGE_JSON({ react: "19.0.0" }),
  });
  try {
    const { prompts, events } = makeFakePrompts(["none", true, true]);
    const { installPackages, calls } = makeFakeInstall(OK);

    await withCwd(dir, () =>
      runInit({ skipInstall: true }, { prompts, installPackages }),
    );

    assert.equal(calls.length, 0);
    assert.ok(events.some((e) => e.startsWith("log:step:Skipped install")));
    assert.equal(existsSync(path.join(dir, "verikit/server.ts")), true);
  } finally {
    removeFixture(dir);
  }
});

test("runInit prompts for a UI framework when none is detected, and skips the theme question when 'none' is chosen", async () => {
  const dir = makeFixture({ "package.json": PACKAGE_JSON() });
  try {
    // select ui -> "none"; adapter neither detected -> select "none"; proceed -> true.
    const { prompts, events } = makeFakePrompts(["none", "none", true]);
    const { installPackages } = makeFakeInstall(OK);

    await withCwd(dir, () => runInit({}, { prompts, installPackages }));

    assert.ok(
      events.some((e) => e.includes("Which UI framework are you using?")),
    );
    assert.ok(
      !events.some((e) => e.includes("Install VeriKit's default theme?")),
    );
  } finally {
    removeFixture(dir);
  }
});

test("runInit lets an undetected UI framework be picked as React", async () => {
  const dir = makeFixture({ "package.json": PACKAGE_JSON() });
  try {
    const { prompts, events } = makeFakePrompts(["react", "none", true, true]);
    const { installPackages, calls } = makeFakeInstall(OK);

    await withCwd(dir, () => runInit({}, { prompts, installPackages }));

    assert.ok(calls[0]?.packages.includes("@verikit/react@latest"));
    assert.ok(
      events.some((e) => e.includes("Install VeriKit's default theme?")),
    );
  } finally {
    removeFixture(dir);
  }
});

test("runInit lets an undetected UI framework be picked as Vue", async () => {
  const dir = makeFixture({ "package.json": PACKAGE_JSON() });
  try {
    const { prompts } = makeFakePrompts(["vue", "none", true, true]);
    const { installPackages, calls } = makeFakeInstall(OK);

    await withCwd(dir, () => runInit({}, { prompts, installPackages }));

    assert.ok(calls[0]?.packages.includes("@verikit/vue@latest"));
  } finally {
    removeFixture(dir);
  }
});

test("runInit aborts when the UI framework prompt is cancelled", async () => {
  const dir = makeFixture({ "package.json": PACKAGE_JSON() });
  try {
    const { prompts, events } = makeFakePrompts([CANCEL]);
    const { installPackages } = makeFakeInstall(OK);

    await assert.rejects(
      () => withCwd(dir, () => runInit({}, { prompts, installPackages })),
      (err: unknown) => err instanceof InitAbort && err.code === 0,
    );
    assert.ok(events.some((e) => e.startsWith("cancel:")));
  } finally {
    removeFixture(dir);
  }
});

test("runInit: both Prisma and Drizzle detected asks which adapter to use", async () => {
  const dir = makeFixture({
    "package.json": PACKAGE_JSON({
      react: "19.0.0",
      "@prisma/client": "6.0.0",
      "drizzle-orm": "0.44.0",
    }),
  });
  try {
    const { prompts, events } = makeFakePrompts(["drizzle", true, true]);
    const { installPackages, calls } = makeFakeInstall(OK);

    await withCwd(dir, () => runInit({}, { prompts, installPackages }));

    assert.ok(
      events.some((e) => e.includes("Both Prisma and Drizzle were detected")),
    );
    assert.ok(calls[0]?.packages.includes("@verikit/drizzle@latest"));
    assert.ok(!calls[0]?.packages.includes("@verikit/prisma@latest"));
  } finally {
    removeFixture(dir);
  }
});

test("runInit: choosing between Prisma and Drizzle can be cancelled", async () => {
  const dir = makeFixture({
    "package.json": PACKAGE_JSON({
      "@prisma/client": "6.0.0",
      "drizzle-orm": "0.44.0",
    }),
  });
  try {
    const { prompts } = makeFakePrompts([CANCEL]);
    const { installPackages } = makeFakeInstall(OK);
    await assert.rejects(
      () => withCwd(dir, () => runInit({}, { prompts, installPackages })),
      InitAbort,
    );
  } finally {
    removeFixture(dir);
  }
});

test("runInit: Prisma-only detected can be declined", async () => {
  const dir = makeFixture({
    "package.json": PACKAGE_JSON({
      react: "19.0.0",
      "@prisma/client": "6.0.0",
    }),
  });
  try {
    const { prompts } = makeFakePrompts([false, true, true]);
    const { installPackages, calls } = makeFakeInstall(OK);

    await withCwd(dir, () => runInit({}, { prompts, installPackages }));

    assert.ok(!calls[0]?.packages.includes("@verikit/prisma@latest"));
  } finally {
    removeFixture(dir);
  }
});

test("runInit: Prisma-only prompt can be cancelled", async () => {
  const dir = makeFixture({
    "package.json": PACKAGE_JSON({ "@prisma/client": "6.0.0" }),
  });
  try {
    const { prompts } = makeFakePrompts([CANCEL]);
    const { installPackages } = makeFakeInstall(OK);
    await assert.rejects(
      () => withCwd(dir, () => runInit({}, { prompts, installPackages })),
      InitAbort,
    );
  } finally {
    removeFixture(dir);
  }
});

test("runInit: Drizzle-only detected can be accepted", async () => {
  const dir = makeFixture({
    "package.json": PACKAGE_JSON({ react: "19.0.0", "drizzle-orm": "0.44.0" }),
  });
  try {
    const { prompts } = makeFakePrompts([true, true, true]);
    const { installPackages, calls } = makeFakeInstall(OK);

    await withCwd(dir, () => runInit({}, { prompts, installPackages }));

    assert.ok(calls[0]?.packages.includes("@verikit/drizzle@latest"));
  } finally {
    removeFixture(dir);
  }
});

test("runInit: Drizzle-only prompt can be cancelled", async () => {
  const dir = makeFixture({
    "package.json": PACKAGE_JSON({ "drizzle-orm": "0.44.0" }),
  });
  try {
    const { prompts } = makeFakePrompts([CANCEL]);
    const { installPackages } = makeFakeInstall(OK);
    await assert.rejects(
      () => withCwd(dir, () => runInit({}, { prompts, installPackages })),
      InitAbort,
    );
  } finally {
    removeFixture(dir);
  }
});

test("runInit: no database detected offers Prisma as an adapter choice", async () => {
  const dir = makeFixture({
    "package.json": PACKAGE_JSON({ react: "19.0.0" }),
  });
  try {
    const { prompts, events } = makeFakePrompts(["prisma", true, true]);
    const { installPackages, calls } = makeFakeInstall(OK);

    await withCwd(dir, () => runInit({}, { prompts, installPackages }));

    assert.ok(events.some((e) => e.includes("Use a storage adapter?")));
    assert.ok(calls[0]?.packages.includes("@verikit/prisma@latest"));
  } finally {
    removeFixture(dir);
  }
});

test("runInit: no database detected, adapter prompt cancelled", async () => {
  const dir = makeFixture({
    "package.json": PACKAGE_JSON({ react: "19.0.0" }),
  });
  try {
    const { prompts } = makeFakePrompts([CANCEL]);
    const { installPackages } = makeFakeInstall(OK);
    await assert.rejects(
      () => withCwd(dir, () => runInit({}, { prompts, installPackages })),
      InitAbort,
    );
  } finally {
    removeFixture(dir);
  }
});

test("runInit: theme prompt can be declined", async () => {
  const dir = makeFixture({
    "package.json": PACKAGE_JSON({ react: "19.0.0" }),
  });
  try {
    const { prompts } = makeFakePrompts(["none", false, true]);
    const { installPackages, calls } = makeFakeInstall(OK);

    await withCwd(dir, () => runInit({}, { prompts, installPackages }));

    assert.ok(!calls[0]?.packages.includes("@verikit/theme@latest"));
  } finally {
    removeFixture(dir);
  }
});

test("runInit: theme prompt can be cancelled", async () => {
  const dir = makeFixture({
    "package.json": PACKAGE_JSON({ react: "19.0.0" }),
  });
  try {
    const { prompts } = makeFakePrompts(["none", CANCEL]);
    const { installPackages } = makeFakeInstall(OK);
    await assert.rejects(
      () => withCwd(dir, () => runInit({}, { prompts, installPackages })),
      InitAbort,
    );
  } finally {
    removeFixture(dir);
  }
});

test("runInit: declining the final confirmation aborts without installing", async () => {
  const dir = makeFixture({
    "package.json": PACKAGE_JSON({ react: "19.0.0" }),
  });
  try {
    const { prompts } = makeFakePrompts(["none", true, false]);
    const { installPackages, calls } = makeFakeInstall(OK);

    await assert.rejects(
      () => withCwd(dir, () => runInit({}, { prompts, installPackages })),
      (err: unknown) => err instanceof InitAbort && err.code === 0,
    );
    assert.equal(calls.length, 0);
  } finally {
    removeFixture(dir);
  }
});

test("runInit: cancelling the final confirmation aborts", async () => {
  const dir = makeFixture({
    "package.json": PACKAGE_JSON({ react: "19.0.0" }),
  });
  try {
    const { prompts } = makeFakePrompts(["none", true, CANCEL]);
    const { installPackages } = makeFakeInstall(OK);
    await assert.rejects(
      () => withCwd(dir, () => runInit({}, { prompts, installPackages })),
      InitAbort,
    );
  } finally {
    removeFixture(dir);
  }
});

test("runInit: Next.js with the Pages Router warns instead of generating a route", async () => {
  const dir = makeFixture({
    "package.json": PACKAGE_JSON({ next: "15.0.0", react: "19.0.0" }),
    "pages/index.tsx": "",
  });
  try {
    const { prompts, events } = makeFakePrompts(["none", false, true]);
    const { installPackages } = makeFakeInstall(OK);

    await withCwd(dir, () => runInit({}, { prompts, installPackages }));

    assert.ok(events.some((e) => e.includes("Pages Router detected")));
    assert.equal(existsSync(path.join(dir, "app")), false);
  } finally {
    removeFixture(dir);
  }
});

test("runInit warns when no stylesheet is found for the theme import", async () => {
  const dir = makeFixture({
    "package.json": PACKAGE_JSON({ react: "19.0.0" }),
  });
  try {
    const { prompts, events } = makeFakePrompts(["none", true, true]);
    const { installPackages } = makeFakeInstall(OK);

    await withCwd(dir, () => runInit({}, { prompts, installPackages }));

    assert.ok(
      events.some((e) => e.includes("Couldn't find a global stylesheet")),
    );
  } finally {
    removeFixture(dir);
  }
});

test("runInit is idempotent: re-running reports files/theme import already exist", async () => {
  const dir = makeFixture({
    "package.json": PACKAGE_JSON({ next: "15.0.0", react: "19.0.0" }),
    "src/app/globals.css": "body {}",
  });
  try {
    const first = makeFakePrompts(["none", true, true]);
    await withCwd(dir, () =>
      runInit(
        {},
        {
          prompts: first.prompts,
          installPackages: makeFakeInstall(OK).installPackages,
        },
      ),
    );

    const second = makeFakePrompts(["none", true, true]);
    await withCwd(dir, () =>
      runInit(
        {},
        {
          prompts: second.prompts,
          installPackages: makeFakeInstall(OK).installPackages,
        },
      ),
    );

    assert.ok(
      second.events.some((e) => e.includes("verikit/server.ts already exists")),
    );
    assert.ok(
      second.events.some((e) => e.includes("API route already exists")),
    );
    assert.ok(
      second.events.some((e) => e.includes("theme import already exists")),
    );
  } finally {
    removeFixture(dir);
  }
});

test("runInit packagesOnly: installs packages but generates no files", async () => {
  const dir = makeFixture({
    "package.json": PACKAGE_JSON({ next: "15.0.0", react: "19.0.0" }),
    "src/app/globals.css": "body {}",
  });
  try {
    const { prompts, events } = makeFakePrompts(["none", true, true]);
    const { installPackages, calls } = makeFakeInstall(OK);

    await withCwd(dir, () =>
      runInit({ packagesOnly: true }, { prompts, installPackages }),
    );

    assert.ok(events.some((e) => e.includes("Install these packages?")));
    assert.equal(calls.length, 1);
    assert.ok(calls[0]?.packages.includes("@verikit/theme@latest"));

    assert.equal(existsSync(path.join(dir, "src/verikit/server.ts")), false);
    assert.equal(
      existsSync(path.join(dir, "src/app/api/verikit/[...path]/route.ts")),
      false,
    );
    assert.equal(
      readFileSync(path.join(dir, "src/app/globals.css"), "utf8"),
      "body {}",
    );

    assert.ok(
      events.some(
        (e) => e.startsWith("outro:") && e.includes("packages installed"),
      ),
    );
    assert.ok(!events.some((e) => e.includes("is ready")));
  } finally {
    removeFixture(dir);
  }
});

test("runInit packagesOnly + dryRun: installs nothing and reports a packages-only dry-run outro", async () => {
  const dir = makeFixture({
    "package.json": PACKAGE_JSON({ react: "19.0.0" }),
  });
  try {
    const { prompts, events } = makeFakePrompts(["none", true, true]);
    const { installPackages, calls } = makeFakeInstall(OK);

    await withCwd(dir, () =>
      runInit(
        { packagesOnly: true, dryRun: true },
        { prompts, installPackages },
      ),
    );

    assert.equal(calls.length, 0);
    assert.equal(existsSync(path.join(dir, "verikit/server.ts")), false);
    assert.ok(
      events.some(
        (e) =>
          e.startsWith("outro:") &&
          e.includes("dry run complete  nothing was installed."),
      ),
    );
  } finally {
    removeFixture(dir);
  }
});

test("runInit packagesOnly: install failure warns without mentioning file generation", async () => {
  const dir = makeFixture({
    "package.json": PACKAGE_JSON({ react: "19.0.0" }),
  });
  try {
    const { prompts, events } = makeFakePrompts(["none", true, true]);
    const { installPackages } = makeFakeInstall({
      ok: false,
      output: "network error",
    });

    await withCwd(dir, () =>
      runInit({ packagesOnly: true }, { prompts, installPackages }),
    );

    assert.ok(
      events.some((e) => e === "log:warn:Install manually to finish setup."),
    );
    assert.ok(
      !events.some((e) =>
        e.includes("Continuing to generate integration files"),
      ),
    );
    assert.equal(existsSync(path.join(dir, "verikit/server.ts")), false);
  } finally {
    removeFixture(dir);
  }
});
