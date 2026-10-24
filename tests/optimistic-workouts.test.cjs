const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const { QueryClient } = require("@tanstack/react-query");

const moduleFile = { exports: {} };
vm.runInNewContext(
  ts.transpileModule(
    fs.readFileSync(
      path.join(__dirname, "../src/lib/optimistic-workouts.ts"),
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText,
  { module: moduleFile, exports: moduleFile.exports },
);
const { optimisticWorkoutChange } = moduleFile.exports;

function setup() {
  const client = new QueryClient();
  const detail = {
    id: "a",
    name: "Workout A",
    image: "old",
    exercises: [{ id: "squat" }, { id: "bench" }],
  };
  const list = [
    { id: "a", image: "old" },
    { id: "b", image: "other" },
  ];
  client.setQueryData(["workouts", "a"], detail);
  client.setQueryData(["workouts"], list);
  client.setQueryData(["workouts", { limit: 4 }], list);
  return client;
}
const detail = (client) => client.getQueryData(["workouts", "a"]);
const list = (client) => client.getQueryData(["workouts"]);

test("cover changes appear in detail and every list, then roll back together", async () => {
  const client = setup();
  const rollback = await optimisticWorkoutChange(client, "a", {
    image: "local-photo",
  });
  assert.equal(detail(client).image, "local-photo");
  assert.equal(list(client)[0].image, "local-photo");
  assert.equal(
    client.getQueryData(["workouts", { limit: 4 }])[0].image,
    "local-photo",
  );
  rollback();
  assert.equal(detail(client).image, "old");
  assert.equal(list(client)[0].image, "old");
});

test("failed deletion restores the row while preserving edits to other workouts", async () => {
  const client = setup();
  const rollback = await optimisticWorkoutChange(client, "a", {
    deleted: true,
  });
  assert.deepEqual(
    Array.from(list(client), (item) => item.id),
    ["b"],
  );
  await optimisticWorkoutChange(client, "b", { image: "new-b" });
  rollback();
  assert.deepEqual(
    Array.from(list(client), (item) => item.id),
    ["a", "b"],
  );
  assert.equal(list(client)[1].image, "new-b");
});

test("failed reorder restores the exercise order without losing a simultaneous cover change", async () => {
  const client = setup();
  const rollback = await optimisticWorkoutChange(client, "a", {
    exerciseIds: ["bench", "squat"],
  });
  assert.deepEqual(
    Array.from(detail(client).exercises, (item) => item.id),
    ["bench", "squat"],
  );
  await optimisticWorkoutChange(client, "a", { image: "new-photo" });
  rollback();
  assert.deepEqual(
    Array.from(detail(client).exercises, (item) => item.id),
    ["squat", "bench"],
  );
  assert.equal(detail(client).image, "new-photo");
});

test("rollback cannot overwrite a newer cover or restore data after sign-out", async () => {
  const client = setup();
  const rollback = await optimisticWorkoutChange(client, "a", {
    image: "first-photo",
  });
  await optimisticWorkoutChange(client, "a", { image: "second-photo" });
  rollback();
  assert.equal(detail(client).image, "second-photo");
  client.clear();
  rollback();
  assert.equal(detail(client), undefined);
  assert.equal(list(client), undefined);
});

test("rollback refetch waits for all workout writes, and settling is idempotent", async () => {
  const client = setup();
  let refetches = 0;
  client.invalidateQueries = async () => {
    refetches++;
  };
  const first = await optimisticWorkoutChange(client, "a", { image: "new-a" });
  const second = await optimisticWorkoutChange(client, "b", { deleted: true });
  first();
  first.settle();
  assert.equal(refetches, 0);
  second.settle();
  second.settle();
  assert.equal(refetches, 1);
});

test("confirmed writes update every cover URL without refetching workouts", async () => {
  const client = setup();
  let refetches = 0;
  client.invalidateQueries = async () => {
    refetches++;
  };
  const pending = await optimisticWorkoutChange(client, "a", {
    image: "local-photo",
  });
  pending.confirmImage("https://example.com/saved.jpg");
  pending.settle();
  assert.equal(refetches, 0);
  assert.equal(detail(client).image, "https://example.com/saved.jpg");
  assert.equal(list(client)[0].image, "https://example.com/saved.jpg");
});

test("server confirmation wins over an old refetch result during an optimistic edit", async () => {
  const client = setup();
  const before = detail(client);
  const cover = await optimisticWorkoutChange(client, "a", { image: "local-photo" });
  client.setQueryData(["workouts", "a"], before);
  cover.confirmImage("https://example.com/saved.jpg");
  cover.settle();
  assert.equal(detail(client).image, "https://example.com/saved.jpg");
  const order = await optimisticWorkoutChange(client, "a", { exerciseIds: ["bench", "squat"] });
  client.setQueryData(["workouts", "a"], before);
  order.confirmOrder();
  order.settle();
  assert.deepEqual(Array.from(detail(client).exercises, (exercise) => exercise.id), ["bench", "squat"]);
  const deletion = await optimisticWorkoutChange(client, "a", { deleted: true });
  client.setQueryData(["workouts"], [{ id: "a" }, { id: "b" }]);
  deletion.confirmDeletion();
  deletion.settle();
  assert.deepEqual(Array.from(list(client), (workout) => workout.id), ["b"]);
});
