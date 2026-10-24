import { useActionModal } from "@/components/ui/action-modal";
import { useToast } from "@/components/ui/toast";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import GenderStep from "@/components/onboarding/gender-step";
import GoalStep from "@/components/onboarding/goal-step";
import ExperienceStep from "@/components/onboarding/experience-step";
import Button from "@/components/ui/button";
import SafeAreaScreen from "@/components/ui/safe-area-screen";
import {
  clearOnboardingDraft,
  mergeOnboardingDraft,
  pendingOnboardingSteps,
  readOnboardingDraft,
  saveOnboardingDraft,
} from "@/constants/onboarding";
import { useAuth } from "@/lib/chefu-auth";
import {
  onboardingValuesSchema,
  type OnboardingValues,
} from "@/lib/validations/onboarding-validation";
import { useAppThemeColor } from "@/theme/app-theme";

export default function OnboardingStep() {
  const showModal = useActionModal();
  const { showToast } = useToast();
  const { step: key = "" } = useLocalSearchParams<{ step: string }>();
  const { session, saveOnboardingProfile, signOut } = useAuth();
  const router = useRouter();
  const foreground = useAppThemeColor("foreground");
  const [values, setValues] = useState<Partial<OnboardingValues>>({});
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);
  const uid = session?.user.uid;
  const profile = session?.onboardingProfile;
  useEffect(() => {
    let active = true;
    setLoaded(false);
    if (!uid || !profile) return;
    void readOnboardingDraft(uid)
      .catch(() => ({}))
      .then((draft) => {
        if (active) {
          setValues(mergeOnboardingDraft(profile, draft));
          setLoaded(true);
        }
      });
    return () => {
      active = false;
    };
  }, [uid, profile]);

  if (!uid) return <Redirect href="/sign-in" />;
  if (!profile) return <Redirect href="/onboarding" />;
  const steps = pendingOnboardingSteps(profile);
  const index = steps.findIndex((step) => step.key === key);
  const step = steps[index];
  if (!step) return <Redirect href="/onboarding" />;
  const next = steps[index + 1];
  const onSelect = (value: OnboardingValues[typeof step.field]) => {
    const updated = { ...values, [step.field]: value };
    setValues(updated);
    void saveOnboardingDraft(uid, updated).catch(() => undefined);
  };
  const goBack = () => {
    if (index === 0)
      void signOut().catch(() =>
        showModal("Unable to sign out", "Please try again."),
      );
    else
      router.replace({
        pathname: "/onboarding/[step]",
        params: { step: steps[index - 1].key },
      });
  };
  const goNext = async () => {
    if (saveLock.current) return;
    if (next) {
      router.push({
        pathname: "/onboarding/[step]",
        params: { step: next.key },
      });
      return;
    }
    const parsed = onboardingValuesSchema.safeParse(values);
    if (!parsed.success) {
      showModal("Complete your preferences", "Please answer each question.");
      return;
    }
    setSaving(true);
    saveLock.current = true;
    try {
      await saveOnboardingProfile(parsed.data);
      await clearOnboardingDraft(uid).catch(() => undefined);
      router.replace("/");
    } catch (error) {
      showToast(
        "Failed to save preferences. Your selections are ready to retry.",
      );
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  };
  return (
    <SafeAreaScreen edges={["top", "bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="flex-grow px-6 pb-5 pt-4">
        <View className="flex-row items-center gap-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={index === 0 ? "Sign out" : "Previous step"}
            disabled={saving}
            className="-ml-3 h-11 w-11 items-center justify-center rounded-full active:bg-muted"
            onPress={goBack}
          >
            <Feather
              color={foreground}
              name={index === 0 ? "log-out" : "arrow-left"}
              size={23}
            />
          </Pressable>
          <View className="h-2 flex-1 overflow-hidden rounded-full bg-border">
            <View
              className="h-full rounded-full bg-primary"
              style={{ width: `${((index + 1) / steps.length) * 100}%` }}
            />
          </View>
        </View>
        {!loaded ? (
          <View className="flex-1 justify-center">
            <ActivityIndicator />
          </View>
        ) : (
          <>
            {step.key === "gender" && (
              <GenderStep value={values.gender} onSelect={onSelect} />
            )}
            {step.key === "goal" && (
              <GoalStep value={values.goal} onSelect={onSelect} />
            )}
            {step.key === "experience" && (
              <ExperienceStep value={values.experience} onSelect={onSelect} />
            )}
            <Button
              disabled={saving || !values[step.field]}
              isLoading={saving}
              onPress={goNext}
            >
              {next ? "Next" : "Save and continue"}
            </Button>
          </>
        )}
      </ScrollView>
    </SafeAreaScreen>
  );
}
