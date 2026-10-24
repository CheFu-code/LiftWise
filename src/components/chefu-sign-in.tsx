import SafeAreaScreen from "@/components/ui/safe-area-screen";
import { useAuth } from "@/lib/chefu-auth";
import { useAppThemeColor } from "@/theme/app-theme";
import { Link } from "expo-router";
import { useRef, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from "react-native";

export default function ChefuSignIn({
    register = false,
}: {
    register?: boolean;
}) {
    const { signInWithChefuAccount, isAuthenticating } = useAuth();
    const { width } = useWindowDimensions();
    const compact = width < 360;
    const primary = useAppThemeColor("primary");
    const primaryForeground = useAppThemeColor("primaryForeground");
    const primaryHover = useAppThemeColor("primaryHover");
    const foreground = useAppThemeColor("foreground");
    const muted = useAppThemeColor("mutedForeground");
    const card = useAppThemeColor("card");
    const border = useAppThemeColor("border");
    const destructive = useAppThemeColor("destructive");
    const [error, setError] = useState<string | null>(null);
    const inFlight = useRef(false);
    const signIn = async () => {
        if (inFlight.current || isAuthenticating) return;
        inFlight.current = true;
        setError(null);
        try {
            await signInWithChefuAccount(register ? "register" : "login");
        } catch (cause) {
            setError(
                cause instanceof Error
                    ? cause.message
                          .replace(/CheFu account/gi, "account")
                          .replace(/CheFu/gi, "LiftWise")
                    : "Unable to sign in. Please try again.",
            );
        } finally {
            inFlight.current = false;
        }
    };

    return (
        <SafeAreaScreen edges={["top", "bottom", "left", "right"]}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                    styles.page,
                    { paddingHorizontal: compact ? 20 : 24 },
                ]}
            >
                <View style={styles.content}>
                    <View style={styles.header}>
                        <View style={styles.brand}>
                            <View
                                style={[
                                    styles.brandMark,
                                    { backgroundColor: primary },
                                ]}
                            >
                                <Image
                                    source={require("../../assets/images/app-images/logo.png")}
                                    style={styles.logo}
                                    resizeMode="contain"
                                    accessibilityLabel="LiftWise logo"
                                />
                            </View>
                            <Text
                                style={[
                                    styles.brandName,
                                    { color: foreground },
                                ]}
                            >
                                LiftWise
                            </Text>
                        </View>
                        <Link href="/welcome" asChild>
                            <Pressable
                                cssInterop={false}
                                accessibilityRole="link"
                                accessibilityLabel="Back to welcome"
                                disabled={isAuthenticating}
                                style={({ pressed }) => [
                                    styles.backLink,
                                    (pressed || isAuthenticating) &&
                                        styles.dimmed,
                                ]}
                            >
                                <Text
                                    style={[styles.backText, { color: muted }]}
                                >
                                    Back
                                </Text>
                            </Pressable>
                        </Link>
                    </View>

                    <View style={styles.main}>
                        <View
                            style={[
                                styles.panel,
                                {
                                    backgroundColor: card,
                                    borderColor: border,
                                    padding: compact ? 20 : 28,
                                },
                            ]}
                        >
                            <Text
                                accessibilityRole="header"
                                style={[
                                    styles.title,
                                    {
                                        color: foreground,
                                        fontSize: compact ? 28 : 32,
                                    },
                                ]}
                            >
                                {register ? "Join LiftWise" : "Welcome back"}
                            </Text>
                            <Text
                                style={[styles.description, { color: muted }]}
                            >
                                {register
                                    ? "Create your account and start building your routine."
                                    : "Sign in to access your workouts and track your progress."}
                            </Text>

                            <View
                                style={[
                                    styles.divider,
                                    { backgroundColor: border },
                                ]}
                            />

                            {error && (
                                <View
                                    style={[
                                        styles.errorBox,
                                        {
                                            backgroundColor: `${destructive}10`,
                                            borderColor: `${destructive}40`,
                                        },
                                    ]}
                                >
                                    <Text
                                        accessibilityRole="alert"
                                        accessibilityLiveRegion="polite"
                                        style={[
                                            styles.errorText,
                                            { color: destructive },
                                        ]}
                                    >
                                        {error}
                                    </Text>
                                </View>
                            )}
                            <Pressable
                                cssInterop={false}
                                accessibilityRole="button"
                                accessibilityState={{
                                    disabled: isAuthenticating,
                                    busy: isAuthenticating,
                                }}
                                disabled={isAuthenticating}
                                onPress={signIn}
                                style={({ pressed }) => [
                                    styles.continueButton,
                                    {
                                        backgroundColor: pressed
                                            ? primaryHover
                                            : primary,
                                    },
                                    isAuthenticating && styles.dimmed,
                                ]}
                            >
                                {isAuthenticating && (
                                    <ActivityIndicator
                                        color={primaryForeground}
                                    />
                                )}
                                <Text
                                    style={[
                                        styles.buttonText,
                                        { color: primaryForeground },
                                    ]}
                                >
                                    {isAuthenticating
                                        ? "Connecting..."
                                        : register
                                          ? "Create account"
                                          : "Sign in"}
                                </Text>
                            </Pressable>
                            <Text
                                style={[styles.browserNote, { color: muted }]}
                            >
                                Your browser will open to finish{" "}
                                {register
                                    ? "creating your account"
                                    : "signing in"}
                                .
                            </Text>

                            <View style={styles.alternateRow}>
                                <Text
                                    style={[
                                        styles.alternatePrompt,
                                        { color: muted },
                                    ]}
                                >
                                    {register
                                        ? "Already have an account?"
                                        : "New to LiftWise?"}
                                </Text>
                                <Link
                                    href={register ? "/sign-in" : "/sign-up"}
                                    asChild
                                >
                                    <Pressable
                                        cssInterop={false}
                                        accessibilityRole="link"
                                        disabled={isAuthenticating}
                                        style={({ pressed }) => [
                                            styles.alternateLink,
                                            (pressed || isAuthenticating) &&
                                                styles.dimmed,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.alternateText,
                                                { color: primary },
                                            ]}
                                        >
                                            {register
                                                ? "Sign in"
                                                : "Create an account"}
                                        </Text>
                                    </Pressable>
                                </Link>
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaScreen>
    );
}

