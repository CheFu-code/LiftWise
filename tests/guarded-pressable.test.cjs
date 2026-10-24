const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function setup(kind = "default") {
  const slots = [];
  let cursor = 0;
  let now = 1000;
  const messages = [];
  const element = (type, props) => ({ type, props });
  const dependencies = {
    react: {
      forwardRef: (render) => (props) => render(props, "forwarded-ref"),
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
      Pressable: "Pressable",
      TouchableOpacity: "TouchableOpacity",
    },
    "@/lib/toast-store": { showToast: (message) => messages.push(message) },
  };
  const moduleFile = { exports: {} };
  const code = ts.transpileModule(
    fs.readFileSync(
      path.join(__dirname, "../src/components/ui/guarded-pressable.tsx"),
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
    Date: { now: () => now },
    require: (name) => {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  });
  let prevented = 0;
  return {
    messages,
    event: {
      preventDefault: () => {
        prevented++;
      },
    },
    prevented: () => prevented,
    advance: (ms) => {
      now += ms;
    },
    render: (props) => {
      cursor = 0;
      return moduleFile.exports[kind](props);
    },
  };
}
const flush = () => new Promise((resolve) => setImmediate(resolve));

for (const kind of ["default", "TouchableOpacity"]) {
  test(`${kind}: first tap is instant; rapid taps are ignored across re-renders`, () => {
    const state = setup(kind);
    let calls = 0;
    const onPress = () => {
      calls++;
    };
    state.render({ onPress }).props.onPress(state.event);
    assert.equal(calls, 1);
    state.render({ onPress }).props.onPress(state.event);
    state.advance(399);
    state.render({ onPress }).props.onPress(state.event);
    assert.equal(calls, 1);
    assert.equal(state.prevented(), 2);
    state.advance(1);
    state.render({ onPress }).props.onPress(state.event);
    assert.equal(calls, 2);
  });
}

test("a pending async action remains disabled beyond the cooldown and unlocks on completion", async () => {
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
  button.props.onPress(state.event);
  state.advance(1000);
  button.props.onPress(state.event);
  assert.equal(calls, 1);
  const pending = state.render({ onPress });
  assert.equal(pending.props.disabled, true);
  assert.equal(pending.props.accessibilityState.busy, true);
  complete();
  await flush();
  assert.equal(state.render({ onPress }).props.disabled, false);
});

test("failure unlocks the action with a toast, and disabled buttons never execute", async () => {
  const state = setup();
  let calls = 0;
  const onPress = async () => {
    calls++;
    throw new Error("Offline");
  };
  state.render({ onPress, disabled: true }).props.onPress(state.event);
  assert.equal(calls, 0);
  state.render({ onPress }).props.onPress(state.event);
  await flush();
  assert.equal(state.messages.length, 1);
  assert.equal(state.render({ onPress }).props.disabled, false);
  state.advance(400);
  state.render({ onPress }).props.onPress(state.event);
  await flush();
  assert.equal(calls, 2);
});

test("counter buttons support intentional faster repeats and preserve native styling and refs", () => {
  const state = setup();
  let calls = 0;
  const style = ({ pressed }) => ({ opacity: pressed ? 0.5 : 1 });
  const props = {
    onPress: () => {
      calls++;
    },
    tapGuardInterval: 150,
    style,
    cssInterop: false,
    className: "test",
    accessibilityState: { selected: true },
  };
  const button = state.render(props);
  button.props.onPress(state.event);
  state.advance(150);
  state.render(props).props.onPress(state.event);
  assert.equal(calls, 2);
  assert.equal(button.props.style, style);
  assert.equal(button.props.cssInterop, false);
  assert.equal(button.props.className, "test");
  assert.equal(button.props.ref, "forwarded-ref");
  assert.equal(button.props.accessibilityState.selected, true);
});

test("app pressable controls consistently use the shared guard", () => {
  function check(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        check(file);
        continue;
      }
      if (!file.endsWith(".tsx") || file.endsWith("guarded-pressable.tsx"))
        continue;
      const source = ts.createSourceFile(
        file,
        fs.readFileSync(file, "utf8"),
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      );
      for (const statement of source.statements) {
        if (
          !ts.isImportDeclaration(statement) ||
          statement.moduleSpecifier.text !== "react-native"
        )
          continue;
        const bindings = statement.importClause?.namedBindings;
        if (!bindings || !ts.isNamedImports(bindings)) continue;
        assert.ok(
          !bindings.elements.some((item) =>
            [
              "Pressable",
              "TouchableOpacity",
              "TouchableHighlight",
              "TouchableWithoutFeedback",
            ].includes(item.propertyName?.text ?? item.name.text),
          ),
          `${file} imports an unguarded control`,
        );
      }
    }
  }
  check(path.join(__dirname, "../src"));
});
