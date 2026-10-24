const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

// Load the real TypeScript modules with isolated native/network/database adapters.
function load(file, dependencies = {}, globals = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(
    fs.readFileSync(path.resolve(__dirname, file), "utf8"),
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
    process: { env: {} },
    Headers,
    Response,
    Date,
    URL,
    require: (name) => {
      if (!(name in dependencies))
        throw new Error(`Unexpected dependency ${name}`);
      return dependencies[name];
    },
    ...globals,
  });
  return module.exports;
}

function client(refreshAsync) {
  let stored = null;
  class TokenError extends Error {
    constructor(code) {
      super(code);
      this.code = code;
    }
  }
  const api = load("../src/lib/chefu-session.ts", {
    "expo-auth-session": { refreshAsync, TokenError },
    "react-native": { Platform: { OS: "ios" } },
    "expo-secure-store": {
      getItemAsync: async () => stored,
      setItemAsync: async (_key, value) => {
        stored = value;
      },
      deleteItemAsync: async () => {
        stored = null;
      },
    },
  });
  return { api, TokenError, stored: () => stored };
}
const expired = () => ({
  token: "old",
  refreshToken: "refresh-old",
  expiresAt: Date.now() - 1,
  user: { uid: "chefu-uid" },
});
const refreshed = () => ({
  accessToken: "new",
  refreshToken: "refresh-new",
  issuedAt: Math.floor(Date.now() / 1000),
  expiresIn: 3600,
});

test("concurrent requests refresh once and persist the rotated refresh token", async () => {
  let calls = 0;
  const { api, stored } = client(async () => {
    calls++;
    return refreshed();
  });
  await api.readSession();
  const profile = {
    gender: "female",
    goal: "maintain",
    experience: "beginner",
  };
  await api.saveSession({ ...expired(), onboardingProfile: profile });
  assert.deepEqual(
    await Promise.all([api.getToken(), api.getToken(), api.getToken()]),
    ["new", "new", "new"],
  );
  assert.equal(calls, 1);
  assert.equal(JSON.parse(stored()).refreshToken, "refresh-new");
  assert.deepEqual(JSON.parse(stored()).onboardingProfile, profile);
});

test("a pending refresh cannot resurrect a signed-out session", async () => {
  let resolveRefresh;
  let started;
  const start = new Promise((resolve) => {
    started = resolve;
  });
  const { api, stored } = client(() => {
    started();
    return new Promise((resolve) => {
      resolveRefresh = resolve;
    });
  });
  await api.readSession();
  await api.saveSession(expired());
  const pending = api.getToken();
  await start;
  await api.saveSession(null);
  resolveRefresh(refreshed());
  assert.equal(await pending, null);
  assert.equal(stored(), null);
});

test("invalid refresh grants clear session; network failures preserve it for retry", async () => {
  for (const rejected of [true, false]) {
    let error;
    const { api, TokenError, stored } = client(async () => {
      throw error;
    });
    error = rejected ? new TokenError("invalid_grant") : new Error("offline");
    await api.readSession();
    await api.saveSession(expired());
    await assert.rejects(api.getToken());
    assert.equal(stored() === null, rejected);
  }
});

