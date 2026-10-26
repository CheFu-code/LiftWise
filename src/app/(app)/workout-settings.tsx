import { useState } from "react";
import { ScrollView, Switch, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";

import SafeAreaScreen from "@/components/ui/safe-area-screen";
import Pressable from "@/components/ui/guarded-pressable";
import { useToast } from "@/components/ui/toast";

import {
    saveLocalWorkoutPreferences,
    useLocalWorkoutPreferences,
} from "@/lib/local-workout-preferences";

import { useAppThemeColor } from "@/theme/app-theme";

type WorkoutPreferenceKey = "keepAwake" | "haptics";

const SETTINGS = [
    {
        key: "keepAwake",
        title: "Keep screen awake",
        description: "Keep your screen on while a workout is active.",
        icon: "smartphone",
    },
    {
        key: "haptics",
        title: "Haptic feedback",
        description:
            "Feel vibrations when completing sets, resting, and finishing workouts.",
        icon: "activity",
    },
] as const;

export default function WorkoutSettingsPage() {
    const router = useRouter();
    const value = useLocalWorkoutPreferences();

    const [saving, setSaving] = useState(false);

    const { showToast } = useToast();

    const foreground = useAppThemeColor("foreground");
    const primary = useAppThemeColor("primary");
    const muted = useAppThemeColor("mutedForeground");

    const save = async (key: WorkoutPreferenceKey, enabled: boolean) => {
        if (saving) return;

        setSaving(true);

        try {
            await saveLocalWorkoutPreferences({
                [key]: enabled,
            });
        } catch {
            showToast("Unable to save this device's workout settings.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <SafeAreaScreen edges={["top", "bottom", "left", "right"]}>
            <ScrollView
                className="flex-1"
                contentContainerClassName="gap-5 px-5 pb-10 pt-4"
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View className="gap-3">
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

                        <Text className="flex-1 font-inter-bold text-[24px] text-foreground">
                            Workout settings
                        </Text>
                    </View>

                    <Text className="font-inter text-[14px] leading-6 text-muted-foreground">
                        Personalize your workout experience on this device.
                    </Text>
                </View>

                {/* Section heading */}
                <View className="flex-row items-center gap-2 px-1">
                    <Feather name="sliders" size={14} color={muted} />

                    <Text className="font-inter-semibold text-[12px] uppercase tracking-wide text-muted-foreground">
                        Workout Preferences
                    </Text>
                </View>

                {/* Settings card */}
                <View className="rounded-2xl border border-border bg-card p-4">
                    {SETTINGS.map((item, index) => (
                        <View key={item.key}>
                            {index > 0 && (
                                <View className="my-4 h-px bg-border" />
                            )}

                            <View className="flex-row items-start gap-3">
                                {/* Setting icon */}
                                <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                                    <Feather
                                        name={item.icon}
                                        size={19}
                                        color={primary}
                                    />
                                </View>

                                {/* Setting content */}
                                <View className="min-w-0 flex-1 gap-1.5">
                                    <View className="min-h-10 flex-row items-center gap-2">
                                        <Text className="min-w-0 flex-1 font-inter-semibold text-[15px] text-foreground">
                                            {item.title}
                                        </Text>

                                        <Switch
                                            accessibilityLabel={item.title}
                                            accessibilityHint={item.description}
                                            value={value[item.key]}
                                            disabled={!value.ready || saving}
                                            onValueChange={(enabled) =>
                                                void save(item.key, enabled)
                                            }
                                            trackColor={{
                                                true: primary,
                                            }}
                                        />
                                    </View>

                                    <Text className="font-inter text-[12px] leading-5 text-muted-foreground">
                                        {item.description}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Device settings information */}
                <View className="flex-row items-start gap-3 rounded-xl border border-border p-4">
                    <Feather
                        name="info"
                        size={17}
                        color={muted}
                        style={{ marginTop: 2 }}
                    />

                    <View className="min-w-0 flex-1 gap-1">
                        <Text className="font-inter-semibold text-[13px] text-foreground">
                            Device-specific settings
                        </Text>

                        <Text className="font-inter text-[12px] leading-5 text-muted-foreground">
                            These preferences are saved locally on your device
                            and won't sync with your LiftWise account.
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaScreen>
    );
}
