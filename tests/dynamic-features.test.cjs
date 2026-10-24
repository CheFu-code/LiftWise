const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
function load(file, deps = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, "../src/lib/", file), "utf8"),
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
    require: (name) => {
      assert.ok(name in deps, `Unexpected dependency ${name}`);
      return deps[name];
    },
  });
  return module.exports;
}

test("pounds convert to canonical kilograms and back without changing existing data", () => {
  const unit = load("weight.ts");
  assert.ok(Math.abs(unit.weightInput("100", "lb") - 45.359237) < 0.00001);
  for (const weight of [0, 2.5, 45.359237, 200]) {
    assert.ok(
      Math.abs(
        unit.toKilograms(unit.fromKilograms(weight, "lb"), "lb") - weight,
      ) < 0.000001,
    );
    assert.equal(unit.toKilograms(weight, "kg"), weight);
  }
  assert.equal(unit.weightInput("0", "lb"), 0);
  assert.equal(unit.weightInput("2,5", "kg"), 2.5);
  for (const value of ["", " ", "-2", "NaN", "Infinity", "wrong"])
    assert.throws(() => unit.weightInput(value, "kg"));
});

test("workout search filters names and muscles, trims whitespace and handles no results", () => {
  const { filterWorkouts } = load("workout-search.ts");
  const workouts = [
    { name: "Push Day", muscles: "chest" },
    { name: "Pull Day", muscles: "back" },
  ];
  assert.equal(filterWorkouts(workouts, "  PUSH ").length, 1);
  assert.equal(filterWorkouts(workouts, "BACK")[0].name, "Pull Day");
  assert.equal(filterWorkouts(workouts, "missing").length, 0);
  assert.equal(filterWorkouts(workouts, "").length, 2);
});

test("exercise defaults use goal and experience without assigning a weight", () => {
  const { workoutDefaults } = load("workout-defaults.ts");
  const beginner = workoutDefaults({
    experience: "beginner",
    goal: "lose-fat",
  });
  const advanced = workoutDefaults({
    experience: "advanced",
    goal: "build-muscle",
  });
  assert.equal(beginner.sets, 2);
  assert.equal(beginner.reps, 12);
  assert.equal(advanced.sets, 4);
  assert.equal(advanced.rest, 90);
  assert.equal(beginner.weight, undefined);
});

function reminders(os = "android", granted = true) {
  let userId = "alice";
  const scheduled = new Map();
  const calls = { requests: 0, channels: 0 };
  let failSchedule = false;
  const api = load("workout-reminders.ts", {
    "./chefu-session": {
      readSession: async () => (userId ? { user: { uid: userId } } : null),
    },
    "react-native": { Platform: { OS: os } },
    "expo-notifications": {
      AndroidImportance: { DEFAULT: 3 },
      IosAuthorizationStatus: { PROVISIONAL: 3 },
      SchedulableTriggerInputTypes: { DAILY: "daily" },
      setNotificationChannelAsync: async () => {
        calls.channels++;
      },
      getPermissionsAsync: async () => ({ granted }),
      requestPermissionsAsync: async () => {
        calls.requests++;
        return { granted };
      },
      cancelScheduledNotificationAsync: async (id) => {
        scheduled.delete(id);
      },
      scheduleNotificationAsync: async (value) => {
        if (failSchedule) {
          failSchedule = false;
          throw new Error("device error");
        }
        scheduled.set(value.identifier, value);
      },
      getAllScheduledNotificationsAsync: async () => [...scheduled.values()],
    },
  });
  return {
    setUser: (value) => {
      userId = value;
    },
    api,
    scheduled,
    calls,
    failNext: () => {
      failSchedule = true;
    },
  };
}

test("daily reminders stay unique and queued sign-out removes pending schedules", async () => {
  const { api, scheduled, setUser } = reminders();
  const pref = { enabled: true, hour: 18, minute: 30 };
  await api.syncWorkoutReminder("alice", pref);
  await api.syncWorkoutReminder("alice", pref);
  assert.equal(scheduled.size, 1);
  assert.equal([...scheduled.values()][0].trigger.hour, 18);
  assert.equal(await api.reminderScheduled(), true);
  setUser(null);
  await Promise.all([
    api.syncWorkoutReminder("alice", pref),
    api.syncWorkoutReminder(),
  ]);
  assert.equal(scheduled.size, 0);
});

test("a stale account cannot replace the current user's reminder", async () => {
  const device = reminders();
  device.setUser("bob");
  await device.api.syncWorkoutReminder("bob", {
    enabled: true,
    hour: 20,
    minute: 0,
  });
  await device.api.syncWorkoutReminder("alice", {
    enabled: true,
    hour: 8,
    minute: 0,
  });
  assert.equal([...device.scheduled.values()][0].trigger.hour, 20);
});

test("reminders respect device permission and recover after scheduling errors", async () => {
  const denied = reminders("android", false);
  assert.equal(await denied.api.reminderPermission(true), false);
  assert.equal(denied.calls.requests, 1);
  await denied.api.syncWorkoutReminder("alice", {
    enabled: true,
    hour: 18,
    minute: 0,
  });
  assert.equal(denied.scheduled.size, 0);
  const device = reminders();
  device.failNext();
  await assert.rejects(
    device.api.syncWorkoutReminder("alice", {
      enabled: true,
      hour: 18,
      minute: 0,
    }),
  );
  await device.api.syncWorkoutReminder("alice", {
    enabled: true,
    hour: 19,
    minute: 0,
  });
  assert.equal(device.scheduled.size, 1);
  await device.api.syncWorkoutReminder("alice", {
    enabled: false,
    hour: 19,
    minute: 0,
  });
  assert.equal(device.scheduled.size, 0);
});

test("web never schedules native reminders or asks for device permission", async () => {
  const web = reminders("web");
  await web.api.syncWorkoutReminder("alice", {
    enabled: true,
    hour: 18,
    minute: 0,
  });
  assert.equal(await web.api.reminderPermission(true), false);
  assert.equal(web.calls.requests, 0);
  assert.equal(web.calls.channels, 0);
  assert.equal(web.scheduled.size, 0);
});
