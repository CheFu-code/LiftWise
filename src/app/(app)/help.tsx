import { useRef, useState } from "react";
import { Feather } from "@expo/vector-icons";
import Constants from "expo-constants";
import { randomUUID } from "expo-crypto";
import { useRouter } from "expo-router";
import { openBrowserAsync } from "expo-web-browser";
import { Platform, StyleSheet, Text, TextInput, View } from "react-native";
import Pressable from "@/components/ui/guarded-pressable";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import SafeAreaScreen from "@/components/ui/safe-area-screen";
import Button from "@/components/ui/button";
import { useActionModal } from "@/components/ui/action-modal";
import { submitSupportReport } from "@/lib/support";
import { useAppThemeColor } from "@/theme/app-theme";

const questions = [
  {
    title: "How do I create a workout?",
    answer:
      "Open Workouts and tap the add button. Give your workout a name, add exercises, and set your reps, sets, and rest time. Save it when you're ready.",
  },
  {
    title: "How do I track my sets?",
    answer:
      "Start a workout from its details screen. Enter your reps and weight, then mark each set as complete. Tap Finish Workout and confirm to save your session to History.",
  },
  {
    title: "Where can I find my progress?",
    answer:
      "Open History to review completed sessions. Your home screen also shows activity and workout stats. Finish and save a workout for it to appear there.",
  },
  {
    title: "How do I change my weight unit?",
    answer:
      "Go to Profile, tap Weight Unit, and choose kilograms or pounds. Your preference is saved to your account.",
  },
  {
    title: "How do I manage my account or sign in again?",
    answer:
      "Use the account link below to manage your account details. If sign-in fails, check your connection and try again from the sign-in screen.",
  },
];

export default function HelpPage() {
  const router = useRouter();
  const showModal = useActionModal();
  const primary = useAppThemeColor("primary");
  const foreground = useAppThemeColor("foreground");
  const muted = useAppThemeColor("mutedForeground");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const requestId = useRef<string | null>(null);
  const version = Constants.expoConfig?.version ?? "Unknown";
  const sendReport = async () => {
    if (inFlight.current) return;
    if (description.trim().length < 10) {
      setError("Please describe the problem in at least 10 characters.");
      return;
    }
    inFlight.current = true;
    setSending(true);
    setError(null);
    try {
      requestId.current ??= randomUUID();
      const result = await submitSupportReport({
        requestId: requestId.current,
        description: description.trim(),
        appVersion: version,
        platform: Platform.OS,
      });
      setDescription("");
      requestId.current = null;
      showModal(
        "Report received",
        `Thanks for helping improve LiftWise. Your report has been saved.\n\nReference: ${result.id}`,
      );
    } catch (cause) {
      showModal(
        "Unable to send report",
        cause instanceof Error
          ? cause.message
          : "Please try again. Your message is still here.",
      );
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  };
  const openAccount = async () => {
    try {
      await openBrowserAsync("https://myaccount.chefu.co.za");
    } catch {
      showModal("Unable to open account", "Please try again.");
    }
  };

  return (
    <SafeAreaScreen edges={["top", "bottom", "left", "right"]}>
      <KeyboardAwareScrollView
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.page}
      >
        <View style={styles.content}>
          <View className="flex-row items-center gap-3">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              className="h-11 w-11 items-center justify-center rounded-full bg-secondary"
              onPress={() =>
                router.canGoBack() ? router.back() : router.replace("/profile")
              }
            >
              <Feather name="arrow-left" size={22} color={foreground} />
            </Pressable>
            <Text
              accessibilityRole="header"
              className="flex-1 font-inter-bold text-[24px] text-foreground"
            >
              Help & Support
            </Text>
          </View>
          <Text className="font-inter text-[15px] leading-6 text-muted-foreground">
            Find a quick answer or tell us what's getting in your way.
          </Text>
          <Text
            accessibilityRole="header"
            className="font-inter-semibold text-[18px] text-foreground"
          >
            Quick answers
          </Text>
          <View className="overflow-hidden rounded-2xl border border-border bg-card">
            {questions.map((question, index) => (
              <View
                key={question.title}
                className={index > 0 ? "border-t border-border" : undefined}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: expanded === index }}
                  className="min-h-14 flex-row items-center gap-3 p-4"
                  onPress={() => setExpanded(expanded === index ? null : index)}
                >
                  <Text className="flex-1 font-inter-semibold text-[14px] leading-5 text-foreground">
                    {question.title}
                  </Text>
                  <Feather
                    name={expanded === index ? "minus" : "plus"}
                    color={muted}
                    size={18}
                  />
                </Pressable>
                {expanded === index && (
                  <Text className="px-4 pb-4 font-inter text-[14px] leading-6 text-muted-foreground">
                    {question.answer}
                  </Text>
                )}
              </View>
            ))}
          </View>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Manage account, opens in browser"
            className="min-h-12 flex-row items-center gap-3 rounded-xl border border-border bg-card p-4"
            onPress={openAccount}
          >
            <Feather name="user" size={20} color={primary} />
            <Text className="flex-1 font-inter-semibold text-[14px] text-foreground">
              Manage your account
            </Text>
            <Feather name="arrow-up-right" size={20} color={muted} />
          </Pressable>
          <View className="gap-4 rounded-2xl border border-border bg-card p-5">
            <Text
              accessibilityRole="header"
              className="font-inter-semibold text-[18px] text-foreground"
            >
              Report a problem
            </Text>
            <Text className="font-inter text-[14px] leading-6 text-muted-foreground">
              Tell us what happened, what you expected, and the steps to repeat
              it. Please leave out passwords and other sensitive details.
            </Text>
            <View className="gap-2">
              <Text className="font-inter-medium text-[14px] text-foreground">
                What went wrong?
              </Text>
              <TextInput
                accessibilityLabel="Problem description"
                multiline
                textAlignVertical="top"
                editable={!sending}
                maxLength={3000}
                placeholder="I was trying to…"
                placeholderTextColor={muted}
                className="min-h-40 rounded-xl border border-input-border bg-input p-4 font-inter text-[15px] leading-6 text-foreground"
                value={description}
                onChangeText={(value) => {
                  setDescription(value);
                  setError(null);
                  requestId.current = null;
                }}
              />
              <Text className="text-right font-inter text-[12px] text-muted-foreground">
                {description.length}/3000
              </Text>
              {error && (
                <Text
                  accessibilityRole="alert"
                  className="font-inter text-[13px] text-destructive"
                >
                  {error}
                </Text>
              )}
            </View>
            <Text className="font-inter text-[12px] leading-5 text-muted-foreground">
              Your account ID, app version ({version}), and platform are
              included to help investigate.
            </Text>
            <Button
              onPress={sendReport}
              disabled={sending || !description.trim()}
              isLoading={sending}
            >
              {sending ? "Sending report…" : "Send report"}
            </Button>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  content: { width: "100%", maxWidth: 640, gap: 20 },
});
