import Button from "@/components/ui/button";
import SafeAreaScreen from "@/components/ui/safe-area-screen";
import { useAuth } from "@/lib/chefu-auth";
import { Link } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

export default function ChefuSignIn({
  register = false,
}: {
  register?: boolean;
}) {
  const { signInWithChefuAccount, isAuthenticating } = useAuth();
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
        <Link
          className="text-center text-primary"
          href={register ? "/sign-in" : "/sign-up"}
        >
          {register
            ? "Already have an account? Sign in"
            : "New to LiftWise? Create an account"}
        </Link>
        <Link className="text-center text-muted-foreground" href="/welcome">
          Back to welcome
        </Link>
      </View>
    </SafeAreaScreen>
  );
}
