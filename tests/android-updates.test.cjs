const { test } = require("node:test");
const assert = require("node:assert/strict");
const { verify } = require("../scripts/verify-android-updates.cjs");

const config = { version: "1.0.1", updates: { url: "https://u.expo.dev/test-project" } };
function fixture() {
  const entries = {
    ENABLED: "true",
    EXPO_UPDATE_URL: config.updates.url,
    EXPO_RUNTIME_VERSION: "@string/expo_runtime_version",
    UPDATES_CONFIGURATION_REQUEST_HEADERS_KEY: JSON.stringify({ "expo-channel-name": "production" }),
  };
  const manifest = { manifest: { application: [{ "meta-data": Object.entries(entries).map(([key, value]) => ({
    $: { "android:name": `expo.modules.updates.${key}`, "android:value": value },
  })) }] } };
  const strings = { resources: { string: [{ $: { name: "expo_runtime_version" }, _: config.version }] } };
  return { manifest, strings };
}

test("release guard accepts native OTA configuration matching production and appVersion", () => {
  const { manifest, strings } = fixture();
  assert.equal(verify(manifest, strings, config), config.version);
});

test("release guard rejects disabled OTA, missing channels, wrong projects and incompatible runtimes", () => {
  for (const [key, value, message] of [
    ["ENABLED", "false", /OTA is disabled/],
    ["EXPO_UPDATE_URL", "https://u.expo.dev/other-project", /update URL/],
    ["EXPO_RUNTIME_VERSION", "1.0.0", /runtime/],
    ["UPDATES_CONFIGURATION_REQUEST_HEADERS_KEY", "{}", /production OTA channel/],
    ["UPDATES_CONFIGURATION_REQUEST_HEADERS_KEY", '{"expo-channel-name":"preview"}', /production OTA channel/],
  ]) {
    const { manifest, strings } = fixture();
    manifest.manifest.application[0]["meta-data"].find(item => item.$["android:name"] === `expo.modules.updates.${key}`).$["android:value"] = value;
    assert.throws(() => verify(manifest, strings, config), message);
  }
});
