import { useWorkoutDraft } from "@/contexts/workout-draft-context";
import { useDebounce } from "@/hooks/use-debounce";
import { ExerciseItem, getExercisesQueryFn } from "@/lib/api";
import { useAppThemeColor } from "@/theme/app-theme";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import ExercisesUI from "./ui/ExercisesUI";

const Index = () => {
    const router = useRouter();
    const [query, setQuery] = useState("");
    const search = useDebounce<string>(query);
    const muted = useAppThemeColor("mutedForeground");
    const primary = useAppThemeColor("primary");

    const [selectedExercises, setSelectedExercises] = useWorkoutDraft();

    const {
        data: exercises = [],
        isError,
        isPending,
        isRefetching,
        refetch,
    } = useQuery({
        queryKey: ["exercises", search],
        queryFn: () => getExercisesQueryFn(search),
    });

    const toggleExercise = (exercise: ExerciseItem) => {
        setSelectedExercises((prev) =>
            prev.some(({ id }) => id === exercise.id)
                ? prev.filter(({ id }) => id !== exercise.id)
                : [
                    ...prev,
                    {
                        ...exercise,
                        reps: 10,
                        rest: 90,
                        sets: 3,
                    },
                ],
        );
    };

    return (
        <ExercisesUI
            exercises={exercises}
            isPending={isPending}
            muted={muted}
            isError={isError}
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
