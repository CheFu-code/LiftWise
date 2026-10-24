import EmptyState from "@/components/ui/empty-state";
import { startOfDay } from "date-fns";
import { useWorkoutCalendar } from "@/hooks/use-workout-calendar";
import { calendarStats } from "@/lib/calendar-stats";
import { useState } from "react";
import { Image, ScrollView, Text, View } from "react-native";
import Pressable from "@/components/ui/guarded-pressable";

import HomeStats from "@/components/home/home-stats";
import MyWorkouts from "@/components/home/my-workouts";
import RecentWorkout from "@/components/home/recent-workout";
import SafeAreaScreen from "@/components/ui/safe-area-screen";
import WeekCalendar from "@/components/week-calendar";
import { useStreak } from "@/contexts/streak-context";
import { useAppThemeColor } from "@/theme/app-theme";

const logo = require("../../../../assets/images/app-images/logo.png");
const streakIcon = require("../../../../assets/images/app-images/streak-icon.png");

export default function HomePage() {
    const foreground = useAppThemeColor("foreground");
    const {
        currentStreak,
        isPending: streakPending,
        isError: streakError,
        showStreak,
    } = useStreak();

    const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));

    const {
        data,
        isPending,
        isError: calendarError,
        refetch: retryCalendar,
    } = useWorkoutCalendar();
    const stats = calendarStats(data, selectedDate);

    const workoutDates = data?.workoutDates
        ? data.workoutDates.map((dateStr) => new Date(dateStr))
        : undefined;

    return (
        <SafeAreaScreen edges={["top", "bottom"]}>
            <ScrollView
                className="flex-1"
                contentContainerClassName="px-5 pb-5 pt-2"
                showsVerticalScrollIndicator={false}
            >
                <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-0">
                        <View className="-ml-4 h-11 w-16 overflow-hidden">
                            <Image
                                className="h-full w-full"
                                resizeMode="cover"
                                source={logo}
                                tintColor={foreground}
                            />
                        </View>
                        <Text
                            accessibilityRole="header"
                            className="font-inter-bold text-[22px] text-foreground"
                        >
                            My Workout
                        </Text>
                    </View>
                    <Pressable
                        className="h-11 flex-row items-center rounded-full border border-border bg-card px-3 active:bg-muted"
                        onPress={showStreak}
                    >
                        <Image
                            className="h-6 w-6"
                            resizeMode="contain"
                            source={streakIcon}
                        />
                        <Text className="ml-1.5 mr-0.5 font-inter-bold text-[14px] text-foreground">
                            {streakPending
                                ? "?"
                                : streakError
                                  ? "!"
                                  : currentStreak}
                        </Text>
                    </Pressable>
                </View>

                {/* {Week Calendar Section} */}
                <WeekCalendar
                    markedDates={workoutDates}
                    onChange={setSelectedDate}
                    value={selectedDate}
                />

                {calendarError && data && (
                    <Pressable
                        onPress={() => {
                            void retryCalendar();
                        }}
                        className="mt-2 py-2"
                    >
                        <Text className="font-inter text-[13px] text-destructive">
                            Couldn't load calendar activity. Tap to retry.
                        </Text>
                    </Pressable>
                )}
                {calendarError && !data ? (
                    <EmptyState
                        className="mt-3"
                        message="Could not load your stats"
                        onRetry={() => {
                            void retryCalendar();
                        }}
                    />
                ) : (
                    <HomeStats
                        avgTimeSeconds={stats?.avgTimeSeconds}
                        isPending={isPending}
                        totalTimeSeconds={stats?.totalTimeSeconds}
                        workouts={stats?.workouts}
                    />
                )}

                <MyWorkouts />
                <RecentWorkout />
            </ScrollView>
        </SafeAreaScreen>
    );
}
