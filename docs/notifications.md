# Notification preferences

Workout reminders use local Expo Notifications schedules. Saving preferences updates the existing SSO app profile; delivery, previews, tests and individual rest timers make no server requests.

Preferences: enabled, hour/minute in device local time, optional days (Expo weekday numbering: Sunday=1 through Saturday=7), sound, and restAlerts. Existing profiles without new fields keep daily scheduling and audible reminders; rest alerts default off. Enabled workout reminders require at least one unique valid weekday. Both profile POST and PATCH validate these fields.

All seven days use one daily schedule. Selected days use one weekly schedule per day. Stable identifiers and a schedule signature prevent duplicates and avoid rescheduling unchanged settings; the signature includes the current timezone offset so returning after a timezone/DST change reconciles the schedule. Changing preferences cancels the old schedule. Account changes and sign-out cancel old-user reminders, rest alerts and tests. Device scheduling completes before server preferences are saved, with rollback attempted on failure.

Rest alerts are native one-shot date notifications scheduled at rest start; they do not depend on background JavaScript ticking. Foreground presentation is suppressed for rest alerts because the rest timer is already visible. Skipping rest or leaving the active workout cancels its alert; starting a new timer removes orphaned rest schedules for that account. Other reminder/test notifications can present in the foreground. Silent content and separate silent/audible Android channels implement the sound preference, subject to device Focus, silent mode and user channel settings.

The settings page is split into:

- src/app/(app)/notifications.tsx: page layout and actions.
- src/hooks/use-notification-settings.ts: draft, permissions, save/rollback and device checks.
- src/components/notifications/notification-preferences.tsx: reminder and alert controls.
- src/components/notifications/reminder-time-picker.native.tsx: native Android dialog and iOS picker.
- src/components/notifications/reminder-time-picker.tsx: web fallback.
- src/lib/reminder-schedule.ts: weekday definitions and local next-reminder calculation.
- src/lib/workout-reminders.ts: serialized native scheduling and account ownership checks.

Added the Expo-compatible @react-native-community/datetimepicker dependency and config plugin, plus Android SCHEDULE_EXACT_ALARM permission. A new native binary is required; no native build was run here. Android 12+ exact timing also depends on the user's Alarms & reminders access; Expo falls back to inexact scheduling when that access is unavailable. Power-saving settings may delay alerts. Test physical-device delivery in foreground/background, with sound off/on, permission denial, timezone changes, sign-out, rest restart/skip and workout exit. iOS/Android operating-system overrides cannot be bypassed.

Verification: app typecheck, 81 app tests, 34 backend LiftWise tests, backend build. Tests cover legacy daily behavior, selected-day schedules, schedule deduplication and failure cleanup, sound/channel selection, next weekdays, account isolation, native rest deadlines, background timer behavior, skip/unmount cancellation, test scheduling and foreground presentation. No web build or production deployment was performed.

Sentry runtime initialization, integrations and root wrapping now run only when __DEV__ is false. Release configuration and source-map build tooling remain available.
