import assert from "node:assert/strict";
import test from "node:test";
import { resolvePackages } from "../../src/install/capabilities.js";
import type { PackageJson } from "../../src/detect/project.js";

const EMPTY_PKG: PackageJson = {};

test("resolvePackages adds nothing when server is false and there's no UI/adapter", () => {
  const { packages } = resolvePackages({
    server: false,
    ui: null,
    theme: false,
    adapter: null,
    pkg: EMPTY_PKG,
  });
  assert.deepEqual(packages, []);
});

test("resolvePackages adds server-side packages when server is true", () => {
  const { packages } = resolvePackages({
    server: true,
    ui: null,
    theme: false,
    adapter: null,
    pkg: EMPTY_PKG,
  });
  assert.deepEqual(packages, [
    "@verikit/core@latest",
    "@verikit/runtime@latest",
    "@verikit/client@latest",
    "@verikit/server@latest",
  ]);
});

test("resolvePackages adds React packages for ui: 'react'", () => {
  const { packages } = resolvePackages({
    server: false,
    ui: "react",
    theme: false,
    adapter: null,
    pkg: EMPTY_PKG,
  });
  assert.deepEqual(packages, [
    "@verikit/core@latest",
    "@verikit/react@latest",
    "@tanstack/react-query",
    "@tanstack/react-form",
    "@tanstack/react-table",
    "@base-ui/react",
  ]);
});

test("resolvePackages treats ui: 'next' the same as 'react'", () => {
  const { packages } = resolvePackages({
    server: false,
    ui: "next",
    theme: false,
    adapter: null,
    pkg: EMPTY_PKG,
  });
  assert.ok(packages.includes("@verikit/core@latest"));
  assert.ok(packages.includes("@verikit/react@latest"));
});

test("resolvePackages adds the theme package for React when theme is true", () => {
  const { packages } = resolvePackages({
    server: false,
    ui: "react",
    theme: true,
    adapter: null,
    pkg: EMPTY_PKG,
  });
  assert.ok(packages.includes("@verikit/theme@latest"));
});

test("resolvePackages adds Vue packages for ui: 'vue'", () => {
  const { packages } = resolvePackages({
    server: false,
    ui: "vue",
    theme: false,
    adapter: null,
    pkg: EMPTY_PKG,
  });
  assert.deepEqual(packages, [
    "@verikit/core@latest",
    "@verikit/vue@latest",
    "@tanstack/vue-query",
    "@tanstack/vue-form",
    "@tanstack/vue-table",
    "reka-ui",
  ]);
});

test("resolvePackages adds the theme package for Vue when theme is true", () => {
  const { packages } = resolvePackages({
    server: false,
    ui: "vue",
    theme: true,
    adapter: null,
    pkg: EMPTY_PKG,
  });
  assert.ok(packages.includes("@verikit/theme@latest"));
});

test("resolvePackages deduplicates @verikit/core when server and UI are both installed", () => {
  const { packages } = resolvePackages({
    server: true,
    ui: "vue",
    theme: false,
    adapter: null,
    pkg: EMPTY_PKG,
  });
  assert.equal(
    packages.filter((spec) => spec === "@verikit/core@latest").length,
    1,
  );
});

test("resolvePackages adds the Prisma adapter package", () => {
  const { packages } = resolvePackages({
    server: false,
    ui: null,
    theme: false,
    adapter: "prisma",
    pkg: EMPTY_PKG,
  });
  assert.deepEqual(packages, ["@verikit/prisma@latest"]);
});

test("resolvePackages adds the Drizzle adapter package", () => {
  const { packages } = resolvePackages({
    server: false,
    ui: null,
    theme: false,
    adapter: "drizzle",
    pkg: EMPTY_PKG,
  });
  assert.deepEqual(packages, ["@verikit/drizzle@latest"]);
});

test("resolvePackages skips packages the project already declares", () => {
  const pkg: PackageJson = {
    dependencies: {
      "@verikit/react": "0.23.0",
      "@tanstack/react-query": "5.0.0",
    },
  };
  const { packages } = resolvePackages({
    server: true,
    ui: "react",
    theme: false,
    adapter: null,
    pkg,
  });
  assert.ok(!packages.includes("@verikit/react@latest"));
  assert.ok(!packages.includes("@tanstack/react-query"));
  assert.ok(packages.includes("@verikit/core@latest"));
  assert.ok(packages.includes("@verikit/runtime@latest"));
  assert.ok(packages.includes("@verikit/client@latest"));
  assert.ok(packages.includes("@verikit/server@latest"));
  assert.ok(packages.includes("@tanstack/react-form"));
});
