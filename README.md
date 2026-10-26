# LiftWise Android private recent-app previews

This is an Expo config plugin for Android. Android 13+ (API 33+) is instructed **not** to create recent-app screenshots. The native AppTheme window background becomes a dark (#0B0F19) background with the current `assets/images/splash-logo-white.png` positioned at the center. Android launchers/OEMs determine whether to show that window background, a solid placeholder, or another system image; the logo is not guaranteed on every device.

## Install

1. Copy `plugins/with-private-recents.js` into the LiftWise project root's `plugins` folder.
2. Keep the existing `assets/images/splash-logo-white.png` file. It must be a valid PNG; the plugin copies it into Android native resources during prebuild.
3. Add `"./plugins/with-private-recents"` as the **last entry** of the `expo.plugins` array in `app.json`.
4. Remove any older overlapping `with-private-app-preview` plugin from `app.json`.
5. Rebuild the Android project. If building from native Gradle in GitHub Actions, run `npx expo prebuild --platform android --no-install` first, or commit generated native changes.

Example commands:

```bash
npx expo prebuild --platform android
npx expo run:android
```

## Limitations

- On Android 13+, this prevents typical stored task screenshots for Recents, but appearance depends on OEM/launcher. Some edge cases (e.g., a live task surface or system permission prompts) may still show content; verify on real devices.
- On Android 12 and older, this **does not** guarantee snapshot privacy. Don't call it protected on those devices. `FLAG_SECURE` offers stronger privacy but disables ordinary screenshots while set.
- Normal screenshots remain allowed on Android 13+.
- Changing `AppTheme`'s `windowBackground` can also affect the background briefly visible while the native app opens or when app views are transparent.
- This needs a native rebuild; Metro cache resets alone won't apply the plugin.
