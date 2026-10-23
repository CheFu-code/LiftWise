import { useAuth } from "@/lib/chefu-auth";
import { Redirect } from "expo-router";
import { ActivityIndicator, Text, View } from "react-native";

export default function SSOCallback() {
  const { isLoaded, isSignedIn, isAuthenticating } = useAuth();

  if (!isLoaded || isAuthenticating) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
        <Text>Completing CheFu sign-in…</Text>
      </View>
    );
  }
  return <Redirect href={isSignedIn ? "/" : "/sign-in"} />;
}
