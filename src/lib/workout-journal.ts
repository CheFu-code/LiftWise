import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SaveSessionInput } from "./api";

export type WorkoutDraft = {
  requestId: string;
  workoutId: string;
  startedAt: number;
  elapsed: number;
  paused: boolean;
  savedAt: number;
  weightUnit: "kg" | "lb";
  completed: string[];
  values: Record<string, { reps?: string; weight?: string }>;
};
export type PendingCompletion = {
  input: SaveSessionInput & { requestId: string };
  attempts: number;
  nextAttempt: number;
  blocked?: boolean;
};
type Journal = {
  version: 1;
  uid: string;
  drafts: Record<string, WorkoutDraft>;
  pending: Record<string, PendingCompletion>;
};
const listeners = new Set<() => void>();
let writes: Promise<unknown> = Promise.resolve();
const key = (uid: string) => `liftwise-workout-journal-v1:${encodeURIComponent(uid)}`;

// One serialized durable journal owns drafts and completion retries. Never persist tokens.
async function read(uid: string): Promise<Journal> {
  const raw = await AsyncStorage.getItem(key(uid));
  if (!raw) return { version: 1, uid, drafts: {}, pending: {} };
  const value = JSON.parse(raw) as Journal;
  if (value.version !== 1 || value.uid !== uid || !value.drafts || !value.pending)
    throw new Error("Unable to read saved workout progress.");
  return value;
}
function change<T>(uid: string, update: (journal: Journal) => T): Promise<T> {
  const operation = writes.catch(() => undefined).then(async () => {
    const journal = await read(uid);
    const result = update(journal);
    const raw = JSON.stringify(journal);
    if (raw.length > 2_000_000) throw new Error("Local workout storage is full. Sync pending workouts first.");
    await AsyncStorage.setItem(key(uid), raw);
    listeners.forEach((listener) => listener());
    return result;
  });
  writes = operation;
  return operation;
}
export async function readWorkoutJournal(uid: string) {
  await writes.catch(() => undefined);
  return read(uid);
}
export const subscribeWorkoutJournal = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
export const saveWorkoutDraft = (uid: string, draft: WorkoutDraft) => change(uid, (journal) => {
  if (!journal.pending[draft.requestId]) journal.drafts[draft.workoutId] = draft;
});
export const discardWorkoutDraft = (uid: string, workoutId: string, requestId: string) => change(uid, (journal) => {
  if (journal.drafts[workoutId]?.requestId === requestId) delete journal.drafts[workoutId];
});
export const enqueueWorkoutCompletion = (uid: string, input: SaveSessionInput & { requestId: string }) => change(uid, (journal) => {
  const existing = journal.pending[input.requestId];
  if (existing && JSON.stringify(existing.input) !== JSON.stringify(input))
    throw new Error("This workout is already waiting to sync.");
  if (!existing && Object.keys(journal.pending).length >= 100)
    throw new Error("Sync pending workouts before finishing another workout.");
  journal.pending[input.requestId] = existing ?? { input, attempts: 0, nextAttempt: 0 };
  if (journal.drafts[input.workoutId]?.requestId === input.requestId) delete journal.drafts[input.workoutId];
});
export const acknowledgeCompletion = (uid: string, requestId: string) => change(uid, (journal) => {
  delete journal.pending[requestId];
});
export const postponeCompletion = (uid: string, requestId: string, blocked: boolean) => change(uid, (journal) => {
  const entry = journal.pending[requestId];
  if (!entry) return;
  entry.attempts++;
  entry.blocked = blocked;
  entry.nextAttempt = Date.now() + Math.min(300_000, 2000 * 2 ** Math.min(entry.attempts, 8)) * (0.75 + Math.random() * 0.5);
});
export const retryBlockedCompletions = (uid: string) => change(uid, (journal) => {
  Object.values(journal.pending).forEach((entry) => { entry.blocked = false; entry.nextAttempt = 0; });
});
