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
import { useToast } from "@/components/ui/toast";
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
    const { showToast } = useToast();
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
    const checking = useRef(false);
    const [checkingDevice, setCheckingDevice] = useState(false);
    const checkDevice = useCallback(async () => {
        if (checking.current) return;
        if (Platform.OS === "web") {
            setStatus(
                "Workout reminders are available in the Android and iOS apps.",
            );
            return;
        }
        checking.current = true;
        setCheckingDevice(true);
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
        } finally {
            checking.current = false;
            setCheckingDevice(false);
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
        const previousStatus = status;
        const previousReminder = parsed.data.reminder ?? {
            enabled: false,
            hour: 18,
            minute: 0,
        };
        let changed = false;
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
            changed = true;
            setStatus(
                enabled
                    ? `Daily reminder set for ${hour.padStart(2, "0")}:${minute.padStart(2, "0")}.`
                    : "Your workout reminder is turned off.",
            );
            // Verify device scheduling first; a device failure must not save unusable preferences.
            await syncWorkoutReminder(session?.user.uid, reminder);
            await saveOnboardingProfile({ ...parsed.data, reminder });
            await checkDevice();
            showToast("Reminder preferences saved.");
        } catch (cause) {
            if (changed) {
                setEnabled(previousReminder.enabled);
                setHour(String(previousReminder.hour).padStart(2, "0"));
                setMinute(String(previousReminder.minute).padStart(2, "0"));
                setStatus(previousStatus);
                void syncWorkoutReminder(
                    session?.user.uid,
                    previousReminder,
                ).catch(() => {
                    setStatus(
                        "Unable to restore this device's reminder. Please check device status.",
                    );
                });
            }
            showToast(
                "Failed to save reminders. Your previous preferences have been restored.",
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
                        {saving ? "Saving preferences…" : "Save preferences"}
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
                    disabled={saving || checkingDevice || Platform.OS === "web"}
                    isLoading={checkingDevice}
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
