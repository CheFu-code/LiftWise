import { Platform } from "react-native";
import { readSession } from "./chefu-session";
import { reminderDays, type Reminder } from "./reminder-schedule";
export type { Reminder } from "./reminder-schedule";

const IDENTIFIER = "liftwise-daily-workout";
const WEEKLY = "liftwise-weekly-workout-";
const REST = "liftwise-rest-";
const TEST = "liftwise-notification-test";
let writes: Promise<unknown> = Promise.resolve();
let channels: Promise<void> | undefined;

async function nativeNotifications() {
  if (Platform.OS === "web") return null;
  const notifications = await import("expo-notifications");
  if (Platform.OS === "android") {
    channels ??= (async () => {
      await notifications.setNotificationChannelAsync("workout-alerts-audible-v1", {
        name: "Workout alerts with sound", importance: notifications.AndroidImportance.DEFAULT, sound: "default",
      });
      await notifications.setNotificationChannelAsync("workout-alerts-silent-v1", {
        name: "Silent workout alerts", importance: notifications.AndroidImportance.DEFAULT, sound: null, enableVibrate: false,
      });
    })().catch(error => { channels = undefined; throw error; });
    await channels;
  }
  return notifications;
}
const channel = (sound: boolean) => sound ? "workout-alerts-audible-v1" : "workout-alerts-silent-v1";
export async function reminderPermission(request = false) {
  const notifications = await nativeNotifications();
  if (!notifications) return false;
  let permission = await notifications.getPermissionsAsync();
  if (!permission.granted && request) permission = await notifications.requestPermissionsAsync();
  return permission.granted || permission.ios?.status === notifications.IosAuthorizationStatus.PROVISIONAL;
}
export function syncWorkoutReminder(userId?: string, reminder?: Reminder) {
  const write = writes.catch(() => undefined).then(async () => {
    const notifications = await nativeNotifications();
    if (!notifications || (await readSession())?.user.uid !== userId) return;
    const scheduled = await notifications.getAllScheduledNotificationsAsync();
    // Remove alerts owned by the previous account, as well as orphaned test alerts.
    for (const item of scheduled) {
      if ((item.identifier.startsWith(REST) || item.identifier === TEST) &&
          (!userId || item.content.data?.userId !== userId || (item.identifier.startsWith(REST) && !reminder?.restAlerts)))
        await notifications.cancelScheduledNotificationAsync(item.identifier);
    }
    const existing = scheduled.filter(item => item.identifier === IDENTIFIER || item.identifier.startsWith(WEEKLY));
    const days = reminderDays(reminder);
    const enabled = Boolean(userId && reminder?.enabled && days.length && await reminderPermission());
    const count = enabled ? (days.length === 7 ? 1 : days.length) : 0;
    const signature = JSON.stringify([userId, reminder?.hour, reminder?.minute, [...days].sort(), reminder?.sound !== false, new Date().getTimezoneOffset()]);
    if (existing.length === count && existing.every(item => item.content.data?.signature === signature)) return;
    for (const item of existing) await notifications.cancelScheduledNotificationAsync(item.identifier);
    if (!enabled || !reminder) return;
    const sound = reminder.sound !== false;
    const content = {
      title: "Time for your next session", body: "Open LiftWise and make your next rep count.",
      sound: sound ? "default" as const : false,
      data: { screen: "workouts", userId, audible: sound, signature },
    };
    try {
      for (const day of days.length === 7 ? [0] : days) {
        if ((await readSession())?.user.uid !== userId) break;
        await notifications.scheduleNotificationAsync({
          identifier: day ? `${WEEKLY}${day}` : IDENTIFIER,
          content,
          trigger: day ? {
            type: notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: day,
            hour: reminder.hour, minute: reminder.minute, channelId: channel(sound),
          } : {
            type: notifications.SchedulableTriggerInputTypes.DAILY,
            hour: reminder.hour, minute: reminder.minute, channelId: channel(sound),
          },
        });
      }
    } catch (error) {
      // A failed partial weekly schedule must not appear successfully configured.
      for (const id of [IDENTIFIER, ...days.map(day => `${WEEKLY}${day}`)]) await notifications.cancelScheduledNotificationAsync(id);
      throw error;
    }
  });
  writes = write;
  return write;
}
export async function reminderScheduled() {
  const notifications = await nativeNotifications();
  return notifications ? (await notifications.getAllScheduledNotificationsAsync()).some(item => item.identifier === IDENTIFIER || item.identifier.startsWith(WEEKLY)) : false;
}
export function syncRestAlert(userId: string | undefined, key: string, endsAt?: number, sound = true) {
  const write = writes.catch(() => undefined).then(async () => {
    const notifications = await nativeNotifications();
    if (!notifications) return;
    const identifier = `${REST}${key}`;
    await notifications.cancelScheduledNotificationAsync(identifier);
    if (!userId || (await readSession())?.user.uid !== userId) return;
    if (!endsAt) {
      // A newly opened timer has no active rest to recover. Remove older
      // native alerts left behind by a previous process for this account.
      for (const item of await notifications.getAllScheduledNotificationsAsync())
        if (item.identifier.startsWith(REST) && item.content.data?.userId === userId) await notifications.cancelScheduledNotificationAsync(item.identifier);
      return;
    }
    if (endsAt <= Date.now() || !(await reminderPermission())) return;
    // Only one active rest timer can notify, including after process recovery.
    for (const item of await notifications.getAllScheduledNotificationsAsync())
      if (item.identifier.startsWith(REST) && item.identifier !== identifier) await notifications.cancelScheduledNotificationAsync(item.identifier);
    if ((await readSession())?.user.uid !== userId) return;
    await notifications.scheduleNotificationAsync({
      identifier,
      content: { title: "Rest complete", body: "Ready for your next set?", sound: sound ? "default" : false, data: { kind: "rest", userId, audible: sound } },
      trigger: { type: notifications.SchedulableTriggerInputTypes.DATE, date: new Date(endsAt), channelId: channel(sound) },
    });
  });
  writes = write;
  return write;
}
export function sendTestNotification(userId: string, sound: boolean) {
  const write = writes.catch(() => undefined).then(async () => {
  const notifications = await nativeNotifications();
  if (!notifications || !(await reminderPermission(true))) throw new Error("Allow notifications in device settings first.");
  if ((await readSession())?.user.uid !== userId) throw new Error("Sign in again to test notifications.");
  await notifications.cancelScheduledNotificationAsync(TEST);
  await notifications.scheduleNotificationAsync({
    identifier: TEST,
    content: { title: "You're all set", body: "LiftWise notifications are working on this device.", sound: sound ? "default" : false, data: { userId, audible: sound } },
    trigger: { type: notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 3, repeats: false, channelId: channel(sound) },
  });
  });
  writes = write;
  return write;
}
