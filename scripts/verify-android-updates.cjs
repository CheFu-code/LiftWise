const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { AndroidConfig } = require("expo/config-plugins");

function verify(manifest, strings, config) {
    const metadata = manifest.manifest.application[0]["meta-data"] ?? [];
    const value = name => metadata.find(item => item.$["android:name"] === name)?.$["android:value"];
    assert.equal(value("expo.modules.updates.ENABLED"), "true", "Android OTA is disabled. Run expo prebuild before building.");
    assert.equal(value("expo.modules.updates.EXPO_UPDATE_URL"), config.updates.url, "Android update URL does not match app.json.");
    const headers = JSON.parse(value("expo.modules.updates.UPDATES_CONFIGURATION_REQUEST_HEADERS_KEY") ?? "{}");
    assert.equal(headers["expo-channel-name"], "production", "Release build must request the production OTA channel.");
    const rawRuntime = value("expo.modules.updates.EXPO_RUNTIME_VERSION");
    const runtime = rawRuntime?.startsWith("@string/")
        ? strings.resources.string.find(item => item.$.name === rawRuntime.slice(8))?._
        : rawRuntime;
    assert.equal(runtime, config.version, "Android runtime must match the appVersion runtime policy.");
    return runtime;
}

module.exports = { verify };
if (require.main === module) {
    const root = path.resolve(__dirname, "..");
    Promise.all([
        AndroidConfig.Manifest.readAndroidManifestAsync(path.join(root, "android/app/src/main/AndroidManifest.xml")),
        AndroidConfig.Resources.readResourcesXMLAsync({ path: path.join(root, "android/app/src/main/res/values/strings.xml") }),
    ]).then(([manifest, strings]) => {
        const config = JSON.parse(fs.readFileSync(path.join(root, "app.json"), "utf8")).expo;
        console.log(`Android OTA verified: production channel, runtime ${verify(manifest, strings, config)}.`);
    }).catch(error => {
        console.error(error.message);
        process.exitCode = 1;
    });
}
