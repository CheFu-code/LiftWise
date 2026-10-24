import { useCallback, useRef, useState } from "react";
import {
    AppState,
    Linking,
    Platform,
    Pressable,
    ScrollView,
    Switch,
    Text,
    TextInput,
    View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import SafeAreaScreen from "@/components/ui/safe-area-screen";
import Button from "@/components/ui/button";
import { useActionModal } from "@/components/ui/action-modal";
import { useAuth } from "@/lib/chefu-auth";
import { onboardingValuesSchema } from "@/lib/validations/onboarding-validation";
import {
    reminderPermission,
    reminderScheduled,
    syncWorkoutReminder,
} from "@/lib/workout-reminders";
import { useAppThemeColor } from "@/theme/app-theme";

export default function NotificationsPage() {
    const router = useRouter();
    const { session, saveOnboardingProfile } = useAuth();
    const showModal = useActionModal();
    const primary = useAppThemeColor("primary");
    const foreground = useAppThemeColor("foreground");
    const muted = useAppThemeColor("mutedForeground");
    const pref = session?.onboardingProfile?.reminder;
    const [enabled, setEnabled] = useState(pref?.enabled ?? false);
    const [hour, setHour] = useState(String(pref?.hour ?? 18).padStart(2, "0"));
    const [minute, setMinute] = useState(
        String(pref?.minute ?? 0).padStart(2, "0"),
    );
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState("Checking this device…");
    const lock = useRef(false);
    const checkDevice = useCallback(async () => {
        if (Platform.OS === "web") {
            setStatus(
                "Workout reminders are available in the Android and iOS apps.",
            );
            return;
        }
        try {
            const permitted = await reminderPermission();
            setStatus(
                !permitted
                    ? "Notifications are blocked or not enabled on this device."
                    : (await reminderScheduled())
                      ? "A daily reminder is scheduled on this device."
                      : "No reminder is scheduled on this device.",
            );
        } catch {
            setStatus(
                "Unable to check reminders on this device. Please try again.",
            );
        }
    }, []);
    useFocusEffect(
        useCallback(() => {
            void checkDevice();
            const listener = AppState.addEventListener("change", (state) => {
                if (state === "active") void checkDevice();
            });
            return () => listener.remove();
        }, [checkDevice]),
    );
    const save = async () => {
        if (lock.current) return;
        const parsed = onboardingValuesSchema.safeParse(
            session?.onboardingProfile,
        );
        if (!parsed.success) {
            showModal(
                "Unable to load preferences",
                "Return to Profile and try again.",
            );
            return;
        }
        if (
            !/^\d{1,2}$/.test(hour) ||
            !/^\d{1,2}$/.test(minute) ||
            Number(hour) > 23 ||
            Number(minute) > 59
        ) {
            showModal(
                "Check the time",
                "Enter an hour from 00 to 23 and minutes from 00 to 59.",
            );
            return;
        }
        lock.current = true;
        setSaving(true);
        try {
            if (enabled && !(await reminderPermission(true))) {
                showModal(
                    "Allow notifications",
                    "Enable notifications in your device settings to receive workout reminders.",
                    [
                        { text: "Cancel", style: "cancel" },
                        {
                            text: "Open Settings",
                            onPress: Linking.openSettings,
                        },
                    ],
                );
                return;
            }
            const reminder = {
                enabled,
                hour: Number(hour),
                minute: Number(minute),
            };
            await saveOnboardingProfile({ ...parsed.data, reminder });
            await syncWorkoutReminder(session?.user.uid, reminder);
            await checkDevice();
            showModal(
                "Preferences saved",
                enabled
                    ? "Your daily workout reminder is set for your device's local time."
                    : "Your workout reminder is turned off.",
            );
        } catch (cause) {
            showModal(
                "Unable to update reminders",
                cause instanceof Error ? cause.message : "Please try again.",
            );
        } finally {
            lock.current = false;
            setSaving(false);
        }
    };
    return (
        <SafeAreaScreen edges={["top", "bottom", "left", "right"]}>
            <ScrollView
                contentContainerClassName="gap-5 p-5"
                keyboardShouldPersistTaps="handled"
            >
                <View className="flex-row items-center gap-3">
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Go back"
                        onPress={() => router.back()}
                        className="h-11 w-11 items-center justify-center"
                    >
                        <Feather
                            name="arrow-left"
                            size={22}
                            color={foreground}
                        />
                    </Pressable>
                    <Text className="font-inter-bold text-[24px] text-foreground">
                        Notifications
                    </Text>
                </View>
                <Text className="font-inter text-[14px] leading-6 text-muted-foreground">
                    Set a daily reminder for your next workout. The time follows
                    your device's local time zone.
                </Text>
                <View className="gap-5 rounded-2xl border border-border bg-card p-5">
                    <View className="flex-row items-center gap-3">
                        <Text className="flex-1 font-inter-semibold text-[16px] text-foreground">
                            Daily workout reminder
                        </Text>
                        <Switch
                            accessibilityLabel="Daily workout reminder"
                            value={enabled}
                            onValueChange={setEnabled}
                            disabled={saving || Platform.OS === "web"}
                            trackColor={{ true: primary }}
                        />
                    </View>
                    <Text className="font-inter text-[14px] text-foreground">
                        Reminder time (24-hour)
                    </Text>
                    <View className="flex-row items-center gap-3">
                        <TextInput
                            accessibilityLabel="Reminder hour"
                            value={hour}
                            onChangeText={setHour}
                            maxLength={2}
                            keyboardType="number-pad"
                            editable={!saving && Platform.OS !== "web"}
                            placeholder="18"
                            placeholderTextColor={muted}
                            className="h-12 w-20 rounded-xl border border-input-border bg-input text-center font-inter text-[18px] text-foreground"
                        />
                        <Text className="text-foreground">:</Text>
                        <TextInput
                            accessibilityLabel="Reminder minute"
                            value={minute}
                            onChangeText={setMinute}
                            maxLength={2}
                            keyboardType="number-pad"
                            editable={!saving && Platform.OS !== "web"}
                            placeholder="00"
                            placeholderTextColor={muted}
                            className="h-12 w-20 rounded-xl border border-input-border bg-input text-center font-inter text-[18px] text-foreground"
                        />
                    </View>
                    <Button
                        disabled={saving || Platform.OS === "web"}
                        isLoading={saving}
                        onPress={save}
                    >
                        Save preferences
                    </Button>
                </View>
                <Text
                    accessibilityLiveRegion="polite"
                    className="font-inter text-[14px] leading-6 text-muted-foreground"
                >
                    {status}
                </Text>
                <Button
                    variant="outline"
                    onPress={() => {
                        void checkDevice();
                    }}
                >
                    Check device status
                </Button>
            </ScrollView>
        </SafeAreaScreen>
    );
}
