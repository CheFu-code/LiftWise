import type { QueryClient } from "@tanstack/react-query";
import type { WorkoutDetail, WorkoutListItem } from "./api";

type Change = { image: string } | { exerciseIds: string[] } | { deleted: true };
const pending = new WeakMap<QueryClient, number>();

// Update every cached list (including Home) and the open detail together.
export async function optimisticWorkoutChange(
  client: QueryClient,
  id: string,
  change: Change,
) {
  await client.cancelQueries({ queryKey: ["workouts"] });
  const undo: (() => void)[] = [];
  const queries = client.getQueryCache().findAll({ queryKey: ["workouts"] });
  for (const query of queries) {
    const previous = query.state.data as
      WorkoutDetail | WorkoutListItem[] | null | undefined;
    if (!previous) continue;
    let next: typeof previous = previous;
    if (Array.isArray(previous)) {
      if ("exerciseIds" in change || !previous.some((item) => item.id === id))
        continue;
      next =
        "deleted" in change
          ? previous.filter((item) => item.id !== id)
          : previous.map((item) =>
              item.id === id ? { ...item, image: change.image } : item,
            );
    } else if (previous.id === id && !("deleted" in change)) {
      if ("image" in change) next = { ...previous, image: change.image };
      else {
        const byId = new Map(
          previous.exercises.map((exercise) => [exercise.id, exercise]),
        );
        next = {
          ...previous,
          exercises: change.exerciseIds.map((exerciseId) =>
            byId.get(exerciseId)!,
          ),
        };
      }
    }
    if (next === previous) continue;
    client.setQueryData(query.queryKey, next);
    // Capture React Query's structurally shared result for the ownership check.
    const applied = client.getQueryData(query.queryKey) as typeof previous;
    undo.push(() => {
      // Do not restore data after sign-out. Only undo the affected row/field.
      if (
        client
          .getQueryCache()
          .find({ queryKey: query.queryKey, exact: true }) !== query
      )
        return;
      client.setQueryData(query.queryKey, (current: typeof previous) => {
        if (!current) return current;
        if (
          Array.isArray(previous) &&
          Array.isArray(current) &&
          Array.isArray(applied)
        ) {
          const original = previous.find((item) => item.id === id)!;
          if ("deleted" in change) {
            if (current.some((item) => item.id === id)) return current;
            const restored = [...current];
            restored.splice(
              Math.min(previous.indexOf(original), restored.length),
              0,
              original,
            );
            return restored;
          }
          const optimistic = applied.find((item) => item.id === id);
          return current.map((item) =>
            item.id === id && item.image === optimistic?.image
              ? { ...item, image: original.image }
              : item,
          );
        }
        if (
          !Array.isArray(previous) &&
          !Array.isArray(current) &&
          !Array.isArray(applied)
        ) {
          if ("image" in change && current.image === applied.image)
            return { ...current, image: previous.image };
          if (
            "exerciseIds" in change &&
            current.exercises === applied.exercises
          )
            return { ...current, exercises: previous.exercises };
        }
        return current;
      });
    });
  }
  pending.set(client, (pending.get(client) ?? 0) + 1);
  let settled = false;
  return Object.assign(() => undo.forEach((restore) => restore()), {
    settle() {
      if (settled) return;
      settled = true;
      const remaining = (pending.get(client) ?? 1) - 1;
      pending.set(client, remaining);
      // Refetch only after every optimistic workout write has settled.
      if (
        remaining === 0 &&
        client
          .getQueryCache()
          .findAll({ queryKey: ["workouts"] })
          .some((query) => queries.includes(query))
      )
        void client.invalidateQueries({ queryKey: ["workouts"] });
    },
  });
}
