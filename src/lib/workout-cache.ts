import type { QueryClient } from "@tanstack/react-query";
import type { WorkoutDetail, WorkoutListItem } from "./api";
import type { WorkoutPage } from "./api";
import type { InfiniteData } from "@tanstack/react-query";

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
  client.setQueryData<WorkoutListItem[]>(["workouts", "recent"], (current) => current ? [summary, ...current.filter((item) => item.id !== summary.id)].slice(0, 4) : undefined);
  client.setQueryData<InfiniteData<WorkoutPage>>(["workouts", "pages"], (current) => current ? {
    ...current,
    pages: current.pages.map((page, index) => ({ ...page, items: index === 0 ? [summary, ...page.items.filter((item) => item.id !== summary.id)] : page.items.filter((item) => item.id !== summary.id) })),
  } : undefined);
}
