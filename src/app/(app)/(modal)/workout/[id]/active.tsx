import { useAuth } from "@/lib/chefu-auth";
import { fromKilograms, weightInput, type WeightUnit } from "@/lib/weight";
import { useActionModal } from "@/components/ui/action-modal";
import { useToast } from "@/components/ui/toast";
import Button from "@/components/ui/button";
import EmptyState from "@/components/ui/empty-state";
import SafeAreaScreen from "@/components/ui/safe-area-screen";
import Skeleton from "@/components/ui/skeleton";
import { useWorkoutTimer } from "@/hooks/use-workout-timer";
import {
    getWorkoutQueryFn,
    SaveSessionSet,
    WorkoutDetail,
    WorkoutExercise,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAppThemeColor } from "@/theme/app-theme";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Text, TextInput, View } from "react-native";
import * as Crypto from "expo-crypto";
import { readWorkoutJournal, saveWorkoutDraft, discardWorkoutDraft, enqueueWorkoutCompletion } from "@/lib/workout-journal";
import Pressable from "@/components/ui/guarded-pressable";
import {
    KeyboardAwareScrollView,
    KeyboardToolbar,
} from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const formatTime = (seconds: number) =>
    new Date(seconds * 1000).toISOString().slice(11, 19);

type Timer = ReturnType<typeof useWorkoutTimer>;