const styles = StyleSheet.create({
    page: {
        flexGrow: 1,
        alignItems: "center",
        paddingTop: 20,
        paddingBottom: 28,
    },
    content: { flexGrow: 1, width: "100%", maxWidth: 480 },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
    },
    brand: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        flexShrink: 1,
    },
    brandMark: { width: 38, height: 38, borderRadius: 12, flexShrink: 0 },
    logo: { width: "100%", height: "100%" },
    brandName: {
        fontFamily: "Inter_700Bold",
        fontSize: 22,
        lineHeight: 28,
        letterSpacing: -0.7,
        flexShrink: 1,
    },
    backLink: {
        minHeight: 44,
        minWidth: 44,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 4,
    },
    backText: { fontFamily: "Inter_500Medium", fontSize: 14, lineHeight: 22 },
    main: { flexGrow: 1, justifyContent: "center", paddingVertical: 36 },
    panel: { width: "100%", borderWidth: 1, borderRadius: 24 },
    title: { fontFamily: "Inter_700Bold", letterSpacing: -0.8 },
    description: {
        fontFamily: "Inter_400Regular",
        fontSize: 15,
        lineHeight: 24,
        marginTop: 12,
    },
    divider: { height: 1, marginVertical: 28 },
    errorBox: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
    },
    errorText: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 22 },
    continueButton: {
        width: "100%",
        minHeight: 52,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 14,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
    },
    buttonText: {
        fontFamily: "Inter_600SemiBold",
        fontSize: 16,
        lineHeight: 24,
        textAlign: "center",
        flexShrink: 1,
    },
    browserNote: {
        fontFamily: "Inter_400Regular",
        fontSize: 12,
        lineHeight: 20,
        textAlign: "center",
        marginTop: 12,
    },
    alternateRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 24,
        columnGap: 4,
    },
    alternatePrompt: {
        fontFamily: "Inter_400Regular",
        fontSize: 14,
        lineHeight: 22,
        textAlign: "center",
        flexShrink: 1,
    },
    alternateLink: {
        minHeight: 44,
        paddingHorizontal: 4,
        paddingVertical: 10,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 1,
    },
    alternateText: {
        fontFamily: "Inter_600SemiBold",
        fontSize: 14,
        lineHeight: 22,
        textAlign: "center",
    },
    dimmed: { opacity: 0.65 },
});
