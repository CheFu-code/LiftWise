const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function setup() {
  const slots = [];
  let cursor = 0;
  const messages = [];
  const element = (type, props) => ({ type, props });
  const dependencies = {
    react: {
      forwardRef: (render) => (props) => render(props, null),
      useRef: (current) => (slots[cursor++] ??= { current }),
      useState: (initial) => {
        const index = cursor++;
        if (!(index in slots)) slots[index] = initial;
        return [
          slots[index],
          (value) => {
            slots[index] = value;
          },
        ];
      },
    },
    "react/jsx-runtime": { jsx: element, jsxs: element },
    "react-native": {
      ActivityIndicator: "Spinner",
      Pressable: "Pressable",
      Text: "Text",
    },
    "@/lib/utils": { cn: (...values) => values.filter(Boolean).join(" ") },
    "@/theme/app-theme": { useAppThemeColor: (name) => name },
    "./toast": {
      useToast: () => ({ showToast: (message) => messages.push(message) }),
    },
  };
  const moduleFile = { exports: {} };
  const code = ts.transpileModule(
    fs.readFileSync(
      path.join(__dirname, "../src/components/ui/button.tsx"),
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    },
  ).outputText;
  vm.runInNewContext(code, {
    module: moduleFile,
    exports: moduleFile.exports,
    require: (name) => {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  });
  return {
    messages,
    render: (props) => {
      cursor = 0;
      return moduleFile.exports.default({ children: "Save", ...props });
    },
  };
}
const flush = () => new Promise((resolve) => setImmediate(resolve));

test("loading disables the button even when the caller passes disabled=false", () => {
  const state = setup();
  let calls = 0;
  const button = state.render({
    isLoading: true,
    disabled: false,
    onPress: () => {
      calls++;
    },
  });
  button.props.onPress({});
  assert.equal(calls, 0);
  assert.equal(button.props.disabled, true);
  assert.equal(button.props.accessibilityState.busy, true);
  assert.equal(button.props.children[0].type, "Spinner");
});

test("an async action locks immediately, shows loading, and enables after success", async () => {
  const state = setup();
  let calls = 0;
  let complete;
  const onPress = () => {
    calls++;
    return new Promise((resolve) => {
      complete = resolve;
    });
  };
  const button = state.render({ onPress });
  button.props.onPress({});
  button.props.onPress({});
  assert.equal(calls, 1);
  assert.equal(state.render({ onPress }).props.disabled, true);
  complete();
  await flush();
  assert.equal(state.render({ onPress }).props.disabled, false);
  assert.deepEqual(state.messages, []);
});

test("a failed async action releases the lock and shows an error toast", async () => {
  const state = setup();
  let fail;
  const onPress = () =>
    new Promise((_resolve, reject) => {
      fail = reject;
    });
  state.render({ onPress }).props.onPress({});
  fail(new Error("Offline"));
  await flush();
  assert.equal(state.render({ onPress }).props.disabled, false);
  assert.equal(state.messages.length, 1);
});

test("spinner colors match outline and secondary button text", () => {
  for (const [variant, expected] of [
    ["outline", "foreground"],
    ["secondary", "secondaryForeground"],
  ]) {
    const button = setup().render({ variant, isLoading: true });
    assert.equal(button.props.children[0].props.color, expected);
  }
});
