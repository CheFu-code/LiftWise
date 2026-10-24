import { Platform } from "react-native";
import { readSession } from "./chefu-session";

export type Reminder = { enabled: boolean; hour: number; minute: number };
const IDENTIFIER = "liftwise-daily-workout";
let writes: Promise<unknown> = Promise.resolve();

async function nativeNotifications() {
  if (Platform.OS === "web") return null;
  const notifications = await import("expo-notifications");
  if (Platform.OS === "android")
    await notifications.setNotificationChannelAsync("workout-reminders", {
      name: "Workout reminders",
      importance: notifications.AndroidImportance.DEFAULT,
    });
  return notifications;
}
export async function reminderPermission(request = false) {
  const notifications = await nativeNotifications();
  if (!notifications) return false;
  let permission = await notifications.getPermissionsAsync();
  if (!permission.granted && request)
    permission = await notifications.requestPermissionsAsync();
  return (
    permission.granted ||
    permission.ios?.status === notifications.IosAuthorizationStatus.PROVISIONAL
  );
}
export function syncWorkoutReminder(userId?: string, reminder?: Reminder) {
  const write = writes
    .catch(() => undefined)
    .then(async () => {
      const notifications = await nativeNotifications();
      if (!notifications) return;
      const current = await readSession();
      if (current?.user.uid !== userId) return;
      await notifications.cancelScheduledNotificationAsync(IDENTIFIER);
      if (!userId || !reminder?.enabled || !(await reminderPermission()))
        return;
      if ((await readSession())?.user.uid !== userId) return;
      await notifications.scheduleNotificationAsync({
        identifier: IDENTIFIER,
        content: {
          title: "Time for your next session",
          body: "Open LiftWise and make your next rep count.",
          sound: "default",
          data: { screen: "workouts" },
        },
        trigger: {
          type: notifications.SchedulableTriggerInputTypes.DAILY,
          hour: reminder.hour,
          minute: reminder.minute,
          channelId: "workout-reminders",
        },
      });
    });
  writes = write;
  return write;
}

export async function reminderScheduled() {
  const notifications = await nativeNotifications();
  return notifications
    ? (await notifications.getAllScheduledNotificationsAsync()).some(
        (item) => item.identifier === IDENTIFIER,
      )
    : false;
}
