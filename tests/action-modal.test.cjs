const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

// Exercise the real provider with native views and React hooks isolated.
function setup() {
  const slots = [];
  let cursor = 0;
  const element = (type, props) => ({ type, props });
  const react = {
    createContext: () => ({ Provider: "Provider" }),
    useContext() {},
    useCallback: (callback) => callback,
    useRef: (initial) => {
      const index = cursor++;
      return (slots[index] ??= { current: initial });
    },
    useState: (initial) => {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [
        slots[index],
        (value) => {
          slots[index] =
            typeof value === "function" ? value(slots[index]) : value;
        },
      ];
    },
  };
  const dependencies = {
    react,
    "react/jsx-runtime": { jsx: element, jsxs: element },
    "@/components/ui/guarded-pressable": {
      __esModule: true,
      default: "Pressable",
    },
    "@expo/vector-icons": { Feather: "Feather" },
    "react-native-safe-area-context": { SafeAreaView: "SafeAreaView" },
    "@/theme/app-theme": { useAppThemeColor: (name) => name },
    "react-native": {
      Keyboard: { dismiss() {} },
      Modal: "Modal",
      Pressable: "Pressable",
      ScrollView: "ScrollView",
      Text: "Text",
      View: "View",
      StyleSheet: { create: (styles) => styles, absoluteFill: {} },
    },
  };
  const module = { exports: {} };
  const source = fs.readFileSync(
    require("node:path").join(
      __dirname,
      "../src/components/ui/action-modal.tsx",
    ),
    "utf8",
  );
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    Error,
    require: (name) => {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  });
  function render() {
    cursor = 0;
    return module.exports.ActionModalProvider({ children: null });
  }
  function nodes(node) {
    if (!node || typeof node !== "object") return [];
    if (Array.isArray(node)) return node.flatMap(nodes);
    return [node, ...nodes(node.props?.children)];
  }
  return {
    show: (...args) => render().props.value(...args),
    modal: () => nodes(render()).find((node) => node.type === "Modal").props,
    buttons: () =>
      nodes(render())
        .filter(
          (node) => node.type === "Pressable" && node.props.accessibilityRole,
        )
        .map((node) => node.props),
    text: () =>
      nodes(render())
        .filter((node) => node.type === "Text")
        .map((node) => node.props.children),
  };
}
const flush = () => new Promise(setImmediate);

test("back and backdrop cancellation runs the cancel callback once, never the destructive action", async () => {
  const modal = setup();
  let resumed = 0;
  let discarded = 0;
  modal.show("Leave workout?", "Progress will not be saved", [
    { text: "Cancel", style: "cancel", onPress: () => resumed++ },
    { text: "Discard", style: "destructive", onPress: () => discarded++ },
  ]);
  const close = modal.modal().onRequestClose;
  close();
  close();
  await flush();
  assert.equal(resumed, 1);
  assert.equal(discarded, 0);
  assert.equal(modal.modal().visible, false);
});

test("selection exposes the saved choice and invokes the selected action once", async () => {
  const modal = setup();
  let unit = "kg";
  modal.show("Weight unit", "", [
    { text: "Kilograms", selected: true },
    {
      text: "Pounds",
      selected: false,
      onPress: async () => {
        unit = "lb";
      },
    },
  ]);
  const buttons = modal.buttons();
  assert.equal(buttons[0].accessibilityState.checked, true);
  assert.equal(buttons[1].accessibilityState.checked, false);
  const press = buttons[1].onPress;
  press();
  press();
  await flush();
  assert.equal(unit, "lb");
  assert.equal(modal.modal().visible, false);
});

test("messages queue without losing confirmations and rejected actions show an error", async () => {
  const modal = setup();
  modal.show("Save progress?", "", [
    {
      text: "Save",
      onPress: async () => {
        throw new Error("Offline");
      },
    },
  ]);
  modal.show("Another message");
  modal.buttons()[0].onPress();
  await flush();
  assert.ok(modal.text().includes("Another message"));
  modal.buttons()[0].onPress();
  await flush();
  assert.ok(modal.text().includes("Something went wrong"));
  assert.ok(modal.text().includes("Offline"));
  modal.modal().onRequestClose();
  assert.equal(modal.modal().visible, false);
});
