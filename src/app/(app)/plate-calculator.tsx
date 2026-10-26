import { ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";

import SafeAreaScreen from "@/components/ui/safe-area-screen";
import Pressable from "@/components/ui/guarded-pressable";
import PlateCalculator from "@/components/plate-calculator";

import { useAuth } from "@/lib/chefu-auth";
import { useAppThemeColor } from "@/theme/app-theme";

export default function PlateCalculatorPage() {
    const router = useRouter();
    const { session } = useAuth();

    const foreground = useAppThemeColor("foreground");

    return (
        <SafeAreaScreen edges={["top", "bottom", "left", "right"]}>
            <ScrollView
                className="flex-1"
                contentContainerClassName="gap-5 px-5 pb-12 pt-4"
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
            >
                {/* Header */}
                <View className="gap-3">
                    <View className="flex-row items-center gap-3">
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Go back"
                            onPress={() => router.back()}
                            className="h-11 w-11 items-center justify-center"
                        >
                            <Feather
                                name="arrow-left"
                                size={22}
                                color={foreground}
                            />
                        </Pressable>

                        <Text className="flex-1 font-inter-bold text-[24px] text-foreground">
                            Plate calculator
                        </Text>
                    </View>

                    <Text className="font-inter text-[14px] leading-6 text-muted-foreground">
                        Calculate the right plates for your barbell and hit your
                        target weight.
                    </Text>
                </View>

                {/* Calculator */}
                <PlateCalculator
                    initialUnit={session?.onboardingProfile?.weightUnit ?? "kg"}
                />
            </ScrollView>
        </SafeAreaScreen>
    );
}
