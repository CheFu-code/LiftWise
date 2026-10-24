import AsyncStorage from "@react-native-async-storage/async-storage";
import { dehydrate, hydrate, type QueryClient } from "@tanstack/react-query";
import { hasPendingWorkoutChanges } from "./optimistic-workouts";

const VERSION = 1;
const MAX_AGE = 24 * 60 * 60_000;
const MAX_JSON_LENGTH = 2_000_000;
const allowed = new Set([
  "workouts",
  "history",
  "history-pages",
  "exercise-bookmarks",
  "workout-calendar",
  "streak",
  "exercises",
  "exercise",
  "exercise-instructions",
]);
const epochs = new Map<string, number>();
let writes: Promise<unknown> = Promise.resolve();
const key = (uid: string) =>
  `liftwise-query-cache-v1:${encodeURIComponent(uid)}`;

export function purgeQueryCache(uid?: string) {
  if (!uid) return Promise.resolve();
  epochs.set(uid, (epochs.get(uid) ?? 0) + 1);
  const next = writes
    .catch(() => undefined)
    .then(() => AsyncStorage.removeItem(key(uid)));
  writes = next;
  return next;
}

export async function restoreAndPersistQueries(
  client: QueryClient,
  uid: string,
  isCurrent: () => boolean,
) {
  const epoch = epochs.get(uid) ?? 0;
  const active = () => isCurrent() && (epochs.get(uid) ?? 0) === epoch;
  try {
    await writes.catch(() => undefined);
    const raw = await AsyncStorage.getItem(key(uid));
    if (raw && raw.length <= MAX_JSON_LENGTH && active()) {
      const saved = JSON.parse(raw);
      if (
        saved.version === VERSION &&
        saved.uid === uid &&
        saved.savedAt <= Date.now() &&
        Date.now() - saved.savedAt < MAX_AGE &&
        Array.isArray(saved.state?.queries)
      ) {
        saved.state.queries = saved.state.queries.filter(
          (query: { queryKey?: unknown[]; state?: { status?: string } }) =>
            Array.isArray(query.queryKey) &&
            allowed.has(String(query.queryKey[0])) &&
            query.state?.status === "success",
        );
        saved.state.mutations = [];
        hydrate(client, saved.state);
      }
    }
  } catch {
    /* A corrupt/unavailable local cache must never block sign-in. */
  }
  if (!active()) return Object.assign(() => {}, { flush: () => {} });
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  let lastSnapshot: string | undefined;
  const save = () => {
    clearTimeout(timer);
    timer = undefined;
    if (stopped || !active()) return;
    // Never persist optimistic values or in-flight mutation payloads.
    if (client.isMutating() || hasPendingWorkoutChanges(client)) {
      timer = setTimeout(save, 1000);
      return;
    }
    const state = dehydrate(client, {
      shouldDehydrateMutation: () => false,
      shouldDehydrateQuery: (query) =>
        query.state.data !== undefined &&
        allowed.has(String(query.queryKey[0])),
    });
    // A failed background refresh must not discard the last confirmed offline data.
    state.queries = state.queries.map((query) => ({
      ...query,
      state: {
        ...query.state,
        status: "success" as const,
        error: null,
        fetchStatus: "idle" as const,
        fetchFailureCount: 0,
        fetchFailureReason: null,
      },
    }));
    state.queries.sort((a, b) => b.state.dataUpdatedAt - a.state.dataUpdatedAt);
    state.queries = state.queries.slice(0, 50);
    let raw = JSON.stringify({
      version: VERSION,
      uid,
      savedAt: Date.now(),
      state,
    });
    while (raw.length > MAX_JSON_LENGTH && state.queries.length) {
      state.queries.pop();
      raw = JSON.stringify({
        version: VERSION,
        uid,
        savedAt: Date.now(),
        state,
      });
    }
    const snapshot = JSON.stringify(state);
    if (snapshot === lastSnapshot) return;
    writes = writes
      .catch(() => undefined)
      .then(async () => {
        if (active()) {
          await AsyncStorage.setItem(key(uid), raw);
          lastSnapshot = snapshot;
        }
      })
      .catch(() => undefined);
  };
  const schedule = () => {
    if (!timer && !stopped && active()) timer = setTimeout(save, 1000);
  };
  const unsubscribe = client.getQueryCache().subscribe(schedule);
  const unsubscribeMutations = client.getMutationCache().subscribe(schedule);
  schedule();
  return Object.assign(
    () => {
      stopped = true;
      clearTimeout(timer);
      unsubscribe();
      unsubscribeMutations();
    },
    { flush: save },
  );
}
