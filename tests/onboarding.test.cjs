const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
function load(file, dependencies, globals = {}) {
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
    ...globals,
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
    "goal,experience,age-range,training-location",
  );
  assert.equal(
    flow
      .pendingOnboardingSteps({ gender: "non-binary", goal: "maintain" })
      .map((step) => step.key)
      .join(","),
    "experience,age-range,training-location",
  );
  assert.equal(
    flow.pendingOnboardingSteps({
      gender: "female",
      goal: "maintain",
      experience: "advanced",
      ageRange: "25-34",
      trainingLocation: "gym",
    }).length,
    0,
  );
  assert.equal(flow.pendingOnboardingSteps({}).length, 5);
});
test("existing users must complete only their missing required questions", () => {
  const flow = setup();
  const existing = { gender: "female", goal: "maintain", experience: "advanced" };
  for (const [answers, expected] of [
    [{}, "age-range,training-location"],
    [{ ageRange: "25-34" }, "training-location"],
    [{ trainingLocation: "home" }, "age-range"],
    [{ ageRange: "prefer-not-to-say", trainingLocation: "gym" }, "age-range"],
    [{ ageRange: "35-44", trainingLocation: "mixed" }, ""],
  ]) {
    const profile = { ...existing, ...answers };
    assert.equal(flow.pendingOnboardingSteps(profile).map(step => step.key).join(","), expected);
    assert.equal(validation.onboardingValuesSchema.safeParse(profile).success, expected === "");
  }
});

test("legacy API profiles retain valid answers and re-ask null or retired required answers", async () => {
  const flow = setup();
  const existing = {
    gender: "female", goal: "maintain", experience: "advanced",
    ageRange: "prefer-not-to-say", trainingLocation: null, weightUnit: "lb",
  };
  let saved;
  const api = load("../src/lib/onboarding-profile.ts", {
    "./auth-client": { API_URL: "https://api.example.test" },
    "./validations/onboarding-validation": validation,
  }, {
    fetch: async (_url, options) => {
      if (options.method) saved = JSON.parse(options.body);
      return { ok: true, json: async () => ({ ...existing }) };
    },
  });
  const profile = await api.fetchOnboardingProfile("token");
  assert.equal(profile.weightUnit, "lb");
  assert.equal(profile.goal, "maintain");
  assert.equal(flow.pendingOnboardingSteps(profile).map(step => step.key).join(","), "age-range,training-location");
  const draft = flow.mergeOnboardingDraft(profile, { ageRange: "25-34", trainingLocation: "home" });
  await api.postOnboardingProfile("token", draft, profile);
  assert.equal(saved.ageRange, "25-34");
  assert.equal(saved.trainingLocation, "home");
  assert.equal(saved.weightUnit, "lb");
  assert.equal(validation.onboardingValuesSchema.safeParse(saved).success, true);
  assert.equal(flow.pendingOnboardingSteps(saved).length, 0);
});

test("restored signed-in sessions remain incomplete until both new required answers are saved", () => {
  for (const answers of [
    {},
    { ageRange: "25-34" },
    { trainingLocation: "gym" },
    { ageRange: "prefer-not-to-say", trainingLocation: "gym" },
    { ageRange: "25-34", trainingLocation: "gym" },
  ]) {
    let stateIndex = 0;
    const session = {
      token: "existing-token", user: { uid: "existing-user" },
      onboardingProfile: { gender: "female", goal: "maintain", experience: "advanced", ...answers },
    };
    const auth = load("../src/lib/chefu-auth.ts", {
      react: {
        createContext: () => ({ Provider: {} }),
        createElement: (_component, props) => props.value,
        useState: (initial) => [stateIndex++ === 0 ? session : initial, () => {}],
        useEffect() {},
      },
      "react-native": { Platform: { OS: "android" } },
      "expo-web-browser": { maybeCompleteAuthSession() {} },
      "expo-auth-session": {},
      "expo-crypto": {},
      "@tanstack/react-query": { useQueryClient: () => ({}) },
      "./validations/onboarding-validation": validation,
      "./onboarding-profile": {},
      "./query-persistence": {},
      "./chefu-session": {},
    }, { process: { env: {} } });
    const value = auth.ChefuAuthProvider({ children: null });
    assert.equal(value.isSignedIn, true);
    assert.equal(value.isOnboardingComplete, answers.ageRange === "25-34" && answers.trainingLocation === "gym");
  }
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
