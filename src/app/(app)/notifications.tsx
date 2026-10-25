import { ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import Pressable from "@/components/ui/guarded-pressable";
import SafeAreaScreen from "@/components/ui/safe-area-screen";
import Button from "@/components/ui/button";
import { NotificationAlertSettings, WorkoutReminderSettings } from "@/components/notifications/notification-preferences";
import { useNotificationSettings } from "@/hooks/use-notification-settings";
import { useAppThemeColor } from "@/theme/app-theme";

export default function NotificationsPage() {
    const router = useRouter();
    const foreground = useAppThemeColor("foreground");
    const { draft, setDraft, disabled, status, next, dirty, saving, testing, checkingDevice, save, test, checkDevice } = useNotificationSettings();
    return (
        <SafeAreaScreen edges={["top", "bottom", "left", "right"]}>
            <ScrollView contentContainerClassName="gap-5 p-5 pb-10">
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
                    <Text className="font-inter-bold text-[24px] text-foreground">
                        Notifications
                    </Text>
                </View>
                <Text className="font-inter text-[14px] leading-6 text-muted-foreground">
                    Choose when LiftWise reminds you to train. Times follow this
                    device's local time zone.
                </Text>
                <WorkoutReminderSettings value={draft} onChange={setDraft} disabled={disabled} next={next} dirty={dirty} />
                <NotificationAlertSettings value={draft} onChange={setDraft} disabled={disabled} />
                <Button disabled={disabled} isLoading={saving} onPress={save}>
                    {saving ? "Saving preferences..." : "Save preferences"}
                </Button>
                <Text
                    accessibilityLiveRegion="polite"
                    className="font-inter text-[13px] leading-5 text-muted-foreground"
                >
                    {status}
                </Text>
                <Button
                    variant="outline"
                    disabled={disabled}
                    isLoading={testing}
                    onPress={test}
                >
                    Send test notification
                </Button>
                <Button
                    variant="secondary"
                    disabled={disabled || checkingDevice}
                    isLoading={checkingDevice}
                    onPress={checkDevice}
                >
                    Check device status
                </Button>
            </ScrollView>
        </SafeAreaScreen>
    );
}