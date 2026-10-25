import { useState } from "react";
import { ScrollView, Switch, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import SafeAreaScreen from "@/components/ui/safe-area-screen";
import Pressable from "@/components/ui/guarded-pressable";
import { useToast } from "@/components/ui/toast";
import { saveLocalWorkoutPreferences, useLocalWorkoutPreferences } from "@/lib/local-workout-preferences";
import { useAppThemeColor } from "@/theme/app-theme";

export default function WorkoutSettingsPage() {
  const router = useRouter();
  const value = useLocalWorkoutPreferences();
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();
  const foreground = useAppThemeColor("foreground");
  const primary = useAppThemeColor("primary");
  const save = async (key: "keepAwake" | "haptics", enabled: boolean) => {
    if (saving) return;
    setSaving(true);
    try { await saveLocalWorkoutPreferences({ [key]: enabled }); }
    catch { showToast("Unable to save this device's workout settings."); }
    finally { setSaving(false); }
  };
  return <SafeAreaScreen edges={["top", "bottom", "left", "right"]}>
    <ScrollView contentContainerClassName="gap-5 p-5">
      <View className="flex-row items-center gap-3">
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} className="h-11 w-11 items-center justify-center"><Feather name="arrow-left" size={22} color={foreground} /></Pressable>
        <Text className="flex-1 font-inter-bold text-[24px] text-foreground">Workout settings</Text>
      </View>
      <Text className="font-inter text-[14px] leading-6 text-muted-foreground">Saved only on this device. No account synchronization is needed.</Text>
      {([{ key: "keepAwake", title: "Keep screen awake", description: "Prevent the screen from sleeping while an active workout is visible and running." }, { key: "haptics", title: "Haptic feedback", description: "Feel feedback when you complete sets, finish rest, or save a completed workout." }] as const).map(item => <View key={item.key} className="gap-2 rounded-2xl border border-border bg-card p-5">
        <View className="flex-row items-center gap-3"><Text className="flex-1 font-inter-semibold text-[16px] text-foreground">{item.title}</Text>
          <Switch accessibilityLabel={item.title} value={value[item.key]} disabled={!value.ready || saving} onValueChange={enabled => void save(item.key, enabled)} trackColor={{ true: primary }} />
        </View>
        <Text className="font-inter text-[13px] leading-5 text-muted-foreground">{item.description}</Text>
      </View>)}
    </ScrollView>
  </SafeAreaScreen>;
}