const ActiveSessionPage = () => {
    const showModal = useActionModal();
    const { showToast } = useToast();
    const { session } = useAuth();
    const [weightUnit, setWeightUnit] = useState<WeightUnit>(
        () => session?.onboardingProfile?.weightUnit ?? "kg",
    );
    const navigation = useNavigation();
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();

    const [completed, setCompleted] = useState<string[]>([]);
    const [restoredWorkout, setRestoredWorkout] = useState<WorkoutDetail | null>(null);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const saveLock = useRef(false);
    const confirmationLock = useRef(false);
    const timer = useWorkoutTimer();

    const valuesRef = useRef<
        Record<string, { reps?: string; weight?: string }>
    >({});
    const allowLeave = useRef(false);
    const requestId = useRef("");
    if (!requestId.current) requestId.current = Crypto.randomUUID();
    const editCheckpoint = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const [draftReady, setDraftReady] = useState(false);
    const [draftError, setDraftError] = useState(false);
    const latest = useRef({ completed, timer, weightUnit });
    latest.current = { completed, timer, weightUnit };
    const checkpoint = useRef(() => Promise.resolve());
    checkpoint.current = async () => {
        const uid = session?.user.uid;
        if (!uid || !draftReady || allowLeave.current) return;
        const current = latest.current;
        await saveWorkoutDraft(uid, {
            workout,
            requestId: requestId.current, workoutId: id,
            startedAt: current.timer.startedAt, elapsed: current.timer.elapsed,
            paused: current.timer.isPaused, savedAt: Date.now(),
            weightUnit: current.weightUnit, completed: current.completed,
            values: { ...valuesRef.current },
        });
    };
    useEffect(() => {
        const uid = session?.user.uid;
        if (!uid || !id) return;
        let active = true;
        void readWorkoutJournal(uid).then((journal) => {
            if (!active) return;
            const draft = journal.drafts[id];
            if (draft) {
                if (draft.workout) setRestoredWorkout(draft.workout);
                requestId.current = draft.requestId;
                valuesRef.current = draft.values;
                setCompleted(draft.completed);
                setWeightUnit(draft.weightUnit);
                timer.restore(draft);
                showToast("Your workout progress has been restored.");
            }
            setDraftReady(true);
        }).catch(() => { if (active) setDraftError(true); });
        return () => { active = false; };
    }, [id, session?.user.uid]);
    useEffect(() => {
        if (!draftReady) return;
        const persist = () => void checkpoint.current().catch(() => showToast("Could not save progress on this device. Keep this workout open and try again."));
        const delay = setTimeout(persist, 500);
        const interval = setInterval(persist, 30_000);
        const app = AppState.addEventListener("change", (state) => { if (state !== "active") persist(); });
        return () => { clearTimeout(delay); clearTimeout(editCheckpoint.current); clearInterval(interval); app.remove(); };
    }, [draftReady, completed, timer.isPaused]);

    const {
        data: remoteWorkout,
        isError,
        isPending,
        refetch,
    } = useQuery({
        queryKey: ["workouts", id],
        queryFn: () => getWorkoutQueryFn(id),
        enabled: Boolean(id),
    });
    const workout = restoredWorkout ?? remoteWorkout;
    useEffect(() => {
        if (draftReady && remoteWorkout && !restoredWorkout) setRestoredWorkout(remoteWorkout);
    }, [draftReady, remoteWorkout, restoredWorkout]);

    const totalSets = (workout?.exercises ?? []).reduce(
        (sum, exercise) => sum + (exercise.sets ?? 0),
        0,
    );

    const saveSession = useCallback(async () => {
        if (!workout || saveLock.current) return false;
        saveLock.current = true;
        setIsSaving(true);
        try {
            const sets: SaveSessionSet[] = [];
            workout.exercises.forEach((exercise) => {
                for (let set = 1; set <= (exercise.sets ?? 0); set++) {
                    const key = `${exercise.id}-${set}`;
                    if (!completed.includes(key)) continue;

                    const values = valuesRef.current[key];
                    const weight = values?.weight?.trim()
                        ? weightInput(values.weight, weightUnit)
                        : (exercise.targetWeight ?? undefined);
                    sets.push({
                        exerciseId: exercise.id,
                        setNumber: set,
                        reps:
                            parseInt(values?.reps ?? "", 10) ||
                            exercise.reps ||
                            0,
                        weight,
                    });
                }
            });
            const uid = session?.user.uid;
            if (!uid) throw new Error("Sign in to save this workout.");
            await enqueueWorkoutCompletion(uid, {
                requestId: requestId.current,
                weightUnit: "kg",
                workoutId: workout.id,
                startedAt: new Date(timer.startedAt).toISOString(),
                completedAt: new Date().toISOString(),
                durationSeconds: Math.round(timer.elapsed),
                sets,
            });

            showToast("Workout saved on this device. Syncing when connected.");
            allowLeave.current = true;
            return true;
        } catch (cause) {
            showToast(
                "Failed to save workout progress. Your sets are ready to retry.",
            );
            return false;
        } finally {
            saveLock.current = false;
            setIsSaving(false);
        }
    }, [completed, timer, workout, showToast, weightUnit, session?.user.uid]);

    const saveSessionRef = useRef(saveSession);

    useEffect(() => {
        saveSessionRef.current = saveSession;
    });

    useEffect(() => {
        const unsubscribe = navigation.addListener("beforeRemove", (event) => {
            if (allowLeave.current) return;
            event.preventDefault();
            if (saveLock.current || confirmationLock.current) return;
            confirmationLock.current = true;

            const wasPaused = timer.isPaused;
            timer.pause();

            const resumeTimer = () => {
                confirmationLock.current = false;
                if (!wasPaused) timer.resume();
            };

            const leave = async () => {
                if (session?.user.uid) await discardWorkoutDraft(session.user.uid, id, requestId.current);
                confirmationLock.current = false;
                allowLeave.current = true;
                navigation.dispatch(event.data.action);
            };

            if (completed.length === 0) {
                showModal("Leave workout?", "Your progress will not be saved", [
                    {
                        text: "Cancel",
                        style: "cancel",
                        onPress: resumeTimer,
                    },
                    { text: "Leave", style: "destructive", onPress: leave },
                ]);
                return;
            }

            showModal(
                "Save progress?",
                `You completed ${completed.length} of ${totalSets} sets`,
                [
                    { text: "Cancel", style: "cancel", onPress: resumeTimer },
                    { text: "Discard", style: "destructive", onPress: leave },
                    {
                        text: "Save & Leave",
                        onPress: async () => {
                            try {
                                if (await saveSessionRef.current()) await leave();
                            } finally {
                                confirmationLock.current = false;
                            }
                        },
                    },
                ],
            );
        });

        return unsubscribe;
    }, [completed, navigation, totalSets, showModal]);

    const finishWorkout = () => {
        if (saveLock.current || confirmationLock.current) return;
        confirmationLock.current = true;
        const wasPaused = timer.isPaused;
        timer.pause();

        showModal(
            "Finish Workout?",
            `${completed.length} of ${totalSets} sets completed`,
            [
                {
                    text: "Cancel",
                    style: "cancel",
                    onPress: () => {
                        confirmationLock.current = false;
                        if (!wasPaused) timer.resume();
                    },
                },
                {
                    text: "Finish",
                    onPress: async () => {
                        try {
                            if (!(await saveSession())) return;
                            allowLeave.current = true;
                            router.replace("/history");
                        } finally {
                            confirmationLock.current = false;
                        }
                    },
                },
            ],
        );
    };

    const recordValue = (
        key: string,
        field: "reps" | "weight",
        value: string,
    ) => {
        valuesRef.current[key] = {
            ...valuesRef.current[key],
            [field]: value,
        };
        clearTimeout(editCheckpoint.current);
        editCheckpoint.current = setTimeout(() => void checkpoint.current().catch(() => showToast("Could not save your latest change on this device.")), 350);
    };

    const toggleSet = (exercise: WorkoutExercise, set: number) => {
        const key = `${exercise.id}-${set}`;
        const isDone = completed.includes(key);
        setCompleted((prev) =>
            isDone ? prev.filter((item) => item !== key) : [...prev, key],
        );
        if (!isDone) timer.startRest(exercise.rest ?? 0);
    };

    if (draftError) return <EmptyState message="Unable to restore workout progress. Restart the app to retry safely." />;
    if ((!workout && isPending) || !draftReady) return <ActiveSkeleton />;

    if (!workout) {
        return (
            <EmptyState
                message="Could not load this workout"
                onRetry={refetch}
            />
        );
    }
    return (
        <SafeAreaScreen edges={["top", "bottom"]}>
            <KeyboardAwareScrollView
                bottomOffset={24}
                className="flex-1"
                contentContainerClassName="flex-grow"
                keyboardDismissMode="interactive"
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <ActiveSession
                    savedValues={valuesRef.current}
                    isSaving={isSaving}
                    weightUnit={weightUnit}
                    completed={completed}
                    timer={timer}
                    workout={workout}
                    recordValue={recordValue}
                    toggleSet={toggleSet}
                    onFinish={finishWorkout}
                    onLeave={router.back}
                />
            </KeyboardAwareScrollView>
            <RestTimer timer={timer} />
            <KeyboardToolbar />
        </SafeAreaScreen>
    );
};

