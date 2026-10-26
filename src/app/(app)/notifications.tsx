import { NotificationAlertSettings } from "@/components/notifications/notification-alert-settings";
import { WorkoutReminderSettings } from "@/components/notifications/notification-preferences";
import Button from "@/components/ui/button";
import Pressable from "@/components/ui/guarded-pressable";
import SafeAreaScreen from "@/components/ui/safe-area-screen";
import { useNotificationSettings } from "@/hooks/use-notification-settings";
import { useAppThemeColor } from "@/theme/app-theme";

import { Feather, Fontisto, AntDesign } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ScrollView, Text, View } from "react-native";

export default function NotificationsPage() {
    const router = useRouter();
    const foreground = useAppThemeColor("foreground");
    const muted = useAppThemeColor("mutedForeground");

    const {
        draft,
        setDraft,
        disabled,
        status,
        next,
        dirty,
        saving,
        testing,
        checkingDevice,
        save,
        test,
        checkDevice,
    } = useNotificationSettings();

    return (
        <SafeAreaScreen edges={["top", "bottom", "left", "right"]}>
            <ScrollView
                className="flex-1"
                contentContainerClassName="gap-5 px-5 pb-10 pt-4"
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Header */}
                <View className="gap-3">
                    <View className="flex-row items-center gap-3">
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Go back"
                            disabled={saving}
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
                            Notifications
                        </Text>
                    </View>

                    <Text className="font-inter text-[14px] leading-6 text-muted-foreground">
                        Manage your workout reminders and alerts.
                    </Text>
                </View>

                {/* Workout schedule section */}
                <View className="gap-3">
                    <View className="flex-row items-center gap-2 px-1">
                        <Feather name="calendar" size={14} color={muted} />

                        <Text className="font-inter-semibold text-[12px] uppercase tracking-wide text-muted-foreground">
                            Workout Schedule
                        </Text>
                    </View>

                    <WorkoutReminderSettings
                        value={draft}
                        onChange={setDraft}
                        disabled={disabled}
                        next={next}
                        dirty={dirty}
                    />
                </View>

                {/* Alert preferences section */}
                <View className="gap-3">
                    <View className="flex-row items-center gap-2 px-1">
                        <Feather name="bell" size={14} color={muted} />

                        <Text className="font-inter-semibold text-[12px] uppercase tracking-wide text-muted-foreground">
                            Alert Preferences
                        </Text>
                    </View>

                    <NotificationAlertSettings
                        value={draft}
                        onChange={setDraft}
                        disabled={disabled}
                    />
                </View>

                {/* Save preferences */}
                <View className="gap-3">
                    <Button
                        disabled={disabled}
                        isLoading={saving}
                        onPress={save}
                        className="w-full"
                    >
                        {saving ? "Saving preferences..." : "Save preferences"}
                    </Button>

                    {/* Notification status */}
                    {!!status && (
                        <View
                            accessibilityLiveRegion="polite"
                            className="flex-row items-start gap-2 px-1"
                        >
                            <Feather
                                name="info"
                                size={15}
                                color={muted}
                                style={{ marginTop: 2 }}
                            />

                            <Text className="flex-1 font-inter text-[12px] leading-5 text-muted-foreground">
                                {status}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Notification utilities */}
                <View className="gap-3">
                    <Text className="px-1 font-inter-semibold text-[12px] uppercase tracking-wide text-muted-foreground">
                        Notification Tools
                    </Text>

                    <View className="flex-row items-stretch gap-3">
                        {/* Test notification */}
                        <View className="min-w-0 flex-1">
                            <Button
                                variant="outline"
                                disabled={disabled}
                                isLoading={testing}
                                onPress={test}
                                className="w-full"
                            >
                                <View className="flex-row items-center justify-center gap-2">
                                    <Fontisto
                                        name="bell"
                                        size={14}
                                        color={foreground}
                                    />

                                    <Text
                                        numberOfLines={1}
                                        adjustsFontSizeToFit
                                        minimumFontScale={0.8}
                                        className="shrink font-inter-semibold text-[12px] text-foreground"
                                    >
                                        Test notification
                                    </Text>
                                </View>
                            </Button>
                        </View>

                        {/* Device status */}
                        <View className="min-w-0 flex-1">
                            <Button
                                variant="secondary"
                                disabled={disabled || checkingDevice}
                                isLoading={checkingDevice}
                                onPress={checkDevice}
                                className="w-full"
                            >
                                <View className="flex-row items-center justify-center gap-2">
                                    <AntDesign
                                        name="mobile"
                                        size={15}
                                        color={foreground}
                                    />

                                    <Text
                                        numberOfLines={1}
                                        adjustsFontSizeToFit
                                        minimumFontScale={0.8}
                                        className="shrink font-inter-semibold text-[12px] text-foreground"
                                    >
                                        Device status
                                    </Text>
                                </View>
                            </Button>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaScreen>
    );
}
