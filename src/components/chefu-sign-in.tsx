import Button from "@/components/ui/button";
import SafeAreaScreen from "@/components/ui/safe-area-screen";
import { useAuth } from "@/lib/chefu-auth";
import { useAppThemeColor } from "@/theme/app-theme";
import { Link } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function ChefuSignIn({
  register = false,
}: {
  register?: boolean;
}) {
  const { signInWithChefuAccount, isAuthenticating } = useAuth();
  const primary = useAppThemeColor("primary");
  const mutedForeground = useAppThemeColor("mutedForeground");
  const [error, setError] = useState<string | null>(null);
  const signIn = async () => {
    setError(null);
    try {
      await signInWithChefuAccount(register ? "register" : "login");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to sign in. Please try again.",
      );
    }
  };
  return (
    <SafeAreaScreen edges={["top", "bottom"]}>
      <View className="flex-1 justify-center gap-6 px-6">
        <Text className="font-inter-bold text-[28px] text-foreground">
          {register ? "Join LiftWise" : "Welcome back"}
        </Text>
        <Text className="font-inter text-[16px] text-muted-foreground">
          {register
            ? "Create your account and start building your routine."
            : "Sign in to access your workouts and track your progress."}
        </Text>
        {error && (
          <Text accessibilityRole="alert" className="text-destructive">
            {error}
          </Text>
        )}
        <Button
          disabled={isAuthenticating}
          isLoading={isAuthenticating}
          onPress={signIn}
        >
          Continue to Sign {register ? "up" : "in"}
        </Button>
        <Link href={register ? "/sign-in" : "/sign-up"} asChild>
          <Pressable
            cssInterop={false}
            accessibilityRole="link"
            style={styles.navigationLink}
          >
            <Text style={[styles.navigationText, { color: primary }]}>
              {register
                ? "Already have an account? Sign in"
                : "New to LiftWise? Create an account"}
            </Text>
          </Pressable>
        </Link>
        <Link href="/welcome" asChild>
          <Pressable
            cssInterop={false}
            accessibilityRole="link"
            style={styles.navigationLink}
          >
            <Text style={[styles.navigationText, { color: mutedForeground }]}>
              Back to welcome
            </Text>
          </Pressable>
        </Link>
      </View>
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  navigationLink: {
    width: "100%",
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  navigationText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    lineHeight: 24,
    textAlign: "center",
    flexShrink: 1,
    width: "100%",
  },
});
