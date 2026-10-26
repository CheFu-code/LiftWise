const fs = require("node:fs/promises");
const path = require("node:path");
const {
    withMainActivity,
    withAndroidStyles,
    withDangerousMod,
} = require("expo/config-plugins");

// Uses the existing transparent LiftWise splash logo.
const LOGO_RELATIVE_PATH = "assets/images/splash-logo-white.png";
const DRAWABLE_NAME = "liftwise_private_recents";
const LOGO_NAME = "liftwise_private_recents_logo";
const DARK_BACKGROUND = "#0B0F19";
const NATIVE_MARKER = "// LiftWise: protect recent-app snapshots (Android 13+).";

function withPrivateRecents(config) {
    // Block real task snapshots on Android 13+ without disabling ordinary screenshots.
    config = withMainActivity(config, (mod) => {
        const { contents, language } = mod.modResults;
        if (language !== "kt") {
            throw new Error("LiftWise recent-app plugin expects a Kotlin MainActivity.kt.");
        }
        if (contents.includes(NATIVE_MARKER)) return mod;

        const onCreate = /override\s+fun\s+onCreate\s*\(\s*savedInstanceState\s*:\s*Bundle\?\s*\)\s*\{/;
        const found = onCreate.exec(contents);
        if (!found) {
            throw new Error("Could not locate MainActivity.onCreate in Expo's Android template.");
        }

        const start = found.index + found[0].length;
        const tail = contents.slice(start);
        const superCall = /super\.onCreate\(\s*(?:null|savedInstanceState)\s*\)/.exec(tail);
        if (!superCall || superCall.index > 1000) {
            throw new Error("Could not locate MainActivity.onCreate's super call.");
        }

        const at = start + superCall.index + superCall[0].length;
        const injection = `

    ${NATIVE_MARKER}
    if (android.os.Build.VERSION.SDK_INT >= 33) {
      setRecentsScreenshotEnabled(false)
    }`;

        mod.modResults.contents = contents.slice(0, at) + injection + contents.slice(at);
        return mod;
    });

    // Android may use the theme's window background as its task placeholder.
    // Note: Android/OEM launchers control whether this artwork appears.
    config = withAndroidStyles(config, (mod) => {
        const styles = mod.modResults.resources.style || [];
        const appTheme = styles.find((style) => style.$?.name === "AppTheme");
        if (!appTheme) {
            throw new Error("Could not locate the Android AppTheme in styles.xml.");
        }

        appTheme.item = appTheme.item || [];
        const name = "android:windowBackground";
        const newValue = `@drawable/${DRAWABLE_NAME}`;
        const existing = appTheme.item.find((item) => item.$?.name === name);
        if (existing) existing._ = newValue;
        else appTheme.item.push({ $: { name }, _: newValue });
        return mod;
    });

    // Bundle the existing logo and generate a drawable for Android's fallback view.
    config = withDangerousMod(config, ["android", async (mod) => {
        const logoFile = path.join(mod.modRequest.projectRoot, LOGO_RELATIVE_PATH);
        let png;
        try {
            png = await fs.readFile(logoFile);
        } catch {
            throw new Error(`Missing LiftWise image: ${LOGO_RELATIVE_PATH}`);
        }
        const pngMagic = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
        if (png.length < 24 || !png.subarray(0, 8).equals(pngMagic)) {
            throw new Error("The LiftWise recent-app logo must be a valid PNG image.");
        }

        const originalWidth = png.readUInt32BE(16);
        const originalHeight = png.readUInt32BE(20);
        if (!originalWidth || !originalHeight) throw new Error("Invalid PNG dimensions.");
        const scale = Math.min(188 / originalWidth, 116 / originalHeight);
        const widthDp = Math.max(1, Math.round(originalWidth * scale));
        const heightDp = Math.max(1, Math.round(originalHeight * scale));

        const res = path.join(mod.modRequest.platformProjectRoot, "app", "src", "main", "res");
        const drawable = path.join(res, "drawable");
        const nodpi = path.join(res, "drawable-nodpi");
        await fs.mkdir(drawable, { recursive: true });
        await fs.mkdir(nodpi, { recursive: true });
        await fs.writeFile(path.join(nodpi, `${LOGO_NAME}.png`), png);

        const xml = `<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
  <item>
    <shape android:shape="rectangle">
      <solid android:color="${DARK_BACKGROUND}" />
    </shape>
  </item>
  <item android:gravity="center" android:width="${widthDp}dp" android:height="${heightDp}dp">
    <bitmap android:src="@drawable/${LOGO_NAME}" android:gravity="fill" android:filter="true" />
  </item>
</layer-list>
`;
        await fs.writeFile(path.join(drawable, `${DRAWABLE_NAME}.xml`), xml, "utf8");
        return mod;
    }]);

    return config;
}

module.exports = withPrivateRecents;
