import { useEffect } from "react";
import { AppState, Platform } from "react-native";
import { useAuth } from "@/lib/chefu-auth";
import { syncWorkoutReminder } from "@/lib/workout-reminders";

export default function WorkoutReminderSync() {
  const { session } = useAuth();
  const uid = session?.user.uid;
  const reminder = session?.onboardingProfile?.reminder;
  const daysKey = reminder?.days?.join(",");
  useEffect(() => {
    const sync = () => {
      void syncWorkoutReminder(uid, reminder).catch(() => {
        // Device permission and scheduling errors are shown in Notifications settings.
      });
    };
    sync();
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") sync();
    });
    return () => listener.remove();
  }, [uid, reminder?.enabled, reminder?.hour, reminder?.minute, daysKey, reminder?.sound, reminder?.restAlerts]);
  useEffect(() => {
    if (Platform.OS === "web") return;
    let active = true;
    void import("expo-notifications")
      .then((notifications) => {
        if (active)
          notifications.setNotificationHandler({
            handleNotification: async (notification) => ({
              shouldShowBanner: notification.request.content.data?.kind !== "rest" || AppState.currentState !== "active",
              shouldShowList: notification.request.content.data?.kind !== "rest" || AppState.currentState !== "active",
              shouldPlaySound: notification.request.content.data?.audible !== false && (notification.request.content.data?.kind !== "rest" || AppState.currentState !== "active"),
              shouldSetBadge: false,
            }),
          });
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  return null;
}
