const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function setup(disabled = false) {
  const instances = new Map();
  let slots;
  let cursor;
  const calls = { orders: [], dragging: [] };
  const exercises = ["a", "b", "c"].map((id) => ({
    id,
    name: id,
    sets: 3,
    reps: 10,
    rest: 60,
  }));
  const element = (type, props) => ({ type, props });
  const hook = (initial) => {
    const index = cursor++;
    if (!(index in slots)) slots[index] = initial;
    return index;
  };
  const deps = {
    react: {
      useRef: (initial) => slots[hook({ current: initial })],
      useState: (initial) => {
        const index = hook(initial);
        const own = slots;
        return [
          own[index],
          (value) => {
            own[index] = value;
          },
        ];
      },
    },
    "react/jsx-runtime": { jsx: element, jsxs: element },
    "@expo/vector-icons": { Feather: "Feather" },
    "@/theme/app-theme": { useAppThemeColor: (key) => key },
    "react-native": {
      View: "View",
      Text: "Text",
      PanResponder: { create: (handlers) => ({ panHandlers: handlers }) },
      Animated: {
        View: "AnimatedView",
        Value: class {
          setValue() {}
        },
      },
    },
  };
  const module = { exports: {} };
  const source = fs.readFileSync(
    path.join(__dirname, "../src/components/workout-exercise-list.tsx"),
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
    require: (name) => {
      assert.ok(name in deps, `Unexpected dependency ${name}`);
      return deps[name];
    },
  });
  const renderComponent = (key, fn, props) => {
    if (!instances.has(key)) instances.set(key, []);
    slots = instances.get(key);
    cursor = 0;
    return fn(props);
  };
  const nodes = (node) =>
    !node || typeof node !== "object"
      ? []
      : Array.isArray(node)
        ? node.flatMap(nodes)
        : [node, ...nodes(node.props?.children)];
  const render = () => {
    const tree = renderComponent("list", module.exports.default, {
      exercises,
      disabled,
      onReorder: (ids) => calls.orders.push(Array.from(ids)),
      onDraggingChange: (value) => calls.dragging.push(value),
    });
    return nodes(tree)
      .filter((node) => typeof node.type === "function")
      .map((node, index) => {
        const row = renderComponent(
          node.props.exercise.id,
          node.type,
          node.props,
        );
        row.props.onLayout({
          nativeEvent: { layout: { y: index * 64, height: 64 } },
        });
        return nodes(row).find(
          (item) => item.props?.accessibilityRole === "adjustable",
        ).props;
      });
  };
  return { render, calls };
}

test("dragging a handle drops the exercise at the new position", () => {
  const app = setup();
  app.render()[0].onPanResponderGrant();
  app.render()[0].onPanResponderMove({}, { dy: 140 });
  app.render()[0].onPanResponderRelease();
  assert.deepEqual(app.calls.orders, [["b", "c", "a"]]);
  assert.deepEqual(app.calls.dragging, [true, false]);
});

test("cancelled and stationary drags leave exercise order intact", () => {
  const app = setup();
  app.render()[1].onPanResponderGrant();
  app.render()[1].onPanResponderMove({}, { dy: -100 });
  app.render()[1].onPanResponderTerminate();
  app.render()[0].onPanResponderGrant();
  app.render()[0].onPanResponderRelease();
  assert.equal(app.calls.orders.length, 0);
});

test("accessibility actions reorder exercises and saving disables reordering", () => {
  const app = setup();
  app
    .render()[0]
    .onAccessibilityAction({ nativeEvent: { actionName: "increment" } });
  assert.deepEqual(app.calls.orders, [["b", "a", "c"]]);
  const saving = setup(true);
  const handle = saving.render()[0];
  assert.equal(handle.onStartShouldSetPanResponder(), false);
  handle.onAccessibilityAction({ nativeEvent: { actionName: "increment" } });
  assert.equal(saving.calls.orders.length, 0);
});
