import { Fontisto } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { PreferenceSwitch } from "./notifications-preferences-switch";
import { useAppThemeColor } from "@/theme/app-theme";
import { PreferencesProps } from "./notification-preferences";

export function NotificationAlertSettings({
    value: draft,
    onChange: setDraft,
    disabled,
}: PreferencesProps) {
    const foreground = useAppThemeColor("foreground");

    return (
        <View className="rounded-2xl border border-border bg-card p-4">
            {/* Rest timer alerts */}
            <View className="gap-1.5">
                <View className="flex-row items-center gap-3">
                    <View className="w-6 items-center justify-center">
                        <Fontisto
                            name="stopwatch"
                            size={15}
                            color={foreground}
                        />
                    </View>

                    <View className="min-w-0 flex-1">
                        <PreferenceSwitch
                            label="Rest-timer alerts"
                            value={draft.restAlerts}
                            disabled={disabled}
                            onChange={(restAlerts) =>
                                setDraft((value) => ({
                                    ...value,
                                    restAlerts,
                                }))
                            }
                        />
                    </View>
                </View>

                <View className="pl-9">
                    <Text className="font-inter text-[12px] leading-5 text-muted-foreground">
                        Get notified when your rest ends.
                    </Text>
                </View>
            </View>

            {/* Divider */}
            <View className="my-4 h-px bg-border" />

            {/* Notification sound */}
            <View className="gap-1.5">
                <View className="flex-row items-center gap-3">
                    <View className="w-6 items-center justify-center">
                        <Fontisto name="bell" size={15} color={foreground} />
                    </View>

                    <View className="min-w-0 flex-1">
                        <PreferenceSwitch
                            label="Notification sound"
                            value={draft.sound}
                            disabled={disabled}
                            onChange={(sound) =>
                                setDraft((value) => ({
                                    ...value,
                                    sound,
                                }))
                            }
                        />
                    </View>
                </View>

                <View className="pl-9">
                    <Text className="font-inter text-[12px] leading-5 text-muted-foreground">
                        Sound alerts for workouts and rests.
                    </Text>
                </View>
            </View>
        </View>
    );
}
