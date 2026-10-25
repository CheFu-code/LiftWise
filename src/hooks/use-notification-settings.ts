import { useCallback, useRef, useState } from "react";
import { AppState, Linking, Platform } from "react-native";
import { useFocusEffect } from "expo-router";
import { useActionModal } from "@/components/ui/action-modal";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/chefu-auth";
import { readSession } from "@/lib/chefu-session";
import { onboardingValuesSchema } from "@/lib/validations/onboarding-validation";
import { reminderPermission, reminderScheduled, sendTestNotification, syncWorkoutReminder, type Reminder } from "@/lib/workout-reminders";
import { nextWorkoutReminder, reminderDays } from "@/lib/reminder-schedule";

const defaults = (pref?: Reminder): Required<Reminder> => ({
    enabled: pref?.enabled ?? false,
    hour: pref?.hour ?? 18,
    minute: pref?.minute ?? 0,
    days: reminderDays(pref),
    sound: pref?.sound !== false,
    restAlerts: pref?.restAlerts ?? false,
});

export function useNotificationSettings() {
    const { session, saveOnboardingProfile } = useAuth();
    const showModal = useActionModal();
    const { showToast } = useToast();
    const [draft, setDraft] = useState(() =>
        defaults(session?.onboardingProfile?.reminder),
    );
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [checkingDevice, setCheckingDevice] = useState(false);
    const [status, setStatus] = useState("Checking this device...");
    const [now, setNow] = useState(() => new Date());
    const lock = useRef(false);
    const checking = useRef(false);
    const disabled = saving || testing || Platform.OS === "web";
    const next = nextWorkoutReminder(draft, now);
    const dirty =
        JSON.stringify(draft) !==
        JSON.stringify(defaults(session?.onboardingProfile?.reminder));
    const allowNotifications = () =>
        showModal(
            "Allow notifications",
            "Enable notifications in device settings to receive workout and rest alerts.",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Open Settings", onPress: Linking.openSettings },
            ],
        );
    const checkDevice = useCallback(async () => {
        if (checking.current) return;
        setNow(new Date());
        if (Platform.OS === "web") {
            setStatus(
                "Notifications are available in the Android and iOS apps.",
            );
            return;
        }
        checking.current = true;
        setCheckingDevice(true);
        try {
            setStatus(
                !(await reminderPermission())
                    ? "Notifications are blocked or not enabled on this device."
                    : (await reminderScheduled())
                      ? "Workout reminders are scheduled on this device."
                      : "Notifications are allowed. No workout reminder is scheduled.",
            );
        } catch {
            setStatus("Unable to check this device. Please try again.");
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
        if (draft.enabled && !draft.days.length) {
            showModal(
                "Choose training days",
                "Select at least one day for your workout reminder.",
            );
            return;
        }
        lock.current = true;
        setSaving(true);
        const uid = session?.user.uid;
        const previous = defaults(parsed.data.reminder);
        let changed = false;
        try {
            if (
                (draft.enabled || draft.restAlerts) &&
                !(await reminderPermission(true))
            ) {
                allowNotifications();
                return;
            }
            changed = true;
            await syncWorkoutReminder(session?.user.uid, draft);
            if (!uid || (await readSession())?.user.uid !== uid)
                throw new Error("Account changed.");
            await saveOnboardingProfile({ ...parsed.data, reminder: draft });
            await checkDevice();
            showToast("Notification preferences saved.");
        } catch {
            if (changed) {
                setDraft(previous);
                try {
                    await syncWorkoutReminder(session?.user.uid, previous);
                } catch {
                    setStatus(
                        "Unable to restore the previous schedule. Check device status and save again.",
                    );
                }
            }
            showToast(
                "Could not save notifications. Please check your preferences and try again.",
            );
        } finally {
            lock.current = false;
            setSaving(false);
        }
    };
    const test = async () => {
        const uid = session?.user.uid;
        if (lock.current || !uid) return;
        lock.current = true;
        setTesting(true);
        try {
            if (!(await reminderPermission(true))) {
                allowNotifications();
                return;
            }
            await sendTestNotification(uid, draft.sound);
            showToast("Test scheduled for three seconds from now.");
        } catch {
            showToast(
                "Unable to send a test notification. Check device permissions and try again.",
            );
        } finally {
            lock.current = false;
            setTesting(false);
        }
    };
    return { draft, setDraft, disabled, status, next, dirty, saving, testing, checkingDevice, save, test, checkDevice };
}
