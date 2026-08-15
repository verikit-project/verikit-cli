import assert from "node:assert/strict";
import test from "node:test";
import { withEnv } from "./fixture.js";

test("withEnv sets and restores a previously-unset variable", async () => {
  delete process.env.VERIKIT_CLI_TEST_VAR;

  await withEnv("VERIKIT_CLI_TEST_VAR", "temporary", () => {
    assert.equal(process.env.VERIKIT_CLI_TEST_VAR, "temporary");
  });

  assert.equal(process.env.VERIKIT_CLI_TEST_VAR, undefined);
});

test("withEnv unsets and restores a previously-set variable", async () => {
  process.env.VERIKIT_CLI_TEST_VAR = "original";

  await withEnv("VERIKIT_CLI_TEST_VAR", undefined, () => {
    assert.equal(process.env.VERIKIT_CLI_TEST_VAR, undefined);
  });

  assert.equal(process.env.VERIKIT_CLI_TEST_VAR, "original");
  delete process.env.VERIKIT_CLI_TEST_VAR;
});

test("withEnv restores the variable even if fn throws", async () => {
  process.env.VERIKIT_CLI_TEST_VAR = "original";

  await assert.rejects(
    () =>
      withEnv("VERIKIT_CLI_TEST_VAR", "temporary", () => {
        throw new Error("boom");
      }),
    /boom/,
  );

  assert.equal(process.env.VERIKIT_CLI_TEST_VAR, "original");
  delete process.env.VERIKIT_CLI_TEST_VAR;
});
