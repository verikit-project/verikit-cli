import assert from "node:assert/strict";
import test from "node:test";
import { detectDatabase } from "../../src/detect/database.js";

test("detectDatabase finds Prisma via @prisma/client", () => {
  assert.deepEqual(
    detectDatabase({ dependencies: { "@prisma/client": "6.0.0" } }),
    {
      prisma: true,
      drizzle: false,
    },
  );
});

test("detectDatabase finds Prisma via the prisma CLI package", () => {
  assert.deepEqual(detectDatabase({ devDependencies: { prisma: "6.0.0" } }), {
    prisma: true,
    drizzle: false,
  });
});

test("detectDatabase finds Drizzle", () => {
  assert.deepEqual(
    detectDatabase({ dependencies: { "drizzle-orm": "0.44.0" } }),
    {
      prisma: false,
      drizzle: true,
    },
  );
});

test("detectDatabase reports neither when absent", () => {
  assert.deepEqual(detectDatabase({}), { prisma: false, drizzle: false });
});
