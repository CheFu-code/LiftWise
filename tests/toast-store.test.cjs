const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

test("toasts survive screen changes, replace old messages, and dismiss automatically", () => {
  const moduleFile = { exports: {} };
  const timers = new Map();
  let next = 0;
  vm.runInNewContext(
    ts.transpileModule(
      fs.readFileSync(
        path.join(__dirname, "../src/lib/toast-store.ts"),
        "utf8",
      ),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      },
    ).outputText,
    {
      module: moduleFile,
      exports: moduleFile.exports,
      setTimeout: (callback, duration) => {
        assert.equal(duration, 5000);
        timers.set(++next, callback);
        return next;
      },
      clearTimeout: (timer) => timers.delete(timer),
    },
  );
  const store = moduleFile.exports;
  let updates = 0;
  const leaveScreen = store.subscribeToast(() => {
    updates++;
  });
  store.showToast("Failed to save");
  assert.equal(updates, 1);
  leaveScreen();
  assert.equal(store.getToast().message, "Failed to save");
  store.showToast("Failed to update");
  assert.equal(timers.size, 1);
  assert.equal(store.getToast().message, "Failed to update");
  [...timers.values()][0]();
  assert.equal(store.getToast(), null);
  store.showToast("Try again");
  store.dismissToast();
  assert.equal(timers.size, 0);
  assert.equal(store.getToast(), null);
});
