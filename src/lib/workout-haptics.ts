import { AppState, Platform } from "react-native";
import { getLocalWorkoutPreferences } from "./local-workout-preferences";

export function workoutHaptic(kind: "set" | "rest" | "finish") {
  const preferences = getLocalWorkoutPreferences();
  if (!preferences.ready || !preferences.haptics || Platform.OS === "web" || AppState.currentState !== "active") return;
  void import("expo-haptics").then(haptics => {
    if (kind === "set") return haptics.selectionAsync();
    if (kind === "rest") return haptics.impactAsync(haptics.ImpactFeedbackStyle.Medium);
    return haptics.notificationAsync(haptics.NotificationFeedbackType.Success);
  }).catch(() => undefined);
}
