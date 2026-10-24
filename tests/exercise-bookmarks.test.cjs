const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const { QueryClient, MutationObserver } = require("@tanstack/react-query");

function setup(initial = []) {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  const key = ["exercise-bookmarks", "alice"];
  client.setQueryData(key, initial);
  const requests = [];
  const messages = [];
  const completions = [];
  let invalidations = 0;
  client.invalidateQueries = async () => {
    invalidations++;
  };
  const dependencies = {
    react: { useRef: (current) => ({ current }) },
    "@/lib/chefu-auth": { useAuth: () => ({ userId: "alice" }) },
    "@/components/ui/toast": {
      useToast: () => ({
        showToast: (message) => messages.push(message),
        dismissToast() {},
      }),
    },
    "@/lib/api": {
      getExerciseBookmarks() {},
      setExerciseBookmark: (id, saved) =>
        new Promise((resolve, reject) => {
          requests.push({ id, saved, resolve, reject });
        }),
    },
    "@tanstack/react-query": {
      useQueryClient: () => client,
      useQuery: () => ({
        data: client.getQueryData(key),
        isPending: false,
        isError: false,
      }),
      useMutation: (options) => {
        const observer = new MutationObserver(client, options);
        return {
          isPending: false,
          mutate: (variables) => {
            completions.push(observer.mutate(variables).catch(() => {}));
          },
        };
      },
    },
  };
  const module = { exports: {} };
  const source = fs.readFileSync(
    path.join(__dirname, "../src/hooks/use-exercise-bookmarks.ts"),
    "utf8",
  );
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    require: (name) => {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  });
  return {
    hook: module.exports.useExerciseBookmarks(),
    client,
    key,
    requests,
    messages,
    completions,
    ids: () => Array.from(client.getQueryData(key) ?? []),
    invalidations: () => invalidations,
  };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

test("saving updates immediately and a failed save restores the bookmark with a toast", async () => {
  const state = setup();
  state.hook.toggle("squat");
  await flush();
  assert.deepEqual(state.ids(), ["squat"]);
  assert.equal(state.requests[0].saved, true);
  state.requests[0].reject(new Error("Offline"));
  await Promise.all(state.completions);
  assert.deepEqual(state.ids(), []);
  assert.match(state.messages[0], /Failed to save exercise/);
  assert.equal(state.invalidations(), 1);
});

test("failed removal restores the saved exercise", async () => {
  const state = setup(["squat"]);
  state.hook.toggle("squat");
  await flush();
  assert.deepEqual(state.ids(), []);
  state.requests[0].reject(new Error("Offline"));
  await Promise.all(state.completions);
  assert.deepEqual(state.ids(), ["squat"]);
  assert.match(state.messages[0], /Failed to remove saved exercise/);
});

test("rollback preserves other pending saves and refetch waits for the final write", async () => {
  const state = setup();
  state.hook.toggle("squat");
  state.hook.toggle("bench");
  await flush();
  assert.deepEqual(state.ids(), ["squat", "bench"]);
  state.requests[0].reject(new Error("Offline"));
  await state.completions[0];
  assert.deepEqual(state.ids(), ["bench"]);
  assert.equal(state.invalidations(), 0);
  state.requests[1].resolve({ success: true });
  await state.completions[1];
  assert.deepEqual(state.ids(), ["bench"]);
  assert.equal(state.invalidations(), 1);
});

test("rapid duplicate taps send one request and successful saves show no failure toast", async () => {
  const state = setup();
  state.hook.toggle("squat");
  state.hook.toggle("squat");
  await flush();
  assert.equal(state.requests.length, 1);
  state.requests[0].resolve({ success: true });
  await Promise.all(state.completions);
  assert.deepEqual(state.ids(), ["squat"]);
  assert.deepEqual(state.messages, []);
});

test("failure after account cache cleanup does not recreate the old user's bookmarks", async () => {
  const state = setup();
  state.hook.toggle("squat");
  await flush();
  state.client.removeQueries({ queryKey: state.key });
  state.requests[0].reject(new Error("Signed out"));
  await Promise.all(state.completions);
  assert.equal(state.client.getQueryData(state.key), undefined);
  assert.equal(state.invalidations(), 0);
});
