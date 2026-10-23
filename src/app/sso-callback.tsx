import SafeAreaScreen from "@/components/ui/safe-area-screen";
import { useAuth } from "@/lib/chefu-auth";
import { useAppThemeColor } from "@/theme/app-theme";
import { Redirect } from "expo-router";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function SSOCallback() {
  const { isLoaded, isSignedIn, isAuthenticating, isOnboardingComplete } =
    useAuth();
  const primary = useAppThemeColor("primary");
  const foreground = useAppThemeColor("foreground");
  const mutedForeground = useAppThemeColor("mutedForeground");
  const card = useAppThemeColor("card");
  const border = useAppThemeColor("border");

  if (!isLoaded || isAuthenticating) {
    return (
      <SafeAreaScreen edges={["top", "bottom", "left", "right"]}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.content}>
            <Image
              source={require("../../assets/images/app-images/logo.png")}
              style={styles.logo}
              resizeMode="contain"
              accessibilityLabel="LiftWise logo"
            />
            <Text style={[styles.brand, { color: foreground }]}>LiftWise</Text>
            <View
              style={[
                styles.card,
                { backgroundColor: card, borderColor: border },
              ]}
            >
              <ActivityIndicator
                size="large"
                color={primary}
                accessibilityLabel="Signing in"
              />
              <View accessibilityLiveRegion="polite" style={styles.message}>
                <Text
                  accessibilityRole="header"
                  style={[styles.title, { color: foreground }]}
                >
                  Getting you ready
                </Text>
                <Text style={[styles.description, { color: mutedForeground }]}>
                  Finishing your sign-in. Your next session is one step closer.
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaScreen>
    );
  }
  if (!isSignedIn) return <Redirect href="/sign-in" />;
  return <Redirect href={isOnboardingComplete ? "/" : "/onboarding"} />;
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  content: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
    gap: 16,
  },
  logo: { width: 64, height: 64 },
  brand: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    textAlign: "center",
  },
  card: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 32,
    marginTop: 16,
    alignItems: "center",
    gap: 24,
  },
  message: { width: "100%", gap: 12 },
  title: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 22,
    textAlign: "center",
  },
  description: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 24,
    textAlign: "center",
  },
});
