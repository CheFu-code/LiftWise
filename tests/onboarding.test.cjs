const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
function load(file, dependencies) {
  const module = { exports: {} };
  const code = ts.transpileModule(
    fs.readFileSync(require.resolve(file), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    require: (name) => dependencies[name],
  });
  return module.exports;
}
const validation = load("../src/lib/validations/onboarding-validation.ts", {
  zod: require("zod"),
});
function setup() {
  const data = new Map();
  return load("../src/constants/onboarding.ts", {
    "@/lib/validations/onboarding-validation": validation,
    "@react-native-async-storage/async-storage": {
      getItem: async (key) => data.get(key) || null,
      setItem: async (key, value) => {
        data.set(key, value);
      },
      removeItem: async (key) => {
        data.delete(key);
      },
    },
  });
}
test("shared gender is reused and only missing app questions are asked", () => {
  const flow = setup();
  assert.equal(
    flow
      .pendingOnboardingSteps({ gender: "female" })
      .map((step) => step.key)
      .join(","),
    "goal,experience",
  );
  assert.equal(
    flow
      .pendingOnboardingSteps({ gender: "non-binary", goal: "maintain" })
      .map((step) => step.key)
      .join(","),
    "experience",
  );
  assert.equal(
    flow.pendingOnboardingSteps({
      gender: "female",
      goal: "maintain",
      experience: "advanced",
    }).length,
    0,
  );
  assert.equal(flow.pendingOnboardingSteps({}).length, 3);
});
test("an account's shared answer takes precedence over a local draft", () => {
  const flow = setup();
  assert.equal(
    flow.mergeOnboardingDraft(
      { gender: "female" },
      { gender: "male", goal: "maintain" },
    ).gender,
    "female",
  );
});
test("onboarding drafts are isolated by user and clear only after saving", async () => {
  const flow = setup();
  await flow.saveOnboardingDraft("alice", { goal: "maintain" });
  await flow.saveOnboardingDraft("bob", { gender: "male" });
  assert.equal((await flow.readOnboardingDraft("alice")).gender, undefined);
  assert.equal((await flow.readOnboardingDraft("bob")).goal, undefined);
  await flow.clearOnboardingDraft("alice");
  assert.equal(Object.keys(await flow.readOnboardingDraft("alice")).length, 0);
  assert.equal((await flow.readOnboardingDraft("bob")).gender, "male");
});
