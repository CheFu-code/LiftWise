import type { QueryClient } from "@tanstack/react-query";
import type { WorkoutDetail, WorkoutListItem } from "./api";

export function cacheCreatedWorkout(
  client: QueryClient,
  workout: WorkoutDetail,
) {
  client.setQueryData(["workouts", workout.id], workout);
  const summary: WorkoutListItem = {
    id: workout.id,
    name: workout.name,
    image: workout.image,
    muscles: workout.muscles,
    exerciseCount: workout.exercises.length,
    totalSets: workout.exercises.reduce(
      (total, exercise) => total + (exercise.sets ?? 0),
      0,
    ),
  };
  // A partial list must never masquerade as a complete downloaded list.
  client.setQueryData<WorkoutListItem[]>(["workouts"], (current) =>
    current
      ? [summary, ...current.filter((item) => item.id !== summary.id)]
      : undefined,
  );
}
