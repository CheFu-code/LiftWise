import { Feather, FontAwesome6 } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
    Image,
    Pressable,
    ScrollView,
    Text,
    useWindowDimensions,
    View,
} from "react-native";

import EmptyState from "@/components/ui/empty-state";
import Skeleton from "@/components/ui/skeleton";
import { getWorkoutsQueryFn } from "@/lib/api";
import { useAppThemeColor } from "@/theme/app-theme";
import { cssInterop } from "nativewind";
import HomeSectionHeader from "./home-section-header";

cssInterop(LinearGradient, {
    className: "style",
});

export default function MyWorkouts() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const muted = useAppThemeColor("mutedForeground");
    const openWorkouts = () => router.push("/workouts");

    const {
        data: workouts = [],
        isError,
        isPending,
    } = useQuery({
        queryFn: () => getWorkoutsQueryFn(4),
        queryKey: ["workouts", { limit: 4 }],
    });

    return (
        <View className="mt-5">
            <HomeSectionHeader title="My Workouts" onViewAll={openWorkouts} />

            {isPending ? (
                <View className="flex-row gap-2">
                    {Array.from({ length: 3 }).map((_, index) => (
                        <Skeleton
                            className="h-44 rounded-xl shadow-xs"
                            key={index}
                            style={{ width: Math.max(128, (width - 56) / 3) }}
                        />
                    ))}
                </View>
            ) : workouts.length === 0 ? (
                <EmptyState
                    icon={isError ? "wifi-off" : "activity"}
                    message={
                        isError
                            ? "Could not load workouts."
                            : "Tap + to create your first workout."
                    }
                />
            ) : (
                <ScrollView
                    className="-mx-5"
                    contentContainerClassName="gap-2 px-5 py-1"
                    horizontal
                    showsHorizontalScrollIndicator={false}
                >
                    {workouts.map((workout) => (
                        <Pressable
                            className="rounded-2xl shadow-xs"
                            key={workout.id}
                            onPress={() =>
                                router.push({
                                    pathname: "/workout/[id]",
                                    params: { id: workout.id },
                                })
                            }
                            style={{ width: Math.max(128, (width - 56) / 3) }}
                        >
                            <View className="min-h-[112px] overflow-hidden rounded-2xl border border-border bg-card">
                                {workout.image ? (
                                    <Image
                                        className="h-24 w-full bg-muted"
                                        source={{ uri: workout.image }}
                                    />
                                ) : (
                                    <View className="h-24 items-center justify-center bg-muted">
                                        <Feather
                                            color={muted}
                                            name="image"
                                            size={22}
                                        />
                                    </View>
                                )}
                                <View className="px-3 pb-3 pt-2.5">
                                    <Text className="font-inter-semibold line-clamp-1 truncate text-[14px] text-foreground">
                                        {workout.name}
                                    </Text>
                                    <Text
                                        className="mt-1 font-inter capitalize text-[12px] text-muted-foreground"
                                        numberOfLines={1}
                                    >
                                        {workout.muscles}
                                    </Text>
                                    <View className="mt-2 flex-row justify-between">
                                        <View className="flex-row items-center gap-1">
                                            <FontAwesome6
                                                color={muted}
                                                name="dumbbell"
                                                size={11}
                                            />
                                            <Text className="font-inter text-[11px] text-muted-foreground">
                                                {workout.exerciseCount} exe
                                            </Text>
                                        </View>
                                        <View className="flex-row items-center gap-1">
                                            <Feather
                                                color={muted}
                                                name="layers"
                                                size={12}
                                            />
                                            <Text className="font-inter text-[11px] text-muted-foreground">
                                                {workout.totalSets} sets
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        </Pressable>
                    ))}
                </ScrollView>
            )}
        </View>
    );
}