
import EmptyState from "@/components/ui/empty-state";
import Skeleton from "@/components/ui/skeleton";
import Button from "@/components/ui/button";
import Pressable from "@/components/ui/guarded-pressable";

import { useAppThemeColor } from "@/theme/app-theme";
import {
    eachDayOfInterval,
    endOfWeek,
    format,
    isAfter,
    isSameDay,
    startOfDay,
    startOfWeek,
} from "date-fns";

import {
    Image,
    Modal,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";

const streakIcon = require(
    "../../../assets/images/app-images/streak-icon.png"
);

type StreakBottomSheetProps = {
    isPending?: boolean;
    isError?: boolean;
    onRetry?: () => void;
    bestStreak?: number;
    completedDays?: Date[];
    currentStreak?: number;
    onClose: () => void;
    visible: boolean;
};

export default function StreakBottomSheet({
    isPending,
    isError,
    onRetry,
    bestStreak = 0,
    completedDays = [],
    currentStreak = 0,
    onClose,
    visible,
}: StreakBottomSheetProps) {
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();

    const compact = width < 360;

    const primary = useAppThemeColor("primary");
    const foreground = useAppThemeColor("foreground");
    const mutedForeground = useAppThemeColor("mutedForeground");
    const background = useAppThemeColor("background");
    const border = useAppThemeColor("border");

    const today = startOfDay(new Date());

    const week = eachDayOfInterval({
        start: startOfWeek(today),
        end: endOfWeek(today),
    });

    const dayLabel =
        currentStreak === 1 ? "day" : "days";

    const completedToday = completedDays.some(
        (day) => isSameDay(day, today)
    );

    return (
        <Modal
            animationType="slide"
            onRequestClose={onClose}
            statusBarTranslucent
            transparent
            visible={visible}
        >
            <View className="flex-1 justify-end">
                {/* Backdrop */}
                <Pressable
                    accessibilityLabel="Close workout streak"
                    accessibilityRole="button"
                    className="absolute inset-0 bg-overlay/65"
                    onPress={onClose}
                />

                {/* Bottom sheet */}
                <View
                    accessibilityViewIsModal
                    className="rounded-t-[34px] border-t border-border bg-card px-5 pt-14"
                    style={{
                        paddingBottom:
                            Math.max(insets.bottom, 20) + 12,
                    }}
                >
                    {/* Floating streak icon */}
                    <View className="absolute -top-11 left-0 right-0 items-center">
                        <View className="h-[88px] w-[88px] items-center justify-center rounded-full border-[5px] border-card bg-background shadow-lg shadow-primary/40">
                            <Image
                                accessibilityIgnoresInvertColors
                                accessibilityLabel="Workout streak"
                                className="h-12 w-12"
                                resizeMode="contain"
                                source={streakIcon}
                            />
                        </View>
                    </View>

                    {isPending ? (
                        <Skeleton className="h-40 w-full rounded-2xl" />
                    ) : isError ? (
                        <EmptyState
                            message="Could not load your streak"
                            onRetry={onRetry}
                        />
                    ) : (
                        <>
                            {/* Streak heading */}
                            <Text className="text-center font-inter-medium text-[14px] text-muted-foreground">
                                Workout Streak
                            </Text>

                            <Text className="mt-1 text-center font-inter-bold text-[38px] tracking-[-1px] text-foreground">
                                {currentStreak} {dayLabel}
                            </Text>

                            {/* Weekly calendar */}
                            <View
                                style={[
                                    styles.week,
                                    {
                                        gap: compact ? 4 : 6,
                                    },
                                ]}
                                className="mt-7"
                            >
                                {week.map((day) => {
                                    const completed = completedDays.some(
                                        (completedDay) =>
                                            isSameDay(completedDay, day)
                                    );

                                    const isToday = isSameDay(
                                        day,
                                        today
                                    );

                                    const isFuture = isAfter(
                                        day,
                                        today
                                    );

                                    return (
                                        <View
                                            key={day.getTime()}
                                            style={styles.dayColumn}
                                            accessible
                                            accessibilityLabel={`${format(day, "EEEE, MMMM d")}${isToday ? ", today" : ""}${completed ? ", workout completed" : ""}`}
                                        >
                                            {/* Weekday label */}
                                            <Text
                                                style={[
                                                    styles.weekday,
                                                    {
                                                        color: isToday
                                                            ? primary
                                                            : mutedForeground,
                                                        opacity: isFuture
                                                            ? 0.35
                                                            : 1,
                                                    },
                                                ]}
                                            >
                                                {format(
                                                    day,
                                                    "EE"
                                                ).toUpperCase()}
                                            </Text>

                                            {/* Compact square card */}
                                            <View
                                                style={[
                                                    styles.dayCard,
                                                    {
                                                        backgroundColor:
                                                            background,
                                                        borderColor:
                                                            isToday
                                                                ? primary
                                                                : border,
                                                        opacity: isFuture
                                                            ? 0.35
                                                            : 1,
                                                    },
                                                ]}
                                            >
                                                {/* Date number */}
                                                <Text
                                                    style={[
                                                        styles.date,
                                                        {
                                                            fontSize:
                                                                compact
                                                                    ? 16
                                                                    : 18,
                                                            color:
                                                                foreground,
                                                        },
                                                    ]}
                                                >
                                                    {format(day, "d")}
                                                </Text>

                                                {/* Completion marker */}
                                                <View
                                                    style={
                                                        styles.markerSpace
                                                    }
                                                >
                                                    {(completed ||
                                                        isToday) && (
                                                        <View
                                                            style={[
                                                                completed
                                                                    ? styles.workoutDot
                                                                    : styles.todayDash,
                                                                {
                                                                    backgroundColor:
                                                                        primary,
                                                                },
                                                            ]}
                                                        />
                                                    )}
                                                </View>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>

                            {/* Best streak */}
                            <View className="mt-7 items-center gap-2">
                                <Text className="font-inter-semibold text-[15px] text-foreground">
                                    Best: {bestStreak}{" "}
                                    {bestStreak === 1
                                        ? "day"
                                        : "days"}
                                </Text>

                                <Text className="text-center font-inter text-[13px] leading-5 text-muted-foreground">
                                    {completedToday
                                        ? "Keep showing up. Your consistency is getting stronger."
                                        : currentStreak > 0
                                          ? "Complete a workout today to keep your streak going."
                                          : "Complete a workout today to start your streak."}
                                </Text>
                            </View>
                        </>
                    )}

                    {/* Close button */}
                    <Button
                        className="mt-7 h-16 rounded-full"
                        onPress={onClose}
                    >
                        Okay
                    </Button>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    week: {
        flexDirection: "row",
        width: "100%",
    },

    dayColumn: {
        flex: 1,
        minWidth: 0,
        alignItems: "center",
        gap: 6,
    },

    weekday: {
        fontFamily: "Inter_500Medium",
        fontSize: 10,
        letterSpacing: 0.3,
    },

    dayCard: {
        width: "100%",
        aspectRatio: 1,
        minWidth: 0,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 8,
        borderWidth: 1,
        padding: 2,
    },

    date: {
        fontFamily: "Inter_700Bold",
        fontVariant: ["tabular-nums"],
    },

    markerSpace: {
        position: "absolute",
        bottom: 3,
        height: 4,
        alignItems: "center",
        justifyContent: "center",
    },

    workoutDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
    },

    todayDash: {
        width: 12,
        height: 3,
        borderRadius: 2,
    },
});