type ActiveSessionProps = {
    savedValues: Record<string, { reps?: string; weight?: string }>;
    isSaving: boolean;
    weightUnit: WeightUnit;
    completed: string[];
    onFinish: () => void;
    onLeave: () => void;
    recordValue: (key: string, field: "reps" | "weight", value: string) => void;
    timer: Timer;
    toggleSet: (exercise: WorkoutExercise, set: number) => void;
    workout: WorkoutDetail;
};

function ActiveSession({
    savedValues,
    isSaving,
    weightUnit,
    completed,
    onFinish,
    onLeave,
    recordValue,
    timer,
    toggleSet,
    workout,
}: ActiveSessionProps) {
    const muted = useAppThemeColor("mutedForeground");
    const primary = useAppThemeColor("primary");
    const [expanded, setExpanded] = useState(workout.exercises[0]?.name ?? "");

    const completedExercises = workout.exercises.filter((exercise) =>
        Array.from(
            { length: exercise.sets ?? 0 },
            (_, index) => index + 1,
        ).every((set) => completed.includes(`${exercise.id}-${set}`)),
    ).length;

    return (
        <View className="flex-1">
            <View
                className="flex-grow px-5 pb-32"
                pointerEvents={isSaving ? "none" : "auto"}
            >
                <View className="flex-row items-start justify-between pt-4">
                    <View>
                        <Text className="font-inter-bold text-[24px] text-foreground">
                            {workout.name}
                        </Text>
                        <Text className="mt-1 font-inter text-[12px] text-muted-foreground">
                            {completedExercises}/{workout.exercises.length}{" "}
                            exercises
                        </Text>
                    </View>
                    <Pressable
                        accessibilityRole="button"
                        disabled={isSaving}
                        onPress={onLeave}
                    >
                        <Text className="font-inter-semibold text-[13px] text-primary">
                            Leave
                        </Text>
                    </Pressable>
                </View>

                <View className="my-7 flex-row items-center justify-between">
                    <View>
                        <Text className="font-inter-bold text-[38px] tracking-[-1px] text-foreground">
                            {formatTime(timer.elapsed)}
                        </Text>
                        <Text className="mt-1 font-inter text-[12px] text-muted-foreground">
                            Elapsed Time
                        </Text>
                    </View>
                    <Pressable
                        accessibilityLabel={
                            timer.isPaused ? "Resume workout" : "Pause workout"
                        }
                        className="h-16 w-16 items-center justify-center rounded-full bg-primary"
                        onPress={timer.togglePause}
                    >
                        <Feather
                            color="white"
                            name={timer.isPaused ? "play" : "pause"}
                            size={26}
                        />
                    </Pressable>
                </View>

                <View className="gap-3">
                    {workout.exercises.map((exercise) => {
                        const isExpanded = expanded === exercise.name;
                        return (
                            <View
                                className="overflow-hidden rounded-xl border border-border bg-card"
                                key={exercise.id}
                            >
                                <Pressable
                                    className="flex-row items-center px-4 py-4"
                                    onPress={() =>
                                        setExpanded(
                                            isExpanded ? "" : exercise.name,
                                        )
                                    }
                                >
                                    <View className="flex-1">
                                        <Text className="font-inter-bold text-[14px] text-foreground">
                                            {exercise.name}
                                        </Text>
                                        <Text className="mt-1 font-inter text-[12px] text-muted-foreground">
                                            {exercise.sets} sets •{" "}
                                            {exercise.reps} reps •{" "}
                                            {exercise.rest}s rest
                                        </Text>
                                    </View>
                                    <Feather
                                        color={muted}
                                        name={
                                            isExpanded
                                                ? "chevron-up"
                                                : "chevron-down"
                                        }
                                        size={20}
                                    />
                                </Pressable>

                                {isExpanded && (
                                    <View className="border-t border-border">
                                        <View className="h-10 flex-row items-center px-4">
                                            {[
                                                ["SET", "w-12"],
                                                [
                                                    `WEIGHT (${weightUnit.toUpperCase()})`,
                                                    "flex-1",
                                                ],
                                                ["REPS", "flex-1"],
                                                ["STATUS", "w-14"],
                                            ].map(([label, width]) => (
                                                <Text
                                                    className={`${width} text-center font-inter-semibold text-[10px] text-muted-foreground`}
                                                    key={label}
                                                >
                                                    {label}
                                                </Text>
                                            ))}
                                        </View>

                                        {Array.from(
                                            { length: exercise.sets ?? 0 },
                                            (_, index) => index + 1,
                                        ).map((set) => {
                                            const key = `${exercise.id}-${set}`;
                                            const isDone =
                                                completed.includes(key);
                                            return (
                                                <View
                                                    className={cn(
                                                        "h-14 flex-row items-center border-t border-border px-4",
                                                        isDone && "bg-accent",
                                                    )}
                                                    key={key}
                                                >
                                                    <Text className="w-12 text-center font-inter-semibold text-[13px] text-foreground">
                                                        {set}
                                                    </Text>
                                                    <TextInput
                                                        editable={!isSaving}
                                                        className="mx-1 h-10 flex-1 rounded-lg bg-muted 
                text-center font-inter text-[13px] text-foreground"
                                                        keyboardType="decimal-pad"
                                                        defaultValue={savedValues[key]?.weight ?? ""}
                                                        onChangeText={(value) =>
                                                            recordValue(
                                                                key,
                                                                "weight",
                                                                value,
                                                            )
                                                        }
                                                        placeholder={
                                                            exercise.targetWeight
                                                                ? String(
                                                                      Math.round(
                                                                          fromKilograms(
                                                                              exercise.targetWeight,
                                                                              weightUnit,
                                                                          ) *
                                                                              100,
                                                                      ) / 100,
                                                                  )
                                                                : weightUnit
                                                        }
                                                        placeholderTextColor={
                                                            muted
                                                        }
                                                        selectionColor={primary}
                                                    />
                                                    <TextInput
                                                        editable={!isSaving}
                                                        className="mx-1 h-10 flex-1 rounded-lg bg-muted 
                text-center font-inter text-[13px] text-foreground"
                                                        defaultValue={savedValues[key]?.reps ?? String(exercise.reps)}
                                                        keyboardType="number-pad"
                                                        onChangeText={(value) =>
                                                            recordValue(
                                                                key,
                                                                "reps",
                                                                value,
                                                            )
                                                        }
                                                        placeholderTextColor={
                                                            muted
                                                        }
                                                        selectionColor={primary}
                                                    />
                                                    <Pressable
                                                        disabled={isSaving}
                                                        accessibilityLabel={`Complete set ${set}`}
                                                        className="w-14 items-center"
                                                        onPress={() =>
                                                            toggleSet(
                                                                exercise,
                                                                set,
                                                            )
                                                        }
                                                    >
                                                        <Feather
                                                            color={
                                                                isDone
                                                                    ? primary
                                                                    : muted
                                                            }
                                                            name={
                                                                isDone
                                                                    ? "check-circle"
                                                                    : "circle"
                                                            }
                                                            size={22}
                                                        />
                                                    </Pressable>
                                                </View>
                                            );
                                        })}
                                    </View>
                                )}
                            </View>
                        );
                    })}
                </View>

                <Button
                    className="mt-5"
                    onPress={onFinish}
                    size="sm"
                    isLoading={isSaving}
                >
                    {isSaving ? "Saving workout…" : "Finish Workout"}
                </Button>
            </View>
        </View>
    );
}

