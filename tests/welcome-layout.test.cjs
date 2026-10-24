const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const loaded = { exports: {} };
const source = fs.readFileSync(
  require.resolve("../src/components/welcome/welcome.layout.ts"),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
vm.runInNewContext(compiled, { module: loaded, exports: loaded.exports });
const { getWelcomeLayout } = loaded.exports;

test("content and rotated illustration fit small phones, tablets, and desktop sizes", () => {
  for (let width = 240; width <= 2000; width += 20) {
    for (const height of [320, 568, 844, 1024]) {
      for (const fontScale of [1, 1.3, 1.6, 2, 3]) {
        const insets = { top: 44, bottom: 34, left: 12, right: 12 };
        const layout = getWelcomeLayout(width, height, fontScale, insets);
        assert.ok(layout.contentWidth <= width - insets.left - insets.right);
        assert.ok(layout.columnWidth > 0);
        assert.ok(layout.columnWidth <= layout.innerWidth);
        if (layout.wide)
          assert.ok(
            layout.columnWidth * 2 + layout.columnGap <=
              layout.innerWidth + 0.001,
          );
        const radians = (26 * Math.PI) / 180;
        const artWidth =
          (254 * Math.cos(radians) + 128 * Math.sin(radians)) * layout.artScale;
        const artHeight =
          (254 * Math.sin(radians) + 128 * Math.cos(radians)) * layout.artScale;
        assert.ok(artWidth <= layout.columnWidth - layout.heroPadding * 2);
        assert.ok(artHeight <= layout.illustrationHeight);
        assert.ok(layout.buttonMinHeight >= 48);
      }
    }
  }
});

test("short landscape screens and large accessibility text get a scrollable single column", () => {
  assert.equal(getWelcomeLayout(1024, 390).wide, false);
  assert.equal(getWelcomeLayout(1024, 844, 2).wide, false);
  assert.equal(getWelcomeLayout(1440, 900).wide, true);
});

test("resizing updates content, text, spacing and illustration without unbounded scaling", () => {
  const phone = getWelcomeLayout(320, 568);
  const tablet = getWelcomeLayout(768, 1024);
  const desktop = getWelcomeLayout(1440, 900);
  assert.ok(tablet.headlineSize > phone.headlineSize);
  assert.ok(tablet.artScale > phone.artScale);
  assert.ok(tablet.padding > phone.padding);
  assert.equal(desktop.contentWidth, getWelcomeLayout(3000, 1200).contentWidth);
  assert.ok(desktop.headlineSize <= 60);
});
