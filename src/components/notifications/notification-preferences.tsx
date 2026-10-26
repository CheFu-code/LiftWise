import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import type { Dispatch, SetStateAction } from "react";
import { Text, View } from "react-native";

import Pressable from "@/components/ui/guarded-pressable";
import {
    reminderTimeLabel,
    TRAINING_DAYS,
    type Reminder,
} from "@/lib/reminder-schedule";
import { useAppThemeColor } from "@/theme/app-theme";
import { PreferenceSwitch } from "./notifications-preferences-switch";
import ReminderTimePicker from "./reminder-time-picker";
import { Fontisto } from "@expo/vector-icons";

export type PreferencesProps = {
    value: Required<Reminder>;
    onChange: Dispatch<SetStateAction<Required<Reminder>>>;
    disabled: boolean;
};

export function WorkoutReminderSettings({
    value: draft,
    onChange: setDraft,
    disabled,
    next,
    dirty,
}: PreferencesProps & {
    next: Date | null;
    dirty: boolean;
}) {
    const primary = useAppThemeColor("primary");
    const onPrimary = useAppThemeColor("primaryForeground");
    const foreground = useAppThemeColor("foreground");
    const card = useAppThemeColor("card");
    const border = useAppThemeColor("border");

    const canEdit = !disabled && draft.enabled;

    return (
        <View className="gap-5 rounded-2xl border border-border bg-card p-4">
            {/* Workout reminder toggle */}
            <PreferenceSwitch
                label="Workout reminders"
                value={draft.enabled}
                disabled={disabled}
                onChange={(enabled) =>
                    setDraft((value) => ({
                        ...value,
                        enabled,
                    }))
                }
            />

            <View className="h-px bg-border" />

            <View className="gap-3">
                <Text className="font-inter-semibold text-[14px] text-foreground">
                    Training days
                </Text>

                <View className="flex-row gap-1.5">
                    {TRAINING_DAYS.map((day) => {
                        const selected = draft.days.includes(day.value);

                        return (
                            <Pressable
                                key={day.value}
                                accessibilityRole="button"
                                accessibilityLabel={day.name}
                                accessibilityState={{
                                    selected,
                                    disabled: !canEdit,
                                }}
                                disabled={!canEdit}
                                onPress={() =>
                                    setDraft((value) => ({
                                        ...value,
                                        days: value.days.includes(day.value)
                                            ? value.days.filter(
                                                  (item) => item !== day.value,
                                              )
                                            : [...value.days, day.value].sort(
                                                  (a, b) => a - b,
                                              ),
                                    }))
                                }
                                style={{
                                    flex: 1,
                                    minWidth: 0,
                                    minHeight: 42,
                                    backgroundColor: selected ? primary : card,
                                    borderColor: selected ? primary : border,
                                    opacity: canEdit ? 1 : 0.5,
                                }}
                                className="items-center justify-center rounded-xl border"
                            >
                                <Text
                                    numberOfLines={1}
                                    style={{
                                        color: selected
                                            ? onPrimary
                                            : foreground,
                                    }}
                                    className="font-inter-semibold text-[12px]"
                                >
                                    {day.label.charAt(0)}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
            </View>

            {/* Reminder time */}
            <View className="gap-3">
                <Text className="font-inter-semibold text-[14px] text-foreground">
                    Reminder time
                </Text>

                <ReminderTimePicker
                    hour={draft.hour}
                    minute={draft.minute}
                    disabled={!canEdit}
                    onChange={(hour, minute) =>
                        setDraft((value) => ({
                            ...value,
                            hour,
                            minute,
                        }))
                    }
                />
            </View>

            {/* Next reminder information */}
            <View className="flex-row items-start gap-2">
                <FontAwesome5
                    name="calendar-check"
                    size={13}
                    color={foreground}
                    style={{ marginTop: 2, opacity: 0.6 }}
                />

                <Text
                    accessibilityLiveRegion="polite"
                    className="flex-1 font-inter text-[12px] leading-5 text-muted-foreground"
                >
                    {!draft.enabled
                        ? "Workout reminders are off."
                        : next
                          ? `${
                                dirty ? "After saving" : "Next reminder"
                            }: ${next.toLocaleDateString(undefined, {
                                weekday: "long",
                            })} at ${reminderTimeLabel(
                                next.getHours(),
                                next.getMinutes(),
                            )}.`
                          : "Choose at least one training day."}
                </Text>
            </View>
        </View>
    );
}

