import type { QueryClient } from "@tanstack/react-query";
import type { WorkoutDetail, WorkoutListItem } from "./api";
import { optimisticWorkoutPages } from "./optimistic-workout-pages";

type Change = { image: string } | { exerciseIds: string[] } | { deleted: true };
const pending = new WeakMap<QueryClient, number>();
const refreshNeeded = new WeakMap<QueryClient, boolean>();
export const hasPendingWorkoutChanges = (client: QueryClient) =>
  (pending.get(client) ?? 0) > 0;

// Update every cached list (including Home) and the open detail together.
export async function optimisticWorkoutChange(
  client: QueryClient,
  id: string,
  change: Change,
) {
  await client.cancelQueries({ queryKey: ["workouts"] });
  const paged = optimisticWorkoutPages(client, id, change);
  const undo: (() => void)[] = [];
  const queries = client.getQueryCache().findAll({ queryKey: ["workouts"] });
  const originals = new Map(
    queries.map((query) => [
      query,
      query.state.data as WorkoutDetail | WorkoutListItem[] | null | undefined,
    ]),
  );
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
  return Object.assign(
    () => {
      paged.rollback();
      refreshNeeded.set(client, true);
      undo.forEach((restore) => restore());
    },
    {
      confirmImage(image: string) {
        paged.confirmImage(image);
        if (!("image" in change)) return;
        for (const query of queries) {
          if (
            client
              .getQueryCache()
              .find({ queryKey: query.queryKey, exact: true }) !== query
          )
            continue;
          client.setQueryData(
            query.queryKey,
            (data: WorkoutDetail | WorkoutListItem[] | undefined) => {
              const original = originals.get(query);
              if (Array.isArray(data))
                return data.map((item) =>
                  item.id === id &&
                  (item.image === change.image ||
                    (Array.isArray(original) &&
                      item.image ===
                        original.find((entry) => entry.id === id)?.image))
                    ? { ...item, image }
                    : item,
                );
              return data?.id === id &&
                (data.image === change.image ||
                  (original &&
                    !Array.isArray(original) &&
                    data.image === original.image))
                ? { ...data, image }
                : data;
            },
          );
        }
      },
      confirmOrder() {
        if (!("exerciseIds" in change)) return;
        for (const query of queries) {
          if (
            client
              .getQueryCache()
              .find({ queryKey: query.queryKey, exact: true }) !== query
          )
            continue;
          client.setQueryData(
            query.queryKey,
            (data: WorkoutDetail | WorkoutListItem[] | null | undefined) => {
              if (!data || Array.isArray(data) || data.id !== id) return data;
              const byId = new Map(
                data.exercises.map((exercise) => [exercise.id, exercise]),
              );
              if (
                data.exercises.length !== change.exerciseIds.length ||
                change.exerciseIds.some((exerciseId) => !byId.has(exerciseId))
              )
                return data;
              return {
                ...data,
                exercises: change.exerciseIds.map((exerciseId) =>
                  byId.get(exerciseId)!,
                ),
              };
            },
          );
        }
      },
      confirmDeletion() {
        paged.confirmDeletion();
        if (
          !("deleted" in change) ||
          !queries.some(
            (query) =>
              client
                .getQueryCache()
                .find({ queryKey: query.queryKey, exact: true }) === query,
          )
        )
          return;
        client.setQueriesData({ queryKey: ["workouts"] }, (data: unknown) =>
          Array.isArray(data)
            ? data.filter((item: WorkoutListItem) => item.id !== id)
            : data,
        );
      },
      settle() {
        if (settled) return;
        settled = true;
        const remaining = (pending.get(client) ?? 1) - 1;
        pending.set(client, remaining);
        // Confirmed local changes need no extra reads. A rollback reconciles once.
        if (
          remaining === 0 &&
          refreshNeeded.get(client) &&
          client
            .getQueryCache()
            .findAll({ queryKey: ["workouts"] })
            .some((query) => queries.includes(query))
        ) {
          refreshNeeded.delete(client);
          void client.invalidateQueries({ queryKey: ["workouts"] });
        }
      },
    },
  );
}
