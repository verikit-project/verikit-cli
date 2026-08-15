import assert from "node:assert/strict";
import test from "node:test";
import { logo } from "../../src/utils/banner.js";

// eslint-disable-next-line no-control-regex
const ANSI = /\x1b\[[0-9;]*m/g;
const plain = (s: string): string => s.replace(ANSI, "");

test("logo renders the VeriKit wordmark without a suffix", () => {
  assert.equal(plain(logo()), "VeriKit");
});

test("logo appends a dimmed suffix when given one", () => {
  assert.equal(plain(logo("(dry run)")), "VeriKit (dry run)");
});
