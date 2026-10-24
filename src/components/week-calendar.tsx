import {
    eachDayOfInterval,
    eachWeekOfInterval,
    endOfWeek,
    format,
    isAfter,
    isSameDay,
    startOfDay,
    startOfWeek,
    subWeeks,
} from "date-fns";
import { useRef, useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from "react-native";
import Pressable from "@/components/ui/guarded-pressable";

import { useAppThemeColor } from "@/theme/app-theme";

type WeekCalendarProps = {
    markedDates?: Date[];
    onChange?: (date: Date) => void;
    value?: Date;
};

export default function WeekCalendar({
    markedDates = [],
    onChange,
    value,
}: WeekCalendarProps) {
    const { width } = useWindowDimensions();
    const [pageWidth, setPageWidth] = useState(width);
    const compact = pageWidth < 360;
    const primary = useAppThemeColor("primary");
    const selectedBackground = useAppThemeColor("muted");
    const foreground = useAppThemeColor("foreground");
    const mutedForeground = useAppThemeColor("mutedForeground");
    const card = useAppThemeColor("card");
    const border = useAppThemeColor("border");
    const scrollRef = useRef<ScrollView>(null);
    const today = startOfDay(new Date());

    const [internal, setInternal] = useState(today);
    const selected = value ?? internal;

    const weeks = eachWeekOfInterval({
        start: subWeeks(startOfWeek(today), 2),
        end: endOfWeek(today),
    }).map((weekStart) =>
        eachDayOfInterval({
            start: weekStart,
            end: endOfWeek(weekStart),
        }),
    );

    const selectDate = (date: Date) => {
        setInternal(date);
        onChange?.(date);
    };

    return (
        <ScrollView
            className="-mx-5 mt-5 flex-grow-0"
            horizontal
            onLayout={(event) => setPageWidth(event.nativeEvent.layout.width)}
            contentContainerStyle={styles.scrollContent}
            onContentSizeChange={() =>
                scrollRef.current?.scrollToEnd({ animated: false })
            }
            pagingEnabled
            ref={scrollRef}
            showsHorizontalScrollIndicator={false}
        >
            {weeks.map((week) => (
                <View
                    style={[
                        styles.week,
                        { width: pageWidth, gap: compact ? 4 : 6 },
                    ]}
                    key={week[0].getTime()}
                >
                    {week.map((date) => {
                        const isSelected = isSameDay(date, selected);
                        const isFuture = isAfter(date, today);
                        const isToday = isSameDay(date, today);

                        // Check whether this calendar day contains
                        // at least one completed workout.
                        const hasWorkout = markedDates.some((markedDate) =>
                            isSameDay(markedDate, date),
                        );

                        return (
                            <View key={date.getTime()} style={styles.dayColumn}>
                                <Text
                                    style={[
                                        styles.weekday,
                                        {
                                            color:
                                                isSelected || isToday
                                                    ? primary
                                                    : mutedForeground,
                                            opacity: isFuture ? 0.35 : 1,
                                        },
                                    ]}
                                >
                                    {format(date, "EE").toUpperCase()}
                                </Text>
                                <Pressable
                                    cssInterop={false}
                                    accessibilityLabel={`${date.toLocaleDateString(
                                        "en-US",
                                        {
                                            dateStyle: "full",
                                        },
                                    )}${isToday ? ", today" : ""}${hasWorkout ? ", workout completed" : ""}`}
                                    accessibilityRole="button"
                                    accessibilityState={{
                                        disabled: isFuture,
                                        selected: isSelected,
                                    }}
                                    style={({ pressed }) => [
                                        styles.dayCard,
                                        {
                                            backgroundColor: isSelected
                                                ? selectedBackground
                                                : card,
                                            borderColor:
                                                isSelected || isToday
                                                    ? primary
                                                    : border,
                                            opacity: isFuture
                                                ? 0.35
                                                : pressed
                                                  ? 0.75
                                                  : 1,
                                            transform: [
                                                { scale: pressed ? 0.96 : 1 },
                                            ],
                                        },
                                    ]}
                                    disabled={isFuture}
                                    key={date.getTime()}
                                    onPress={() => selectDate(date)}
                                >
                                    <Text
                                        style={[
                                            styles.date,
                                            {
                                                fontSize: compact ? 16 : 18,
                                                color: foreground,
                                            },
                                        ]}
                                    >
                                        {format(date, "d")}
                                    </Text>
                                    <View style={styles.markerSpace}>
                                        {(hasWorkout || isToday) && (
                                            <View
                                                style={[
                                                    hasWorkout
                                                        ? styles.workoutDot
                                                        : styles.todayDash,
                                                    {
                                                        backgroundColor: primary,
                                                    },
                                                ]}
                                            />
                                        )}
                                    </View>
                                </Pressable>
                            </View>
                        );
                    })}
                </View>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scrollContent: { paddingVertical: 4 },
    week: { flexDirection: "row", paddingHorizontal: 20 },
    dayColumn: { flex: 1, minWidth: 0, alignItems: "center", gap: 6 },
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
    weekday: {
        fontFamily: "Inter_500Medium",
        fontSize: 10,
        letterSpacing: 0.3,
    },
    date: { fontFamily: "Inter_700Bold", fontVariant: ["tabular-nums"] },
    markerSpace: {
        position: "absolute",
        bottom: 3,
        height: 4,
        alignItems: "center",
        justifyContent: "center",
    },
    workoutDot: { width: 4, height: 4, borderRadius: 2 },
    todayDash: { width: 12, height: 3, borderRadius: 2 },
});
