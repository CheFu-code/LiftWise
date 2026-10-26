
import { Platform } from "react-native";
import { readSession } from "./chefu-session";
import { reminderDays, type Reminder } from "./reminder-schedule";

export type { Reminder } from "./reminder-schedule";

const IDENTIFIER = "liftwise-daily-workout";
const WEEKLY = "liftwise-weekly-workout-";
const REST = "liftwise-rest-";
const TEST = "liftwise-notification-test";

const AUDIBLE_CHANNEL = "workout-alerts-audible-v2";
const SILENT_CHANNEL = "workout-alerts-silent-v2";

let writes: Promise<unknown> = Promise.resolve();
let channels: Promise<void> | undefined;

// Choose the correct Android notification channel.
const channel = (sound: boolean) =>
    sound ? AUDIBLE_CHANNEL : SILENT_CHANNEL;

// Android uses the channel's system notification sound.
// iOS uses its built-in default notification sound.
const notificationSound = (enabled: boolean) =>
    enabled
        ? Platform.OS === "ios"
            ? ("default" as const)
            : undefined
        : false;

// Initialize native notifications and Android channels.
async function nativeNotifications() {
    if (Platform.OS === "web") return null;

    const notifications = await import("expo-notifications");

    if (Platform.OS === "android") {
        channels ??= (async () => {
            await notifications.setNotificationChannelAsync(
                AUDIBLE_CHANNEL,
                {
                    name: "Workout alerts with sound",
                    importance:
                        notifications.AndroidImportance.HIGH,
                    enableVibrate: true,
                    vibrationPattern: [0, 250, 250, 250],
                }
            );

            await notifications.setNotificationChannelAsync(
                SILENT_CHANNEL,
                {
                    name: "Silent workout alerts",
                    importance:
                        notifications.AndroidImportance.DEFAULT,
                    sound: null,
                    enableVibrate: false,
                }
            );
        })().catch((error) => {
            channels = undefined;
            throw error;
        });

        await channels;
    }

    return notifications;
}

// Check or request notification permissions.
export async function reminderPermission(request = false) {
    const notifications = await nativeNotifications();

    if (!notifications) return false;

    let permission = await notifications.getPermissionsAsync();

    if (!permission.granted && request) {
        permission = await notifications.requestPermissionsAsync();
    }

    return (
        permission.granted ||
        permission.ios?.status ===
        notifications.IosAuthorizationStatus.PROVISIONAL
    );
}

// Synchronize daily and weekly workout reminders.
export function syncWorkoutReminder(
    userId?: string,
    reminder?: Reminder
) {
    const write = writes.catch(() => undefined).then(async () => {
        const notifications = await nativeNotifications();

        if (
            !notifications ||
            (await readSession())?.user.uid !== userId
        ) {
            return;
        }

        const scheduled =
            await notifications.getAllScheduledNotificationsAsync();

        // Remove alerts belonging to previous accounts
        // and orphaned test notifications.
        for (const item of scheduled) {
            if (
                (item.identifier.startsWith(REST) ||
                    item.identifier === TEST) &&
                (!userId ||
                    item.content.data?.userId !== userId ||
                    (item.identifier.startsWith(REST) &&
                        !reminder?.restAlerts))
            ) {
                await notifications.cancelScheduledNotificationAsync(
                    item.identifier
                );
            }
        }

        const existing = scheduled.filter(
            (item) =>
                item.identifier === IDENTIFIER ||
                item.identifier.startsWith(WEEKLY)
        );

        const days = reminderDays(reminder);

        const enabled = Boolean(
            userId &&
            reminder?.enabled &&
            days.length &&
            (await reminderPermission())
        );

        const count = enabled
            ? days.length === 7
                ? 1
                : days.length
            : 0;

        // Versioning forces old reminders to be recreated
        // using the new Android notification channels.
        const signature = JSON.stringify([
            "notifications-v2",
            userId,
            reminder?.hour,
            reminder?.minute,
            [...days].sort(),
            reminder?.sound !== false,
            new Date().getTimezoneOffset(),
        ]);

        if (
            existing.length === count &&
            existing.every(
                (item) =>
                    item.content.data?.signature === signature
            )
        ) {
            return;
        }

        // Cancel existing daily and weekly reminders.
        for (const item of existing) {
            await notifications.cancelScheduledNotificationAsync(
                item.identifier
            );
        }

        if (!enabled || !reminder) return;

        const sound = reminder.sound !== false;

        const content = {
            title: "Time for your next session",
            body: "Open LiftWise and make your next rep count.",
            sound: notificationSound(sound),
            data: {
                screen: "workouts",
                userId,
                audible: sound,
                signature,
            },
        };

        try {
            for (const day of days.length === 7 ? [0] : days) {
                if (
                    (await readSession())?.user.uid !== userId
                ) {
                    break;
                }

                await notifications.scheduleNotificationAsync({
                    identifier: day
                        ? `${WEEKLY}${day}`
                        : IDENTIFIER,
                    content,
                    trigger: day
                        ? {
                            type: notifications
                                .SchedulableTriggerInputTypes
                                .WEEKLY,
                            weekday: day,
                            hour: reminder.hour,
                            minute: reminder.minute,
                            channelId: channel(sound),
                        }
                        : {
                            type: notifications
                                .SchedulableTriggerInputTypes
                                .DAILY,
                            hour: reminder.hour,
                            minute: reminder.minute,
                            channelId: channel(sound),
                        },
                });
            }
        } catch (error) {
            // Clean up partially scheduled reminders.
            for (const id of [
                IDENTIFIER,
                ...days.map((day) => `${WEEKLY}${day}`),
            ]) {
                await notifications.cancelScheduledNotificationAsync(
                    id
                );
            }

            throw error;
        }
    });

    writes = write;
    return write;
}

