import WorkoutExerciseList from "@/components/workout-exercise-list";
import Button from "@/components/ui/button";
import EmptyState from "@/components/ui/empty-state";
import SafeAreaScreen from "@/components/ui/safe-area-screen";
import Skeleton from "@/components/ui/skeleton";
import { useActionModal } from "@/components/ui/action-modal";
import {
    deleteWorkoutMutationFn,
    changeWorkoutCoverMutationFn,
    type WorkoutDetail,
    getWorkoutQueryFn,
    reorderWorkoutExercisesMutationFn,
} from "@/lib/api";
import { useAppThemeColor } from "@/theme/app-theme";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
    ActivityIndicator,
    BackHandler,
    Platform,
    StyleSheet,
    useWindowDimensions,
    Image,
    Linking,
    Pressable,
    ScrollView,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const Index = () => {
    const router = useRouter();
    const showModal = useActionModal();
    const queryClient = useQueryClient();
    const [busy, setBusy] = useState(false);
    const [dragging, setDragging] = useState(false);
    const inFlight = useRef(false);
    const screenRef = useRef<View>(null);
    const menuButtonRef = useRef<View>(null);
    const [menuTop, setMenuTop] = useState<number | null>(null);
    const { width, height } = useWindowDimensions();
    const foreground = useAppThemeColor("foreground");
    const destructive = useAppThemeColor("destructive");
    const menuOpen = menuTop !== null;

    useEffect(() => {
        setMenuTop(null);
    }, [width, height]);
    useEffect(() => {
        if (!menuOpen) return;
        const back = BackHandler.addEventListener("hardwareBackPress", () => {
            setMenuTop(null);
            return true;
        });
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") setMenuTop(null);
        };
        if (Platform.OS === "web")
            document.addEventListener("keydown", onKeyDown);
        return () => {
            back.remove();
            if (Platform.OS === "web")
                document.removeEventListener("keydown", onKeyDown);
        };
    }, [menuOpen]);
    const { id } = useLocalSearchParams<{ id: string }>();
    const mutedForeground = useAppThemeColor("mutedForeground");
    const {
        data: workout,
        isError,
        isPending,
        refetch,
    } = useQuery({
        queryKey: ["workouts", id],
        queryFn: () => getWorkoutQueryFn(id),
        enabled: Boolean(id),
    });

    const exercises = workout?.exercises ?? [];
    const totalSets = exercises.reduce(
        (sum, exercise) => sum + (exercise.sets ?? 0),
        0,
    );

    const stats = [
        { icon: "list", label: `${exercises.length} Exercises` },
        { icon: "layers", label: `${totalSets} Sets` },
    ] as const;

    const saveExerciseOrder = async (exerciseIds: string[]) => {
        if (!workout || inFlight.current) return;
        inFlight.current = true;
        setBusy(true);
        const queryKey = ["workouts", id];
        try {
            await queryClient.cancelQueries({ queryKey, exact: true });
            const byId = new Map(
                workout.exercises.map((exercise) => [exercise.id, exercise]),
            );
            queryClient.setQueryData(queryKey, {
                ...workout,
                exercises: exerciseIds.map((exerciseId) =>
                    byId.get(exerciseId)!,
                ),
            });
            await reorderWorkoutExercisesMutationFn(id, exerciseIds);
        } catch (cause) {
            queryClient.setQueryData(queryKey, workout);
            showModal(
                "Unable to save exercise order",
                cause instanceof Error ? cause.message : "Please try again.",
            );
        } finally {
            await queryClient.invalidateQueries({ queryKey, exact: true });
            inFlight.current = false;
            setBusy(false);
        }
    };

    const runAction = async (action: "cover" | "delete") => {
        if (!workout || inFlight.current) return;
        inFlight.current = true;
        setBusy(true);
        try {
            if (action === "cover") {
                if (Platform.OS !== "web") {
                    const permission =
                        await ImagePicker.requestMediaLibraryPermissionsAsync();
                    if (!permission.granted) {
                        showModal(
                            "Photo permission needed",
                            "Allow photo access in Settings to choose a workout cover.",
                            [
                                { text: "Cancel", style: "cancel" },
                                {
                                    text: "Open Settings",
                                    onPress: Linking.openSettings,
                                },
                            ],
                        );
                        return;
                    }
                }
                const result = await ImagePicker.launchImageLibraryAsync({
                    allowsEditing: true,
                    aspect: [16, 9],
                    base64: true,
                    mediaTypes: ["images"],
                    quality: 0.6,
                });
                if (result.canceled) return;
                const image = result.assets?.[0]?.base64;
                if (!image)
                    throw new Error(
                        "Unable to read that photo. Please choose another image.",
                    );
                if (image.length > 2_800_000)
                    throw new Error(
                        "Please choose an image smaller than 2 MB.",
                    );
                const updated = await changeWorkoutCoverMutationFn(id, image);
                await queryClient.cancelQueries({
                    queryKey: ["workouts", id],
                    exact: true,
                });
                queryClient.setQueryData<WorkoutDetail | null>(
                    ["workouts", id],
                    (current) =>
                        current
                            ? { ...current, image: updated.image }
                            : current,
                );
                await queryClient.invalidateQueries({ queryKey: ["workouts"] });
            } else {
                await deleteWorkoutMutationFn(id);
                await queryClient.cancelQueries({
                    queryKey: ["workouts", id],
                    exact: true,
                });
                router.replace("/workouts");
                queryClient.removeQueries({
                    queryKey: ["workouts", id],
                    exact: true,
                });
                await queryClient.invalidateQueries({ queryKey: ["workouts"] });
            }
        } catch (cause) {
            showModal(
                action === "cover"
                    ? "Unable to change cover image"
                    : "Unable to delete workout",
                cause instanceof Error ? cause.message : "Please try again.",
            );
        } finally {
            inFlight.current = false;
            setBusy(false);
        }
    };
    const openActions = () => {
        if (!workout || inFlight.current) return;
        if (menuOpen) {
            setMenuTop(null);
            return;
        }
        if (screenRef.current)
            menuButtonRef.current?.measureLayout(
                screenRef.current,
                (_x, y, _width, buttonHeight) =>
                    setMenuTop(y + buttonHeight + 8),
            );
    };
    const confirmDelete = () => {
        setMenuTop(null);
        if (!workout) return;
        showModal(
            "Delete workout?",
            `Remove ?${workout.name}? from your workouts? Completed workout history will be kept.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete workout",
                    style: "destructive",
                    onPress: () => runAction("delete"),
                },
            ],
        );
    };

    if (isPending) return <WorkoutDetailSkeleton />;

    return (
        <View ref={screenRef} collapsable={false} style={{ flex: 1 }}>
            <SafeAreaScreen
                edges={["bottom"]}
                accessibilityElementsHidden={menuOpen}
                importantForAccessibility={
                    menuOpen ? "no-hide-descendants" : "auto"
                }
            >
                <ScrollView
                    className="flex-1"
                    contentContainerClassName="pb-8"
                    showsVerticalScrollIndicator={false}
                    scrollEnabled={!dragging}
                    onScrollBeginDrag={() => setMenuTop(null)}
                >
                    <View className="h-80 bg-muted">
                        {workout?.image ? (
                            <>
                                <Image
                                    className="h-full w-full"
                                    resizeMode="cover"
                                    source={{ uri: workout.image }}
                                />
                                <View className="absolute inset-0 bg-black/20" />
                            </>
                        ) : (
                            <View className="h-full items-center justify-center bg-muted">
                                <Feather
                                    color={mutedForeground}
                                    name="image"
                                    size={40}
                                />
                            </View>
                        )}
                    </View>

                    <SafeAreaView
                        className="absolute inset-x-0 top-0"
                        edges={["top"]}
                    >
                        <View className="h-14 flex-row items-center justify-between px-4">
                            <Pressable
                                className="h-11 w-11 items-center justify-center rounded-full bg-black/40 active:opacity-70"
                                onPress={router.back}
                            >
                                <Feather
                                    color="white"
                                    name="arrow-left"
                                    size={23}
                                />
                            </Pressable>
                            <Pressable
                                accessibilityRole="button"
                                ref={menuButtonRef}
                                accessibilityLabel="Workout actions"
                                aria-haspopup="menu"
                                accessibilityState={{
                                    disabled: busy || !workout,
                                    expanded: menuOpen,
                                    busy,
                                }}
                                disabled={busy || dragging || !workout}
                                onPress={openActions}
                                className="h-11 w-11 items-center justify-center rounded-full bg-black/40 active:opacity-70"
                            >
                                {busy ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Feather
                                        color="white"
                                        name="more-horizontal"
                                        size={23}
                                    />
                                )}
                            </Pressable>
                        </View>
                    </SafeAreaView>

                    {isError ? (
                        <EmptyState
                            message="Could not load this workout"
                            onRetry={refetch}
                        />
                    ) : (
                        <View className="px-5">
                            <Text className="mt-4 font-inter-bold text-[24px] text-foreground">
                                {workout?.name}
                            </Text>
                            {Boolean(workout?.muscles) && (
                                <Text className="mt-1 font-inter capitalize text-[13px] text-muted-foreground">
                                    {workout?.muscles}
                                </Text>
                            )}

                            <View className="mt-4 flex-row gap-5">
                                {stats.map((stat) => (
                                    <View
                                        className="flex-row items-center gap-1.5"
                                        key={stat.label}
                                    >
                                        <Feather
                                            color={mutedForeground}
                                            name={stat.icon}
                                            size={14}
                                        />
                                        <Text className="font-inter text-[12px] text-muted-foreground">
                                            {stat.label}
                                        </Text>
                                    </View>
                                ))}
                            </View>

                            <Button
                                disabled={busy || dragging || !workout}
                                className="mt-5"
                                leftIcon={
                                    <Feather
                                        color="white"
                                        name="play"
                                        size={17}
                                    />
                                }
                                onPress={() =>
                                    router.push({
                                        pathname: "/workout/[id]/active",
                                        params: { id },
                                    })
                                }
                            >
                                Start Workout
                            </Button>

                            <View>
                                <Text className="mb-3 mt-6 font-inter-bold text-[16px] text-foreground">
                                    Exercises
                                </Text>
                                {exercises.length > 1 && (
                                    <Text className="mb-3 font-inter text-[12px] text-muted-foreground">
                                        Drag the handles to reorder. Changes
                                        save automatically.
                                    </Text>
                                )}
                                {exercises.length === 0 ? (
                                    <EmptyState
                                        icon="activity"
                                        message="No exercises in this workout"
                                    />
                                ) : (
                                    <WorkoutExerciseList
                                        exercises={exercises}
                                        disabled={busy}
                                        onReorder={(ids) => {
                                            void saveExerciseOrder(ids);
                                        }}
                                        onDraggingChange={setDragging}
                                    />
                                )}
                            </View>
                        </View>
                    )}
                </ScrollView>
            </SafeAreaScreen>
            {menuOpen && (
                <View style={StyleSheet.absoluteFill}>
                    <Pressable
                        cssInterop={false}
                        style={StyleSheet.absoluteFill}
                        accessibilityRole="button"
                        accessibilityLabel="Close workout actions"
                        onPress={() => setMenuTop(null)}
                    />
                    <View
                        accessibilityRole="menu"
                        accessibilityViewIsModal
                        onAccessibilityEscape={() => setMenuTop(null)}
                        className="absolute overflow-hidden rounded-xl border border-border bg-card shadow-lg"
                        style={{
                            top: menuTop,
                            right: 16,
                            width: Math.min(220, width - 32),
                        }}
                    >
                        <Pressable
                            accessibilityRole="menuitem"
                            className="min-h-12 flex-row items-center gap-3 px-4 py-3 active:bg-muted"
                            onPress={() => {
                                setMenuTop(null);
                                void runAction("cover");
                            }}
                        >
                            <Feather
                                name="image"
                                size={18}
                                color={foreground}
                            />
                            <Text className="flex-1 font-inter-medium text-[14px] text-foreground">
                                Change cover image
                            </Text>
                        </Pressable>
                        <Pressable
                            accessibilityRole="menuitem"
                            className="min-h-12 flex-row items-center gap-3 border-t border-border px-4 py-3 active:bg-muted"
                            onPress={confirmDelete}
                        >
                            <Feather
                                name="trash-2"
                                size={18}
                                color={destructive}
                            />
                            <Text className="flex-1 font-inter-medium text-[14px] text-destructive">
                                Delete
                            </Text>
                        </Pressable>
                    </View>
                </View>
            )}
        </View>
    );
};

function WorkoutDetailSkeleton() {
    return (
        <ScrollView
            className="flex-1"
            contentInsetAdjustmentBehavior="never"
            contentContainerClassName="pb-8"
            showsVerticalScrollIndicator={false}
        >
            <View className="h-64">
                <Skeleton className="h-full w-full rounded-none" />
                <SafeAreaView
                    className="absolute inset-x-0 top-0"
                    edges={["top"]}
                >
                    <View className="h-14 flex-row items-center justify-between px-4">
                        <Skeleton className="h-11 w-11 rounded-full" />
                        <Skeleton className="h-11 w-11 rounded-full" />
                    </View>
                </SafeAreaView>
            </View>

            <View className="px-5">
                <Skeleton className="mt-4 h-8 w-2/3 rounded-lg" />
                <Skeleton className="mt-2 h-4 w-1/2 rounded-md" />
                <View className="mt-4 flex-row gap-5">
                    <Skeleton className="h-4 w-20 rounded-md" />
                    <Skeleton className="h-4 w-16 rounded-md" />
                    <Skeleton className="h-4 w-16 rounded-md" />
                </View>
                <Skeleton className="mt-5 h-14 rounded-xl" />
            </View>
        </ScrollView>
    );
}

export default Index;
