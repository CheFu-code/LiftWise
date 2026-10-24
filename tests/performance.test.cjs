const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const query = require("@tanstack/react-query");

function load(file, dependencies = {}, globals = {}) {
  const moduleFile = { exports: {} };
  const code = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, "../src", file), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  vm.runInNewContext(code, {
    module: moduleFile,
    exports: moduleFile.exports,
    Date,
    URL,
    require: (name) => {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
    ...globals,
  });
  return moduleFile.exports;
}
const flush = () => new Promise((resolve) => setImmediate(resolve));

test("catalogue requests are reused; stale mutable data refetches", async () => {
  const { createQueryClient } = load("lib/query-client.ts", {
    "@tanstack/react-query": query,
    "./optimistic-workouts": { hasPendingWorkoutChanges: () => false },
  });
  const client = createQueryClient();
  let calls = 0;
  const queryFn = async () => {
    calls++;
    return [];
  };
  try {
    await client.fetchQuery({ queryKey: ["exercises"], queryFn });
    await client.fetchQuery({ queryKey: ["exercises"], queryFn });
    assert.equal(calls, 1);
    client.setQueryData(["workouts"], [], { updatedAt: Date.now() - 120_000 });
    await client.fetchQuery({ queryKey: ["workouts"], queryFn });
    assert.equal(calls, 2);
  } finally {
    client.clear();
  }
});

test("offline reads pause until reconnection while writes execute immediately instead of queuing", async () => {
  const { createQueryClient } = load("lib/query-client.ts", {
    "@tanstack/react-query": query,
    "./optimistic-workouts": { hasPendingWorkoutChanges: () => false },
  });
  const client = createQueryClient();
  client.mount();
  query.onlineManager.setOnline(false);
  let reads = 0;
  let writes = 0;
  try {
    const reading = client.fetchQuery({
      queryKey: ["exercises"],
      queryFn: async () => {
        reads++;
        return [];
      },
    });
    await flush();
    assert.equal(reads, 0);
    const mutation = new query.MutationObserver(client, {
      mutationFn: async () => {
        writes++;
      },
    });
    await mutation.mutate();
    assert.equal(writes, 1);
    query.onlineManager.setOnline(true);
    await reading;
    assert.equal(reads, 1);
  } finally {
    query.onlineManager.setOnline(true);
    client.unmount();
    client.clear();
  }
});

test("calendar-derived stats respect local day boundaries and require no day-specific request", () => {
  const { calendarStats } = load("lib/calendar-stats.ts", {
    "date-fns": require("date-fns"),
  });
  const day = new Date(2026, 9, 24);
  const calendar = {
    sessions: [
      {
        startedAt: new Date(2026, 9, 24, 0, 1).toISOString(),
        durationSeconds: 600,
      },
      {
        startedAt: new Date(2026, 9, 24, 23, 59).toISOString(),
        durationSeconds: 1200,
      },
      {
        startedAt: new Date(2026, 9, 23, 23, 59).toISOString(),
        durationSeconds: 900,
      },
    ],
  };
  const stats = calendarStats(calendar, day);
  assert.equal(stats.workouts, 2);
  assert.equal(stats.totalTimeSeconds, 1800);
  assert.equal(stats.avgTimeSeconds, 900);
  assert.equal(calendarStats(calendar, new Date(2026, 9, 22)).workouts, 0);
  assert.equal(calendarStats(undefined, day), undefined);
});

test("successful creation updates cached lists without claiming an incomplete list is complete", () => {
  const { cacheCreatedWorkout } = load("lib/workout-cache.ts");
  const client = new query.QueryClient();
  const workout = {
    id: "new",
    name: "New",
    image: null,
    muscles: "Chest",
    exercises: [{ id: "squat", sets: 3 }],
  };
  cacheCreatedWorkout(client, workout);
  assert.equal(client.getQueryData(["workouts"]), undefined);
  client.setQueryData(["workouts"], [{ id: "old" }]);
  cacheCreatedWorkout(client, workout);
  cacheCreatedWorkout(client, workout);
  assert.deepEqual(
    Array.from(client.getQueryData(["workouts"]), (item) => item.id),
    ["new", "old"],
  );
  assert.equal(client.getQueryData(["workouts", "new"]).name, "New");
  client.clear();
});

function persistence() {
  const disk = new Map();
  const timers = new Map();
  const flags = { pending: false, holdWrite: null };
  let next = 0;
  const storage = {
    getItem: async (key) => disk.get(key) ?? null,
    setItem: async (key, value) => {
      if (flags.holdWrite) await flags.holdWrite;
      disk.set(key, value);
    },
    removeItem: async (key) => {
      disk.delete(key);
    },
  };
  const api = load(
    "lib/query-persistence.ts",
    {
      "@react-native-async-storage/async-storage": {
        __esModule: true,
        default: storage,
      },
      "@tanstack/react-query": query,
      "./optimistic-workouts": {
        hasPendingWorkoutChanges: () => flags.pending,
      },
    },
    {
      setTimeout: (callback) => {
        timers.set(++next, callback);
        return next;
      },
      clearTimeout: (id) => timers.delete(id),
    },
  );
  return {
    ...api,
    disk,
    flags,
    tick: async () => {
      const pending = [...timers.values()];
      timers.clear();
      pending.forEach((callback) => callback());
      await flush();
    },
  };
}

