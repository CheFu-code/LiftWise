import { useActionModal } from "@/components/ui/action-modal";
import { useToast } from "@/components/ui/toast";
import { Feather } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useFocusEffect, useRouter } from "expo-router";
import { openBrowserAsync } from "expo-web-browser";
import { useColorScheme } from "nativewind";
import {
    useEffect,
    useCallback,
    useRef,
    useState,
    type ComponentProps,
    type ReactNode,
} from "react";
import {
    AppState,
    ActivityIndicator,
    ScrollView,
    Switch,
    Text,
    View,
} from "react-native";
import Image from "@/components/ui/cached-image";
import Pressable from "@/components/ui/guarded-pressable";

import SafeAreaScreen from "@/components/ui/safe-area-screen";
import { useAuth } from "@/lib/chefu-auth";
import { onboardingValuesSchema } from "@/lib/validations/onboarding-validation";
import { useAppThemeColor } from "@/theme/app-theme";

const LEGAL_ORIGIN = "https://www.chefu.co.za";
const PRIVACY_URL = `${LEGAL_ORIGIN}/privacy`;
const TERMS_URL = `${LEGAL_ORIGIN}/terms`;
const MY_ACCOUNT = "https://myaccount.chefu.co.za";
const DELETE_ACCOUNT_URL = `${MY_ACCOUNT}/account?section=security`;

export default function ProfilePage() {
    const showModal = useActionModal();
    const { showToast } = useToast();
    const router = useRouter();
    const {
        session,
        signOut: signOutAccount,
        saveOnboardingProfile,
        refreshUser,
    } = useAuth();
    const refreshRef = useRef(refreshUser);
    refreshRef.current = refreshUser;
    const refreshing = useRef(false);
    const lastAccountRefresh = useRef(0);
    const [refreshError, setRefreshError] = useState(false);
    const refreshAccount = useCallback(async (force = false) => {
        if (
            refreshing.current ||
            (!force && Date.now() - lastAccountRefresh.current < 60_000)
        )
            return;
        refreshing.current = true;
        try {
            await refreshRef.current();
            lastAccountRefresh.current = Date.now();
            setRefreshError(false);
        } catch {
            setRefreshError(true);
        } finally {
            refreshing.current = false;
        }
    }, []);
    useFocusEffect(
        useCallback(() => {
            void refreshAccount();
            const listener = AppState.addEventListener("change", (state) => {
                if (state === "active") void refreshAccount(true);
            });
            return () => listener.remove();
        }, [refreshAccount]),
    );
    const [savingWeightUnit, setSavingWeightUnit] = useState(false);
    const weightUnitLock = useRef(false);
    const signOutLock = useRef(false);
    const [signingOut, setSigningOut] = useState(false);
    const [pendingWeightUnit, setPendingWeightUnit] = useState<
        "kg" | "lb" | null
    >(null);
    const weightUnit =
        pendingWeightUnit ?? session?.onboardingProfile?.weightUnit ?? "kg";

    const saveWeightUnit = async (unit: "kg" | "lb") => {
        if (weightUnitLock.current || unit === weightUnit) return;
        const profile = onboardingValuesSchema.safeParse(
            session?.onboardingProfile,
        );
        if (!profile.success) {
            showModal(
                "Unable to update weight unit",
                "Please reload your profile and try again.",
            );
            return;
        }
        setSavingWeightUnit(true);
        weightUnitLock.current = true;
        setPendingWeightUnit(unit);
        try {
            await saveOnboardingProfile({ ...profile.data, weightUnit: unit });
        } catch (error) {
            showToast(
                "Failed to save weight unit. Your previous unit has been restored.",
            );
        } finally {
            weightUnitLock.current = false;
            setPendingWeightUnit(null);
            setSavingWeightUnit(false);
        }
    };

    const chooseWeightUnit = () =>
        showModal("Weight unit", "Choose your preferred unit.", [
            {
                text: "Kilograms (kg)",
                selected: weightUnit === "kg",
                onPress: () => saveWeightUnit("kg"),
            },
            {
                text: "Pounds (lb)",
                selected: weightUnit === "lb",
                onPress: () => saveWeightUnit("lb"),
            },
            { text: "Cancel", style: "cancel" },
        ]);

    const { colorScheme, setColorScheme } = useColorScheme();
    const primary = useAppThemeColor("primary");
    const [isDarkMode, setIsDarkMode] = useState(colorScheme === "dark");
    const [failedPhotoURL, setFailedPhotoURL] = useState<string | null>(null);
    const photoURL = session?.user.photoURL?.trim();

    useEffect(() => {
        setIsDarkMode(colorScheme === "dark");
    }, [colorScheme]);

    const changeColorScheme = (value: boolean) => {
        setColorScheme(value ? "dark" : "light");
        setIsDarkMode(value);
    };

    const name = session?.user.name ?? "User";
    const initials = name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

    const signOut = async () => {
        if (signOutLock.current) return;
        signOutLock.current = true;
        setSigningOut(true);
        try {
            await signOutAccount();
        } catch (error) {
            showModal(
                "Could not sign out",
                error instanceof Error ? error.message : "Please try again.",
            );
        } finally {
            signOutLock.current = false;
            setSigningOut(false);
        }
    };

    return (
        <SafeAreaScreen edges={["top", "bottom"]}>
            <ScrollView contentContainerClassName="px-5 pb-8">
                <Text className="pt-3 font-inter-bold text-[24px] text-foreground">
                    Profile
                </Text>

                <View className="mt-5 flex-row items-center rounded-xl border border-border bg-card p-4">
                    <View className="h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary">
                        {photoURL && photoURL !== failedPhotoURL ? (
                            <Image
                                key={photoURL}
                                source={{ uri: photoURL }}
                                style={{ width: "100%", height: "100%" }}
                                resizeMode="cover"
                                accessibilityLabel={`${name}'s profile picture`}
                                onError={() => setFailedPhotoURL(photoURL)}
                            />
                        ) : (
                            <Text className="font-inter-bold text-[18px] text-primary-foreground">
                                {initials}
                            </Text>
                        )}
                    </View>
                    <View className="ml-3 flex-1">
                        <Text className="font-inter-bold text-[17px] text-foreground">
                            {name}
                        </Text>
                        <Text className="mt-1 font-inter text-[12px] text-muted-foreground">
                            {session?.user.email}
                        </Text>
                    </View>
                    <Pressable
                        onPress={() => openBrowserAsync(MY_ACCOUNT)}
                        className="flex-row items-center gap-1"
                    >
                        <Feather
                            name="external-link"
                            size={19}
                            color={primary}
                        />
                    </Pressable>
                </View>

                {refreshError && (
                    <Pressable
                        onPress={() => {
                            void refreshAccount(true);
                        }}
                        className="mt-3 p-2"
                    >
                        <Text className="font-inter text-[13px] text-destructive">
                            Couldn't refresh your account. Tap to retry.
                        </Text>
                    </Pressable>
                )}
                <Section title="Preferences">
                    <Row
                        icon="activity"
                        label="Weight Unit"
                        loading={savingWeightUnit}
                        onPress={
                            savingWeightUnit ? undefined : chooseWeightUnit
                        }
                        value={weightUnit}
                    />
                    <Row
                        icon="bell"
                        label="Notifications"
                        onPress={() => router.push("/notifications")}
                    />
                    <Row
                        icon="moon"
                        label="Dark Mode"
                        right={
                            <View>
                                <Switch
                                    onValueChange={changeColorScheme}
                                    trackColor={{
                                        false: "#CBD5E1",
                                        true: primary,
                                    }}
                                    value={isDarkMode}
                                />
                            </View>
                        }
                    />
                </Section>

                <Section title="Workout tools">
                    <Row icon="sliders" label="Workout settings" onPress={() => router.push("/workout-settings")} />
                    <Row icon="grid" label="Plate calculator" onPress={() => router.push("/plate-calculator")} />
                </Section>
                <Section title="Support & Legal">
                    <Row
                        icon="help-circle"
                        label="Help & Support"
                        onPress={() => router.push("/help")}
                    />
                    <Row
                        icon="shield"
                        label="Privacy Policy"
                        trailingIcon="external-link"
                        onPress={() => openBrowserAsync(PRIVACY_URL)}
                    />
                    <Row
                        icon="file-text"
                        label="Terms of Service"
                        trailingIcon="external-link"
                        onPress={() => openBrowserAsync(TERMS_URL)}
                    />
                    <Row
                        icon="info"
                        label="App Version"
                        value={Constants.expoConfig?.version ?? "Unknown"}
                    />
                </Section>

                <Section title="Account">
                    <Row
                        icon="log-out"
                        label={signingOut ? "Signing out…" : "Sign Out"}
                        loading={signingOut}
                        onPress={signOut}
                    />
                    <Row
                        danger
                        icon="trash-2"
                        trailingIcon="external-link"
                        label="Delete Account"
                        onPress={() => openBrowserAsync(DELETE_ACCOUNT_URL)}
                    />
                </Section>
            </ScrollView>
        </SafeAreaScreen>
    );
}

