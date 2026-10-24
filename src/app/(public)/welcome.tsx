import { useWelcomeTheme } from "@/components/welcome/welcome.styles";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Welcome() {
    const { colors, styles, layout } = useWelcomeTheme();
    const router = useRouter();
    const { wide } = layout;

    return (
        <SafeAreaView
            style={styles.screen}
            edges={["top", "bottom", "left", "right"]}
        >
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                <View style={styles.content}>
                    <View style={styles.header}>
                        <View style={styles.brand}>
                            <View style={styles.brandMark}>
                                <Image
                                    source={require("../../../assets/images/app-images/logo.png")}
                                    style={styles.brandLogo}
                                    resizeMode="contain"
                                    accessibilityLabel="LiftWise logo"
                                />
                            </View>
                            <Text style={styles.brandName}>
                                LiftWise<Text style={styles.brandDot}>.</Text>
                            </Text>
                        </View>
                    </View>

                    <View style={[styles.body, wide && styles.wideBody]}>
                        <View style={styles.introColumn}>
                            <Text
                                accessibilityRole="header"
                                style={styles.headline}
                            >
                                Make your next rep{" "}
                                <Text style={styles.accent}>count.</Text>
                            </Text>
                        </View>

                        <View style={styles.visualColumn}>
                            <LinearGradient
                                colors={["#3D66F5", "#2349CE", "#163395"]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.hero}
                            >
                                <View style={styles.heroTop}>
                                    <Text style={styles.heroEyebrow}>
                                        BUILT AROUND YOU
                                    </Text>
                                    <View style={styles.heroArrow}>
                                        <Feather
                                            name="arrow-up-right"
                                            size={layout.iconSize}
                                            color={colors.onAccent}
                                        />
                                    </View>
                                </View>
                                <View
                                    style={styles.illustration}
                                    accessibilityElementsHidden
                                    importantForAccessibility="no-hide-descendants"
                                >
                                    <View style={styles.outerOrbit} />
                                    <View style={styles.innerOrbit} />
                                    <View style={styles.barbell}>
                                        <View style={styles.bar} />
                                        <View
                                            style={[
                                                styles.smallPlate,
                                                styles.leftSmallPlate,
                                            ]}
                                        />
                                        <View
                                            style={[
                                                styles.largePlate,
                                                styles.leftLargePlate,
                                            ]}
                                        />
                                        <View style={styles.grip}>
                                            {[0, 1, 2, 3, 4].map((line) => (
                                                <View
                                                    key={line}
                                                    style={styles.gripLine}
                                                />
                                            ))}
                                        </View>
                                        <View
                                            style={[
                                                styles.largePlate,
                                                styles.rightLargePlate,
                                            ]}
                                        />
                                        <View
                                            style={[
                                                styles.smallPlate,
                                                styles.rightSmallPlate,
                                            ]}
                                        />
                                    </View>
                                    <View style={styles.spark}>
                                        <Feather
                                            name="plus"
                                            size={layout.iconSize}
                                            color={colors.lime}
                                        />
                                    </View>
                                </View>
                            </LinearGradient>
                        </View>
                    </View>

                    <View style={[styles.actions, wide && styles.wideActions]}>
                        {/* Keep Pressable's style callback outside NativeWind's style resolver. */}
                        <Pressable
                            cssInterop={false}
                            accessibilityRole="button"
                            onPress={() => router.push("/sign-up")}
                            style={({ pressed }) => [
                                styles.startButton,
                                pressed && styles.pressed,
                            ]}
                        >
                            <Text style={styles.startButtonText}>
                                Let's build your routine
                            </Text>
                            <View style={styles.buttonArrow}>
                                <Feather
                                    name="arrow-right"
                                    size={layout.iconSize}
                                    color={colors.blue}
                                />
                            </View>
                        </Pressable>
                        <View style={styles.signInRow}>
                            <Text style={styles.signInPrompt}>
                                Already part of the crew?
                            </Text>
                            <Pressable
                                cssInterop={false}
                                accessibilityRole="button"
                                onPress={() => router.push("/sign-in")}
                                style={({ pressed }) => [
                                    styles.signInButton,
                                    pressed && styles.pressed,
                                ]}
                            >
                                <Text style={styles.signInText}>Sign in</Text>
                                <Feather
                                    name="arrow-up-right"
                                    size={layout.smallIconSize}
                                    color={colors.ink}
                                />
                            </Pressable>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
