import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { ActivityIndicator, Text, View } from "react-native";
import Button from "@/components/ui/button";
import SafeAreaScreen from "@/components/ui/safe-area-screen";
import { pendingOnboardingSteps } from "@/constants/onboarding";
import { useAuth } from "@/lib/chefu-auth";

export default function OnboardingIndex() {
  const { session, refreshOnboardingProfile } = useAuth();
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const profile = session?.onboardingProfile;
  useEffect(() => {
    if (profile !== undefined) return;
    let active = true;
    setError(false);
    void refreshOnboardingProfile().catch(() => {
      if (active) setError(true);
    });
    return () => {
      active = false;
    };
  }, [profile, attempt, refreshOnboardingProfile]);
  if (!session) return <Redirect href="/sign-in" />;
  if (profile !== undefined) {
    const next = pendingOnboardingSteps(profile)[0];
    return (
      <Redirect
        href={
          next
            ? { pathname: "/onboarding/[step]", params: { step: next.key } }
            : "/"
        }
      />
    );
  }
  return (
    <SafeAreaScreen>
      <View className="flex-1 justify-center gap-4 px-6">
        {error ? (
          <>
            <Text className="text-center font-inter text-foreground">
              Unable to load your profile.
            </Text>
            <Button onPress={() => setAttempt((value) => value + 1)}>
              Try again
            </Button>
          </>
        ) : (
          <ActivityIndicator />
        )}
      </View>
    </SafeAreaScreen>
  );
}
