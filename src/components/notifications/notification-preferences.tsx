import type { Dispatch, SetStateAction } from "react";
import { Switch, Text, View } from "react-native";
import Pressable from "@/components/ui/guarded-pressable";
import ReminderTimePicker from "./reminder-time-picker";
import { reminderTimeLabel, TRAINING_DAYS, type Reminder } from "@/lib/reminder-schedule";
import { useAppThemeColor } from "@/theme/app-theme";

type PreferencesProps = {
    value: Required<Reminder>;
    onChange: Dispatch<SetStateAction<Required<Reminder>>>;
    disabled: boolean;
};

export function WorkoutReminderSettings({ value: draft, onChange: setDraft, disabled, next, dirty }: PreferencesProps & { next: Date | null; dirty: boolean }) {
    const primary = useAppThemeColor("primary");
    const onPrimary = useAppThemeColor("primaryForeground");
    const foreground = useAppThemeColor("foreground");
    const card = useAppThemeColor("card");
    const border = useAppThemeColor("border");
    return (
                <View className="gap-5 rounded-2xl border border-border bg-card p-5">
                    <PreferenceSwitch
                        label="Workout reminders"
                        value={draft.enabled}
                        disabled={disabled}
                        onChange={(enabled) =>
                            setDraft((value) => ({ ...value, enabled }))
                        }
                    />
                    <View className="gap-3">
                        <Text className="font-inter-semibold text-[14px] text-foreground">
                            Training days
                        </Text>
                        <View className="flex-row flex-wrap gap-2">
                            {TRAINING_DAYS.map((day) => (
                                <Pressable
                                    key={day.value}
                                    accessibilityRole="button"
                                    accessibilityLabel={day.name}
                                    accessibilityState={{
                                        selected: draft.days.includes(
                                            day.value,
                                        ),
                                        disabled: disabled || !draft.enabled,
                                    }}
                                    disabled={disabled || !draft.enabled}
                                    onPress={() =>
                                        setDraft((value) => ({
                                            ...value,
                                            days: value.days.includes(day.value)
                                                ? value.days.filter(
                                                      (item) =>
                                                          item !== day.value,
                                                  )
                                                : [
                                                      ...value.days,
                                                      day.value,
                                                  ].sort(),
                                        }))
                                    }
                                    style={{
                                        backgroundColor: draft.days.includes(
                                            day.value,
                                        )
                                            ? primary
                                            : card,
                                        borderColor: draft.days.includes(
                                            day.value,
                                        )
                                            ? primary
                                            : border,
                                        opacity: draft.enabled ? 1 : 0.5,
                                    }}
                                    className="min-h-11 min-w-11 items-center justify-center rounded-xl border px-2"
                                >
                                    <Text
                                        style={{
                                            color: draft.days.includes(
                                                day.value,
                                            )
                                                ? onPrimary
                                                : foreground,
                                        }}
                                        className="font-inter-medium text-[13px]"
                                    >
                                        {day.label}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>
                    <View className="gap-3">
                        <Text className="font-inter-semibold text-[14px] text-foreground">
                            Reminder time
                        </Text>
                        <ReminderTimePicker
                            hour={draft.hour}
                            minute={draft.minute}
                            disabled={disabled || !draft.enabled}
                            onChange={(hour, minute) =>
                                setDraft((value) => ({
                                    ...value,
                                    hour,
                                    minute,
                                }))
                            }
                        />
                    </View>
                    <Text
                        accessibilityLiveRegion="polite"
                        className="font-inter text-[13px] leading-5 text-muted-foreground"
                    >
                        {!draft.enabled
                            ? "Workout reminders are off."
                            : next
                              ? `${dirty ? "After saving" : "Next reminder"}: ${next.toLocaleDateString(undefined, { weekday: "long" })} at ${reminderTimeLabel(next.getHours(), next.getMinutes())}.`
                              : "Choose at least one training day."}
                    </Text>
                </View>
    );
}

export function NotificationAlertSettings({ value: draft, onChange: setDraft, disabled }: PreferencesProps) {
    return (
                <View className="gap-5 rounded-2xl border border-border bg-card p-5">
                    <View className="gap-2">
                        <PreferenceSwitch
                            label="Rest-timer alerts"
                            value={draft.restAlerts}
                            disabled={disabled}
                            onChange={(restAlerts) =>
                                setDraft((value) => ({ ...value, restAlerts }))
                            }
                        />
                        <Text className="font-inter text-[13px] leading-5 text-muted-foreground">
                            Get notified when your rest ends while LiftWise is
                            in the background.
                        </Text>
                    </View>
                    <View className="gap-2">
                        <PreferenceSwitch
                            label="Notification sound"
                            value={draft.sound}
                            disabled={disabled}
                            onChange={(sound) =>
                                setDraft((value) => ({ ...value, sound }))
                            }
                        />
                        <Text className="font-inter text-[13px] leading-5 text-muted-foreground">
                            Applies to workout reminders, rest alerts, and
                            tests. Silent mode, Focus, and device notification
                            settings may override this.
                        </Text>
                    </View>
                </View>
    );
}

function PreferenceSwitch({
    label,
    value,
    disabled,
    onChange,
}: {
    label: string;
    value: boolean;
    disabled: boolean;
    onChange: (value: boolean) => void;
}) {
    const primary = useAppThemeColor("primary");
    return (
        <View className="flex-row items-center gap-3">
            <Text className="flex-1 font-inter-semibold text-[16px] text-foreground">
                {label}
            </Text>
            <Switch
                accessibilityLabel={label}
                value={value}
                onValueChange={onChange}
                disabled={disabled}
                trackColor={{ true: primary }}
            />
        </View>
    );
}
