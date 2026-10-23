import { StyleSheet, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";
import { useMemo } from "react";
import { getWelcomeLayout } from "./welcome.layout";

const lightColors = {
  paper: "#F5F3EC",
  ink: "#17233C",
  muted: "#647086",
  blue: "#315CF5",
  lime: "#DAF888",
  accent: "#315CF5",
  onAccent: "#17233C",
};

const darkColors = {
  ...lightColors,
  paper: "#0B0F19",
  ink: "#F8FAFC",
  muted: "#A7B2C7",
  accent: "#9AAFFF",
};

export function useWelcomeTheme() {
  const { colorScheme } = useColorScheme();
  const { width, height, fontScale } = useWindowDimensions();
  const { top, bottom, left, right } = useSafeAreaInsets();
  const colors = colorScheme === "dark" ? darkColors : lightColors;
  const layout = useMemo(
    () =>
      getWelcomeLayout(width, height, fontScale, { top, bottom, left, right }),
    [width, height, fontScale, top, bottom, left, right],
  );
  const styles = useMemo(() => createStyles(colors, layout), [colors, layout]);
  return { colors, styles, layout };
}

const createStyles = (
  colors: typeof lightColors,
  layout: ReturnType<typeof getWelcomeLayout>,
) => {
  const s = (value: number) => value * layout.spacing;
  const art = (value: number) => value * layout.artScale;
  const buttonFontSize = Math.max(16, Math.min(18, 16 * layout.scale));
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.paper },
    scrollContent: { flexGrow: 1 },
    content: {
      flexGrow: 1,
      width: "100%",
      maxWidth: layout.contentWidth,
      alignSelf: "center",
      paddingHorizontal: layout.padding,
      paddingTop: s(16),
      paddingBottom: s(16),
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: s(28),
    },
    brand: {
      flexDirection: "row",
      alignItems: "center",
      gap: s(10),
      maxWidth: "100%",
    },
    brandMark: {
      width: layout.logoSize,
      height: layout.logoSize,
      flexShrink: 0,
      borderRadius: layout.logoSize / 3,
      backgroundColor: colors.blue,
      alignItems: "center",
      justifyContent: "center",
    },
    brandLogo: { width: "100%", height: "100%" },
    brandName: {
      fontFamily: "Inter_700Bold",
      fontSize: 24 * layout.scale,
      lineHeight: 30 * layout.scale,
      letterSpacing: -1.2 * layout.scale,
      flexShrink: 1,
      color: colors.ink,
    },
    brandDot: { color: colors.accent },

    body: {
      flexGrow: 1,
      flexShrink: 0,
      justifyContent: "center",
      gap: s(24),
      width: "100%",
    },
    wideBody: {
      flexDirection: "row",
      alignItems: "center",
      gap: layout.columnGap,
      paddingVertical: s(24),
    },
    introColumn: { width: layout.columnWidth, minWidth: 0 },

    headline: {
      fontFamily: "Inter_700Bold",
      fontSize: layout.headlineSize,
      lineHeight: Math.ceil(layout.headlineSize * 1.14),
      letterSpacing: -layout.headlineSize * 0.04,
      color: colors.ink,
    },
    accent: { color: colors.accent },
    description: {
      fontFamily: "Inter_400Regular",
      fontSize: layout.bodySize,
      lineHeight: Math.ceil(layout.bodySize * 1.65),
      color: colors.muted,
      marginTop: s(17),
      maxWidth: "100%",
    },
    visualColumn: { width: layout.columnWidth, minWidth: 0 },
    hero: {
      borderRadius: s(26),
      overflow: "hidden",
      padding: layout.heroPadding,
    },
    heroTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: s(12),
      zIndex: 1,
    },
    heroEyebrow: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 10 * layout.scale,
      lineHeight: 16 * layout.scale,
      letterSpacing: 1.4 * layout.scale,
      flex: 1,
      minWidth: 0,
      color: "#E0E8FF",
    },
    heroArrow: {
      height: layout.buttonIconSize,
      width: layout.buttonIconSize,
      borderRadius: layout.buttonIconSize / 2,
      flexShrink: 0,
      backgroundColor: colors.lime,
      alignItems: "center",
      justifyContent: "center",
    },
    illustration: {
      height: layout.illustrationHeight,
      marginVertical: s(8),
      alignItems: "center",
      justifyContent: "center",
    },
    outerOrbit: {
      position: "absolute",
      width: art(300),
      height: art(300),
      borderRadius: art(150),
      borderWidth: 1,
      borderColor: "#FFFFFF1F",
      transform: [{ scaleY: 0.68 }, { rotate: "-25deg" }],
    },
    innerOrbit: {
      position: "absolute",
      width: art(236),
      height: art(236),
      borderRadius: art(118),
      borderWidth: 1,
      borderColor: "#FFFFFF1F",
      transform: [{ scaleY: 0.68 }, { rotate: "-25deg" }],
    },
    barbell: {
      width: art(254),
      height: art(128),
      transform: [{ rotate: "-26deg" }],
    },
    bar: {
      position: "absolute",
      left: 0,
      right: 0,
      top: art(57),
      height: art(14),
      backgroundColor: "#E8EEFF",
      borderRadius: art(7),
    },
    largePlate: {
      position: "absolute",
      top: 0,
      width: art(34),
      height: art(128),
      borderRadius: art(12),
      backgroundColor: colors.lime,
      borderRightWidth: art(7),
      borderRightColor: "#A8CA53",
    },
    smallPlate: {
      position: "absolute",
      top: art(24),
      width: art(20),
      height: art(80),
      borderRadius: art(8),
      backgroundColor: "#B8DC65",
      borderRightWidth: art(5),
      borderRightColor: "#92B646",
    },
    leftLargePlate: { left: art(42) },
    rightLargePlate: { right: art(42) },
    leftSmallPlate: { left: art(17) },
    rightSmallPlate: { right: art(17) },
    grip: {
      position: "absolute",
      left: art(104),
      top: art(57),
      width: art(46),
      height: art(14),
      flexDirection: "row",
      gap: art(5),
      alignItems: "center",
      justifyContent: "center",
    },
    gripLine: { height: art(14), width: art(1), backgroundColor: "#97A5CA" },
    spark: { position: "absolute", top: "28%", left: "14%" },
    heroBottom: { alignItems: "flex-start", gap: s(9), zIndex: 1 },
    heroTitle: {
      fontFamily: "Inter_700Bold",
      fontSize: 23 * layout.scale,
      lineHeight: 30 * layout.scale,
      letterSpacing: -0.7 * layout.scale,
      color: "#FFFFFF",
    },
    heroPill: {
      flexDirection: "row",
      gap: s(6),
      alignItems: "center",
      backgroundColor: colors.paper,
      maxWidth: "100%",
      borderRadius: s(20),
      paddingHorizontal: s(10),
      paddingVertical: s(6),
    },
    heroPillText: {
      fontFamily: "Inter_500Medium",
      fontSize: 11 * layout.scale,
      lineHeight: 16 * layout.scale,
      flexShrink: 1,
      color: colors.ink,
    },
    actions: { width: "100%", marginTop: s(24) },
    wideActions: { width: layout.columnWidth, marginTop: s(16) },
    startButton: {
      minHeight: layout.buttonMinHeight,
      paddingVertical: s(12),
      paddingLeft: s(20),
      paddingRight: s(12),
      backgroundColor: colors.blue,
      borderRadius: s(18),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: s(12),
    },
    startButtonText: {
      flex: 1,
      minWidth: 0,
      fontFamily: "Inter_600SemiBold",
      fontSize: buttonFontSize,
      lineHeight: Math.ceil(buttonFontSize * 1.4),
      textAlign: "center",
      textAlignVertical: "center",
      includeFontPadding: false,
      color: "#FFFFFF",
    },
    buttonArrow: {
      width: layout.buttonIconSize,
      height: layout.buttonIconSize,
      flexShrink: 0,
      backgroundColor: "#FFFFFF",
      borderRadius: s(12),
      alignItems: "center",
      justifyContent: "center",
    },
    pressed: { opacity: 0.75 },
    signInRow: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      flexWrap: "wrap",
      marginTop: s(6),
    },
    signInPrompt: {
      fontFamily: "Inter_400Regular",
      fontSize: 13 * layout.scale,
      lineHeight: 20 * layout.scale,
      flexShrink: 1,
      textAlign: "center",
      maxWidth: "100%",
      color: colors.muted,
    },
    signInButton: {
      minHeight: 48,
      flexDirection: "row",
      gap: s(4),
      alignItems: "center",
      justifyContent: "center",
      maxWidth: "100%",
      paddingHorizontal: s(8),
    },
    signInText: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 14 * layout.scale,
      lineHeight: 21 * layout.scale,
      flexShrink: 1,
      textAlign: "center",
      color: colors.ink,
    },
  });
};