function RestTimer({ timer }: { timer: Timer }) {
    const insets = useSafeAreaInsets();

    if (timer.rest <= 0) return null;

    return (
        <View
            className="absolute right-5 h-28 w-28 items-center justify-center rounded-full border-4 border-slate-700 bg-slate-950 p-3 shadow-lg"
            style={{ bottom: insets.bottom + 10 }}
        >
            <Text className="font-inter text-[10px] text-white">
                Rest Timer
            </Text>
            <Text className="mt-1 font-inter-bold text-[20px] text-blue-400">
                {Math.floor(timer.rest / 60)}:
                {String(Math.floor(timer.rest % 60)).padStart(2, "0")}
            </Text>
            <Pressable onPress={timer.skipRest}>
                <Text className="mt-1 font-inter-semibold text-[10px] text-blue-400">
                    Skip
                </Text>
            </Pressable>
        </View>
    );
}

function ActiveSkeleton() {
    return (
        <SafeAreaScreen edges={["top", "bottom"]}>
            <View className="flex-1 px-5 pt-4">
                <Skeleton className="h-8 w-2/3 rounded-lg" />
                <Skeleton className="mt-2 h-4 w-24 rounded-md" />
                <Skeleton className="mt-7 h-12 w-44 rounded-lg" />
                <View className="mt-8 gap-3">
                    {Array.from({ length: 3 }).map((_, index) => (
                        <Skeleton
                            className="h-16 w-full rounded-xl"
                            key={index}
                        />
                    ))}
                </View>
            </View>
        </SafeAreaScreen>
    );
}

export default ActiveSessionPage;
