import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";
import * as QuickActions from "expo-quick-actions";
import { useQuickActionCallback } from "expo-quick-actions/hooks";
import { usePathname, useRootNavigationState, useRouter } from "expo-router";
import { useAuth } from "@/lib/chefu-auth";
import { appShortcuts, shortcutDestination } from "@/lib/app-shortcuts";

export default function AppShortcuts() {
    const router = useRouter();
    const pathname = usePathname();
    const navigation = useRootNavigationState();
    const { isLoaded, isSignedIn, isOnboardingComplete } = useAuth();
    const [pending, setPending] =
        useState<ReturnType<typeof shortcutDestination>>(null);

    useEffect(() => {
        if (Platform.OS === "web") return;
        let active = true;
        void QuickActions.isSupported()
            .then(async (supported) => {
                if (!active || !supported) return;
                const max = QuickActions.maxCount ?? appShortcuts.length;
                await QuickActions.setItems(appShortcuts.slice(0, max));
            })
            .catch(() => {
                // Shortcuts are optional; unsupported launchers must not block startup.
            });
        return () => {
            active = false;
        };
    }, []);

    // A stable callback prevents the library from replaying its initial action
    // after every parent render (fonts, timer, theme and authentication changes).
    const onAction = useCallback((action: QuickActions.Action) => {
        const destination = shortcutDestination(action.id);
        if (destination) setPending(destination);
    }, []);
    useQuickActionCallback(onAction);

    useEffect(() => {
        if (
            !pending ||
            !navigation?.key ||
            !isLoaded ||
            !isSignedIn ||
            !isOnboardingComplete ||
            ["/welcome", "/sign-in", "/sign-up", "/sso-callback"].includes(pathname) ||
            pathname.startsWith("/onboarding")
        )
            return;
        setPending(null);
        router.navigate(pending);
    }, [
        pending,
        navigation?.key,
        isLoaded,
        isSignedIn,
        isOnboardingComplete,
        router,
        pathname,
    ]);
    return null;
}
