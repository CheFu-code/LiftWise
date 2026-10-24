import { useCallback, useState, useSyncExternalStore } from "react";
import { useFocusEffect } from "expo-router";
import {
  getToast,
  subscribeToast,
  showToast as publishToast,
  dismissToast,
} from "@/lib/toast-store";
import {
  AccessibilityInfo,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Pressable from "@/components/ui/guarded-pressable";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppThemeColor } from "@/theme/app-theme";

type ToastMessage = NonNullable<ReturnType<typeof getToast>>;

export function useToast() {
  const toast = useSyncExternalStore(subscribeToast, getToast, getToast);
  const showToast = useCallback((message: string) => {
    publishToast(message);
    if (Platform.OS === "ios")
      AccessibilityInfo.announceForAccessibility(message);
  }, []);
  return { toast, showToast, dismissToast };
}

export function ToastHost() {
  const { toast, dismissToast } = useToast();
  const [focused, setFocused] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  return focused ? <Toast toast={toast} onDismiss={dismissToast} /> : null;
}

// Render inside the screen so it also appears above native navigation modals.
export default function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastMessage | null;
  onDismiss: () => void;
}) {
  const insets = useSafeAreaInsets();
  const backgroundColor = useAppThemeColor("foreground");
  const color = useAppThemeColor("background");
  if (!toast) return null;
  return (
    <View
      pointerEvents="box-none"
      style={[styles.position, { bottom: insets.bottom + 16 }]}
    >
      <Pressable
        cssInterop={false}
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel={toast.message}
        accessibilityHint="Dismiss notification"
        style={[styles.toast, { backgroundColor }]}
      >
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={[styles.text, { color }]}
        >
          {toast.message}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  position: {
    position: "absolute",
    left: 16,
    right: 16,
    alignItems: "center",
    zIndex: 100,
    elevation: 10,
  },
  toast: {
    width: "100%",
    maxWidth: 480,
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  text: { fontFamily: "Inter_500Medium", fontSize: 14, lineHeight: 22 },
});