function signInFlow(result, sessionOverrides = {}) {
  const calls = { exchange: 0, save: 0 };
  const auth = load("../src/lib/chefu-auth.ts", {
    "expo-auth-session": {
      makeRedirectUri: (options) => options.native,
      ResponseType: { Code: "code" },
      AuthRequest: class {
        constructor(options) {
          calls.request = options;
          this.codeVerifier = "secret-verifier";
        }
        async makeAuthUrlAsync() {
          return "https://api.chefu.co.za/oauth/authorize?client_id=liftwise-mobile";
        }
        async promptAsync(_discovery, options) {
          calls.loginUrl = options.url;
          return result;
        }
      },
      exchangeCodeAsync: async (options) => {
        calls.exchange++;
        calls.tokenOptions = options;
        return refreshed();
      },
    },
    "expo-crypto": { randomUUID: () => "random-state-and-nonce" },
    "expo-web-browser": { maybeCompleteAuthSession() {} },
    react: {
      createContext: () => ({ Provider: {} }),
      createElement: (_component, props) => props.value,
      useContext() {},
      useEffect() {},
      useState: (value) => [value, () => {}],
    },
    "@tanstack/react-query": {
      useQueryClient: () => ({ cancelQueries: async () => {}, clear() {} }),
    },
    "@/constants/onboarding": {
      getOnboardingAnswers: () => ({ success: false }),
      resetOnboardingAnswers() {},
    },
    "./auth-client": { API_URL: "http://localhost:8081" },
    "./validations/onboarding-validation": {
      onboardingValuesSchema: { safeParse: () => ({ success: false }) },
    },
    "./onboarding-profile": {
      fetchOnboardingProfile: async () => ({ gender: "female" }),
      postOnboardingProfile: async () => {},
    },
    "./chefu-session": {
      CLIENT_ID: "liftwise-mobile",
      DISCOVERY: {},
      getToken() {},
      readSession() {},
      subscribeSession() {},
      fetchUser: async () => ({ uid: "chefu-uid" }),
      sessionFromToken: () => ({ token: "new", user: { uid: "chefu-uid" } }),
      saveSession: async (session) => {
        calls.save++;
        calls.savedProfile = session.onboardingProfile;
      },
      ...sessionOverrides,
    },
  });
  return { value: auth.ChefuAuthProvider({ children: null }), calls };
}

test("cancelled or tampered callbacks cannot exchange a code or save a session", async () => {
  const cancelled = signInFlow({ type: "cancel" });
  assert.equal(await cancelled.value.signInWithChefuAccount(), null);
  assert.equal(cancelled.calls.exchange, 0);
  const tampered = signInFlow({
    type: "success",
    params: { state: "wrong-state", code: "code" },
  });
  await assert.rejects(
    tampered.value.signInWithChefuAccount(),
    /security validation/,
  );
  assert.equal(tampered.calls.exchange, 0);
  assert.equal(tampered.calls.save, 0);
});

test("valid callbacks exchange the verifier and registration preserves the OAuth return target", async () => {
  const { value, calls } = signInFlow({
    type: "success",
    params: { state: "random-state-and-nonce", code: "code" },
  });
  await value.signInWithChefuAccount("register");
  assert.equal(calls.request.usePKCE, true);
  assert.equal(calls.request.redirectUri, "liftwise://sso-callback");
  assert.equal(calls.tokenOptions.extraParams.code_verifier, "secret-verifier");
  assert.equal(calls.save, 1);
  assert.equal(calls.savedProfile.gender, "female");
  const url = new URL(calls.loginUrl);
  assert.equal(url.pathname, "/register");
  assert.equal(url.searchParams.get("app"), "liftwise");
  assert.equal(
    new URL(url.searchParams.get("returnTo")).pathname,
    "/oauth/authorize",
  );
});

test("profile refresh preserves rotated tokens and newly saved preferences", async () => {
  let current = {
    token: "old",
    user: { uid: "alice" },
    onboardingProfile: { weightUnit: "kg" },
  };
  const { value } = signInFlow(
    {},
    {
      getToken: async () => "old",
      readSession: async () => current,
      fetchUser: async () => {
        current = {
          ...current,
          token: "rotated",
          onboardingProfile: { weightUnit: "lb" },
        };
        return { uid: "alice", name: "Updated name" };
      },
      saveSession: async (next) => {
        current = next;
      },
    },
  );
  await value.refreshUser();
  assert.equal(current.token, "rotated");
  assert.equal(current.onboardingProfile.weightUnit, "lb");
  assert.equal(current.user.name, "Updated name");
});

test("a profile refresh cannot restore a signed-out account", async () => {
  let current = { token: "old", user: { uid: "alice" } };
  let saved = false;
  const { value } = signInFlow(
    {},
    {
      getToken: async () => "old",
      readSession: async () => current,
      fetchUser: async () => {
        current = null;
        return { uid: "alice" };
      },
      saveSession: async () => {
        saved = true;
      },
    },
  );
  assert.equal(await value.refreshUser(), null);
  assert.equal(saved, false);
});
