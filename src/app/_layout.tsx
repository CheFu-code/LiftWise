import WorkoutReminderSync from "@/components/workout-reminder-sync";
import WorkoutCompletionSync from "@/components/workout-completion-sync";
import { createQueryClient } from "@/lib/query-client";
import { useQueryPersistence } from "@/hooks/use-query-persistence";
import { ChefuAuthProvider, useAuth } from "@/lib/chefu-auth";
import { ActionModalProvider } from "@/components/ui/action-modal";
import { getStatusBarStyle } from "@/lib/utils";
import { appThemeColors, appThemes } from "@/theme/app-theme";
import {
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    useFonts,
} from "@expo-google-fonts/inter";
import { Feather, FontAwesome, FontAwesome6 } from "@expo/vector-icons";
import { QueryClientProvider } from "@tanstack/react-query";
import {
    DarkTheme,
    DefaultTheme,
    Stack,
    ThemeProvider,
    usePathname,
} from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "nativewind";
import { useEffect, useState } from "react";
import { Platform, View } from "react-native";
import { KeyboardProvider } from "react-native-keyboard-controller";
import "../global.css";
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://b1f59ffe135563fea1cd2ed1c03e246c@o4512011915296768.ingest.de.sentry.io/4512310839541841',

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Enable Logs
  enableLogs: true,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

SplashScreen.preventAutoHideAsync();

const navigationThemes = {
    light: {
        ...DefaultTheme,
        colors: {
            ...DefaultTheme.colors,
            background: appThemeColors.light.background,
        },
    },
    dark: {
        ...DarkTheme,
        colors: {
            ...DarkTheme.colors,
            background: appThemeColors.dark.background,
        },
    },
};

function RootLayout() {
    const [queryClient] = useState(createQueryClient);
    return (
        <QueryClientProvider client={queryClient}>
            <ChefuAuthProvider>
                <RootNavigation />
            </ChefuAuthProvider>
        </QueryClientProvider>
    );
}

export default Sentry.wrap(RootLayout);

function RootNavigation() {
    const [loaded, error] = useFonts({
        ...Feather.font,
        ...FontAwesome.font,
        ...FontAwesome6.font,
        Inter_400Regular,
        Inter_500Medium,
        Inter_600SemiBold,
        Inter_700Bold,
    });
    const [appReady, setAppReady] = useState(false);
    const { colorScheme } = useColorScheme();
    const pathname = usePathname();
    const scheme = colorScheme ?? "light";
    const backgroundColor = appThemeColors[scheme].background;

    // UPDATE: helper method to determine the style value
    const statusBarStyle = getStatusBarStyle(pathname, scheme);

    const { session, isLoaded, isOnboardingComplete } = useAuth();
    const cacheReady = useQueryPersistence(session?.user.uid);
    const isPending = !isLoaded;

    // check if font is loaded properly
    const fontReady = loaded || !!error;

    useEffect(() => {
        if (!appReady && fontReady && !isPending && cacheReady) {
            SplashScreen.hideAsync().then(() => setAppReady(true));
        }
    }, [isPending, appReady, fontReady, cacheReady]);

    if (!appReady || !cacheReady) return null;

    return (
        <KeyboardProvider>
            <ThemeProvider value={navigationThemes[scheme]}>
                <View
                    style={[
                        appThemes[scheme],
                        {
                            backgroundColor,
                            flex: 1,
                        },
                    ]}
                >
                    {Platform.OS === "ios" && (
                        <StatusBar animated style={statusBarStyle} />
                    )}
                    <ActionModalProvider>
                        <WorkoutReminderSync />
                        <WorkoutCompletionSync />
                        <Stack
                            screenOptions={{
                                headerShown: false,
                                //USE: Stack controls Android; expo-status-bar above controls iOS.
                                ...(Platform.OS === "android" && {
                                    statusBarStyle,
                                }),
                            }}
                        >
                            <Stack.Protected guard={!session}>
                                <Stack.Screen name="(public)" />
                            </Stack.Protected>
                            <Stack.Protected
                                guard={!!session && isOnboardingComplete}
                            >
                                <Stack.Screen name="(app)" />
                            </Stack.Protected>
                            <Stack.Protected
                                guard={!!session && !isOnboardingComplete}
                            >
                                <Stack.Screen name="onboarding" />
                            </Stack.Protected>
                            <Stack.Screen name="sso-callback" />
                        </Stack>
                    </ActionModalProvider>
                </View>
            </ThemeProvider>
        </KeyboardProvider>
    );
}