type RowProps = {
    loading?: boolean;
    danger?: boolean;
    icon: ComponentProps<typeof Feather>["name"];
    trailingIcon?: ComponentProps<typeof Feather>["name"];
    label: string;
    onPress?: () => void;
    right?: ReactNode;
    value?: string;
};

function Section({ children, title }: { children: ReactNode; title: string }) {
    return (
        <View className="mt-6">
            <Text className="mb-2 ml-1 font-inter-semibold text-[12px] uppercase tracking-wide text-muted-foreground">
                {title}
            </Text>
            <View className="overflow-hidden rounded-xl border border-border bg-card">
                {children}
            </View>
        </View>
    );
}

function Row({
    loading = false,
    danger,
    icon,
    label,
    onPress,
    right,
    value,
    trailingIcon = "chevron-right",
}: RowProps) {
    const muted = useAppThemeColor("mutedForeground");
    const color = danger ? "#EF4444" : muted;

    return (
        <Pressable
            className="min-h-16 flex-row items-center border-b border-border px-4 active:bg-muted"
            disabled={!onPress || loading}
            accessibilityState={{
                disabled: !onPress || loading,
                busy: loading,
            }}
            onPress={onPress}
        >
            <Feather color={color} name={icon} size={19} />
            <Text
                className={`ml-3 flex-1 font-inter-medium text-[14px] ${danger ? "text-destructive" : "text-foreground"}`}
            >
                {label}
            </Text>
            {value && (
                <Text className="font-inter text-[12px] text-muted-foreground">
                    {value}
                </Text>
            )}
            {right}
            {loading && <ActivityIndicator color={muted} size="small" />}
            {onPress && !right && !loading && (
                <Feather color={muted} name={trailingIcon} size={19} />
            )}
        </Pressable>
    );
}