test("disk cache restores only the matching account and never stores auth or support payloads", async () => {
  const state = persistence();
  const alice = new query.QueryClient();
  const stop = await state.restoreAndPersistQueries(alice, "alice", () => true);
  alice.setQueryData(["workouts"], [{ id: "alice-workout" }]);
  alice.setQueryData(["auth"], { token: "secret" });
  alice.setQueryData(["support-report"], { description: "private report" });
  await state.tick();
  const raw = [...state.disk.values()][0];
  assert.ok(!raw.includes("secret") && !raw.includes("private report"));
  stop();
  const restored = new query.QueryClient();
  const stopRestored = await state.restoreAndPersistQueries(
    restored,
    "alice",
    () => true,
  );
  assert.equal(restored.getQueryData(["workouts"])[0].id, "alice-workout");
  const bob = new query.QueryClient();
  const stopBob = await state.restoreAndPersistQueries(bob, "bob", () => true);
  assert.equal(bob.getQueryData(["workouts"]), undefined);
  stopRestored();
  stopBob();
  alice.clear();
  restored.clear();
  bob.clear();
});

test("optimistic state is excluded from persistence until its write settles", async () => {
  const state = persistence();
  const client = new query.QueryClient();
  const stop = await state.restoreAndPersistQueries(
    client,
    "alice",
    () => true,
  );
  client.setQueryData(["workouts"], [{ id: "original" }]);
  await state.tick();
  state.flags.pending = true;
  client.setQueryData(["workouts"], [{ id: "unconfirmed" }]);
  await state.tick();
  assert.ok(![...state.disk.values()][0].includes("unconfirmed"));
  client.setQueryData(["workouts"], [{ id: "confirmed" }]);
  state.flags.pending = false;
  await state.tick();
  assert.ok([...state.disk.values()][0].includes("confirmed"));
  stop();
  client.clear();
});

test("a failed background refresh keeps confirmed data available after restarting", async () => {
  const state = persistence();
  const client = new query.QueryClient();
  const stop = await state.restoreAndPersistQueries(
    client,
    "alice",
    () => true,
  );
  client.setQueryData(["workouts"], [{ id: "saved" }]);
  client
    .getQueryCache()
    .find({ queryKey: ["workouts"] })
    .setState({ status: "error", error: new Error("Offline") });
  await state.tick();
  stop();
  const restored = new query.QueryClient();
  const stopRestored = await state.restoreAndPersistQueries(
    restored,
    "alice",
    () => true,
  );
  assert.equal(restored.getQueryData(["workouts"])[0].id, "saved");
  assert.equal(restored.getQueryState(["workouts"]).status, "success");
  stopRestored();
  client.clear();
  restored.clear();
});

test("sign-out removes disk data after queued writes and prevents old subscribers from recreating it", async () => {
  const state = persistence();
  const client = new query.QueryClient();
  const stop = await state.restoreAndPersistQueries(
    client,
    "alice",
    () => true,
  );
  let finish;
  state.flags.holdWrite = new Promise((resolve) => {
    finish = resolve;
  });
  client.setQueryData(["workouts"], [{ id: "old" }]);
  await state.tick();
  const purging = state.purgeQueryCache("alice");
  finish();
  await purging;
  client.setQueryData(["workouts"], [{ id: "obsolete" }]);
  await state.tick();
  assert.equal(state.disk.size, 0);
  stop();
  client.clear();
});

test("preference saves skip unchanged values and send only changed fields", async () => {
  const schema = load("lib/validations/onboarding-validation.ts", {
    zod: require("zod"),
  });
  const requests = [];
  const api = load(
    "lib/onboarding-profile.ts",
    {
      "./auth-client": { API_URL: "https://api.example" },
      "./validations/onboarding-validation": schema,
    },
    {
      fetch: async (_url, options) => {
        requests.push(options);
        return { ok: true };
      },
    },
  );
  const before = {
    gender: "female",
    experience: "beginner",
    goal: "maintain",
    weightUnit: "kg",
  };
  await api.postOnboardingProfile("token", before, before);
  assert.equal(requests.length, 0);
  await api.postOnboardingProfile(
    "token",
    { ...before, weightUnit: "lb" },
    before,
  );
  assert.equal(requests[0].method, "PATCH");
  assert.deepEqual(JSON.parse(requests[0].body), { weightUnit: "lb" });
  await api.postOnboardingProfile("token", before);
  assert.equal(requests[1].method, "POST");
});

test("image optimization preserves third-party and signed image URLs", () => {
  const { imageUrl } = load("lib/image-url.ts");
  assert.match(
    imageUrl("https://res.cloudinary.com/demo/image/upload/v1/photo.jpg"),
    /f_auto,q_auto,w_960,c_limit/,
  );
  for (const original of [
    "file:///local/photo.jpg",
    "https://example.com/photo.jpg",
    "https://res.cloudinary.com/demo/image/upload/s--signature--/photo.jpg",
  ])
    assert.equal(imageUrl(original), original);
});
