import { Text, View } from "react-native";
import Pressable from "@/components/ui/guarded-pressable";
import { useExerciseBookmarks } from "@/hooks/use-exercise-bookmarks";
import { useAuth } from "@/lib/chefu-auth";
import { workoutDefaults } from "@/lib/workout-defaults";
import { useWorkoutDraft } from "@/contexts/workout-draft-context";
import { filterWorkouts } from "@/lib/workout-search";
import { ExerciseItem, getExercisesQueryFn } from "@/lib/api";
import { useAppThemeColor } from "@/theme/app-theme";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import ExercisesUI from "./ui/ExercisesUI";

const Index = () => {
    const { session } = useAuth();
    const defaults = workoutDefaults(session?.onboardingProfile);
    const bookmarks = useExerciseBookmarks();
    const [savedOnly, setSavedOnly] = useState(false);
    const router = useRouter();
    const [query, setQuery] = useState("");
    const muted = useAppThemeColor("mutedForeground");
    const primary = useAppThemeColor("primary");

    const [selectedExercises, setSelectedExercises] = useWorkoutDraft();

    const {
        data: catalogue,
        isError,
        isPending,
        isRefetching,
        refetch,
    } = useQuery({
        queryKey: ["exercises"],
        queryFn: () => getExercisesQueryFn(),
        select: (catalogue) => filterWorkouts(catalogue, query),
    });
    const exercises = catalogue ?? [];

    const toggleExercise = (exercise: ExerciseItem) => {
        setSelectedExercises((prev) =>
            prev.some(({ id }) => id === exercise.id)
                ? prev.filter(({ id }) => id !== exercise.id)
                : [
                      ...prev,
                      {
                          ...exercise,
                          ...defaults,
                      },
                  ],
        );
    };

    return (
        <ExercisesUI
            headerExtra={
                <View className="mb-3 gap-2">
                    <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ selected: savedOnly }}
                        disabled={bookmarks.isPending || bookmarks.isError}
                        className={
                            savedOnly
                                ? "self-start rounded-full bg-primary px-4 py-3"
                                : "self-start rounded-full bg-secondary px-4 py-3"
                        }
                        onPress={() => setSavedOnly(!savedOnly)}
                    >
                        <Text
                            className={
                                savedOnly
                                    ? "font-inter-medium text-[13px] text-primary-foreground"
                                    : "font-inter-medium text-[13px] text-foreground"
                            }
                        >
                            {savedOnly
                                ? "Saved exercises"
                                : `Saved (${bookmarks.ids.length})`}
                        </Text>
                    </Pressable>
                    {bookmarks.isError && (
                        <Pressable
                            onPress={() => {
                                void bookmarks.refetch();
                            }}
                        >
                            <Text className="font-inter text-[13px] text-destructive">
                                Couldn't load saved exercises. Tap to retry.
                            </Text>
                        </Pressable>
                    )}
                    <Text className="font-inter text-[12px] text-muted-foreground">
                        New exercises use editable defaults for your goal and
                        experience: {defaults.sets} sets, {defaults.reps} reps,{" "}
                        {defaults.rest}s rest.
                    </Text>
                </View>
            }
            exercises={
                savedOnly
                    ? exercises.filter((exercise) =>
                          bookmarks.ids.includes(exercise.id),
                      )
                    : exercises
            }
            isPending={isPending}
            muted={muted}
            isError={isError && catalogue === undefined}
            refetch={refetch}
            router={router}
            query={query}
            setQuery={setQuery}
            primary={primary}
            selectedExercises={selectedExercises}
            toggleExercise={toggleExercise}
            isRefetching={isRefetching}
        />
    );
};

export default Index;