// Check whether a workout reminder is scheduled.
export async function reminderScheduled() {
    const notifications = await nativeNotifications();

    if (!notifications) return false;

    const scheduled =
        await notifications.getAllScheduledNotificationsAsync();

    return scheduled.some(
        (item) =>
            item.identifier === IDENTIFIER ||
            item.identifier.startsWith(WEEKLY)
    );
}

// Schedule or cancel a rest timer notification.
export function syncRestAlert(
    userId: string | undefined,
    key: string,
    endsAt?: number,
    sound = true
) {
    const write = writes.catch(() => undefined).then(async () => {
        const notifications = await nativeNotifications();

        if (!notifications) return;

        const identifier = `${REST}${key}`;

        await notifications.cancelScheduledNotificationAsync(
            identifier
        );

        if (
            !userId ||
            (await readSession())?.user.uid !== userId
        ) {
            return;
        }

        if (!endsAt) {
            // Remove older native rest alerts belonging
            // to the current account.
            const scheduled =
                await notifications.getAllScheduledNotificationsAsync();

            for (const item of scheduled) {
                if (
                    item.identifier.startsWith(REST) &&
                    item.content.data?.userId === userId
                ) {
                    await notifications.cancelScheduledNotificationAsync(
                        item.identifier
                    );
                }
            }

            return;
        }

        if (
            endsAt <= Date.now() ||
            !(await reminderPermission())
        ) {
            return;
        }

        // Only one active rest timer can notify.
        const scheduled =
            await notifications.getAllScheduledNotificationsAsync();

        for (const item of scheduled) {
            if (
                item.identifier.startsWith(REST) &&
                item.identifier !== identifier
            ) {
                await notifications.cancelScheduledNotificationAsync(
                    item.identifier
                );
            }
        }

        if (
            (await readSession())?.user.uid !== userId
        ) {
            return;
        }

        await notifications.scheduleNotificationAsync({
            identifier,
            content: {
                title: "Rest complete",
                body: "Ready for your next set?",
                sound: notificationSound(sound),
                data: {
                    kind: "rest",
                    userId,
                    audible: sound,
                },
            },
            trigger: {
                type: notifications.SchedulableTriggerInputTypes.DATE,
                date: new Date(endsAt),
                channelId: channel(sound),
            },
        });
    });

    writes = write;
    return write;
}

// Send a test notification after 3 seconds.
export function sendTestNotification(
    userId: string,
    sound: boolean
) {
    const write = writes.catch(() => undefined).then(async () => {
        const notifications = await nativeNotifications();

        if (
            !notifications ||
            !(await reminderPermission(true))
        ) {
            throw new Error(
                "Allow notifications in device settings first."
            );
        }

        if (
            (await readSession())?.user.uid !== userId
        ) {
            throw new Error(
                "Sign in again to test notifications."
            );
        }

        await notifications.cancelScheduledNotificationAsync(
            TEST
        );

        await notifications.scheduleNotificationAsync({
            identifier: TEST,
            content: {
                title: "You're all set",
                body: "LiftWise notifications are working on this device.",
                sound: notificationSound(sound),
                data: {
                    userId,
                    audible: sound,
                },
            },
            trigger: {
                type: notifications
                    .SchedulableTriggerInputTypes
                    .TIME_INTERVAL,
                seconds: 3,
                repeats: false,
                channelId: channel(sound),
            },
        });
    });

    writes = write;
    return write;
}
