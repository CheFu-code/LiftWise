import EmptyState from "@/components/ui/empty-state";
import SafeAreaScreen from "@/components/ui/safe-area-screen";
import Skeleton from "@/components/ui/skeleton";
import Button from "@/components/ui/button";
import { useWorkoutCalendar } from "@/hooks/use-workout-calendar";
import WeekCalendar from "@/components/week-calendar";
import { getHistoryPage, HistorySessionItem } from "@/lib/api";
import { formatDuration, formatSessionDate } from "@/lib/format";
import { useAppThemeColor } from "@/theme/app-theme";
import { Feather } from "@expo/vector-icons";
import { useInfiniteQuery } from "@tanstack/react-query";
import { startOfDay } from "date-fns";
import { useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, RefreshControl, Text, View } from "react-native";
import Image from "@/components/ui/cached-image";
import Pressable from "@/components/ui/guarded-pressable";

const History = () => {
    const router = useRouter();
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const calendar = useWorkoutCalendar();
    const {
        data,
        isError,
        isPending,
        refetch,
        hasNextPage,
        fetchNextPage,
        isFetchingNextPage,
        isFetchNextPageError,
        isRefetching,
    } = useInfiniteQuery({
        queryKey: [
            "history-pages",
            selectedDate ? startOfDay(selectedDate).toISOString() : "all",
        ],
        initialPageParam: undefined as string | undefined,
        queryFn: ({ pageParam }) =>
            getHistoryPage(pageParam, selectedDate ?? undefined),
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    });

    const filtered = data?.pages.flatMap((page) => page.items) ?? [];
    const summary = data?.pages[0].summary;
    const workoutDates =
        calendar.data?.sessions.map(
            (session) => new Date(session.completedAt),
        ) ?? [];
    return (
        <SafeAreaScreen edges={["top", "bottom"]}>
            <FlatList
                data={isPending ? [] : filtered}
                contentContainerClassName="px-5 pb-6"
                keyExtractor={(item) => item.id}
                onEndReachedThreshold={0.4}
                onEndReached={() => {
                    if (
                        hasNextPage &&
                        !isFetchingNextPage &&
                        !isFetchNextPageError
                    )
                        void fetchNextPage();
                }}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefetching && !isFetchingNextPage}
                        onRefresh={() => {
                            void refetch();
                        }}
                    />
                }
                ListFooterComponent={
                    hasNextPage ? (
                        <Button
                            className="mt-4"
                            variant="outline"
                            isLoading={isFetchingNextPage}
                            onPress={() => fetchNextPage()}
                        >
                            {isFetchNextPageError
                                ? "Retry loading more"
                                : "Load more"}
                        </Button>
                    ) : null
                }
                ItemSeparatorComponent={() => <View className="h-3" />}
                ListEmptyComponent={
                    isPending ? (
                        <HistorySkeleton />
                    ) : isError ? (
                        <EmptyState
                            message="Could not load history"
                            onRetry={refetch}
                        />
                    ) : (
                        <EmptyState
                            icon="calendar"
                            message={
                                selectedDate
                                    ? "No workouts on this day"
                                    : "No workouts yet. Complete a workout"
                            }
                        />
                    )
                }
                ListHeaderComponent={
                    <View>
                        <Text className="pt-3 font-inter-bold text-2xl text-foreground">
                            History
                        </Text>
                        <View>
                            {/* {Weekly calendar} */}
                            <WeekCalendar
                                markedDates={workoutDates}
                                onChange={setSelectedDate}
                                value={selectedDate ?? startOfDay(new Date())}
                            />
                            {calendar.isError && !calendar.data && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onPress={() => calendar.refetch()}
                                >
                                    Retry calendar activity
                                </Button>
                            )}
                        </View>

                        <View className="my-5 flex-row gap-3">
                            {isPending ? (
                                <>
                                    <Skeleton className="h-20 flex-1 rounded-xl" />
                                    <Skeleton className="h-20 flex-1 rounded-xl" />
                                </>
                            ) : (
                                <>
                                    <SummaryCard
                                        label="Workouts"
                                        value={String(summary?.workouts ?? 0)}
                                    />

                                    <SummaryCard
                                        label="Total Time"
                                        value={formatDuration(
                                            summary?.totalTimeSeconds ?? 0,
                                        )}
                                    />
                                </>
                            )}
                        </View>
                        <View className="mb-3 flex-row items-center justify-between">
                            <Text className="font-inter-bold text-base text-foreground">
                                Recent Workouts
                            </Text>
                            {selectedDate && (
                                <Pressable
                                    accessibilityRole="button"
                                    className="rounded-full border border-border bg-card px-3 py-1.5 active:bg-muted"
                                    onPress={() => setSelectedDate(null)}
                                >
                                    <Text className="font-inter-medium text-[11px] text-primary">
                                        Reset
                                    </Text>
                                </Pressable>
                            )}
                        </View>
                    </View>
                }

                renderItem={({ item }) => (
                    <HistoryCard
                        item={item}
                        onPress={() =>
                            router.push({
                                pathname: "/history/[id]",
                                params: { id: item.id },
                            })
                        }
                    />
                )}
                showsVerticalScrollIndicator={false}
            />
        </SafeAreaScreen>
    );
};

function HistoryCard({
    item,
    onPress,
}: {
    item: HistorySessionItem;
    onPress: () => void;
}) {
    const muted = useAppThemeColor("mutedForeground");

    return (
        <Pressable
            className="flex-row items-center rounded-xl border border-border bg-card shadow-xs p-3 active:bg-muted"
            onPress={onPress}
        >
            {item.image ? (
                <Image
                    className="h-16 w-20 rounded-lg bg-muted"
                    resizeMode="cover"
                    source={{ uri: item.image }}
                />
            ) : (
                <View className="h-16 w-20 items-center justify-center rounded-lg bg-muted">
                    <Feather color={muted} name="image" size={20} />
                </View>
            )}
            <View className="ml-3 flex-1">
                <Text className="font-inter-semibold text-[14px] text-foreground">
                    {item.workoutName}
                </Text>
                <Text className="mt-1 font-inter text-[11.5px] text-muted-foreground">
                    {formatSessionDate(item.completedAt)}
                </Text>
                <Text className="mt-1 font-inter text-[11.5px] text-muted-foreground">
                    {item.exerciseCount} exercises • {item.setCount} sets •{" "}
                    {formatDuration(item.durationSeconds)}
                </Text>
            </View>
            <Feather color={muted} name="chevron-right" size={20} />
        </Pressable>
    );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
    return (
        <View className="flex-1 rounded-xl border border-border bg-card p-4 shadow-xs">
            <Text className="font-inter text-[12px] text-muted-foreground">
                {label}
            </Text>
            <Text className="mt-2 font-inter-bold text-[20px] text-foreground">
                {value}
            </Text>
        </View>
    );
}

function HistorySkeleton() {
    return (
        <View>
            {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton className="mb-3 h-24 w-full rounded-xl" key={index} />
            ))}
        </View>
    );
}

export default History;
