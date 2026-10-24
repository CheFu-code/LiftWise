import { useEffect } from "react";
import { AppState } from "react-native";
import { onlineManager, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/chefu-auth";
import { createWorkoutSessionMutationFn } from "@/lib/api";
import { readSession } from "@/lib/chefu-session";
import { acknowledgeCompletion, postponeCompletion, readWorkoutJournal, subscribeWorkoutJournal } from "@/lib/workout-journal";
import { showToast } from "@/lib/toast-store";

export default function WorkoutCompletionSync() {
  const { userId } = useAuth();
  const client = useQueryClient();
  useEffect(() => {
    if (!userId) return;
    let active = true;
    let running = false;
    let dirty = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let warned = false;
    const sync = async () => {
      if (!active || running || !onlineManager.isOnline() || AppState.currentState !== "active") return;
      running = true;
      clearTimeout(timer);
      try {
        const journal = await readWorkoutJournal(userId);
        if (!active) return;
        let next = Infinity;
        for (const entry of Object.values(journal.pending)) {
          if (!active || (await readSession())?.user.uid !== userId) break;
          if (entry.blocked) {
            if (!warned) showToast("A workout needs attention before it can sync. Open History to retry.");
            warned = true;
            continue;
          }
          if (entry.nextAttempt > Date.now()) { next = Math.min(next, entry.nextAttempt); continue; }
          try {
            await createWorkoutSessionMutationFn(entry.input, userId);
            await acknowledgeCompletion(userId, entry.input.requestId);
            if (active) {
              ["history", "history-pages", "workout-calendar", "streak"].forEach((key) => {
                void client.invalidateQueries({ queryKey: [key], predicate: (query) => key !== "history" || typeof query.queryKey[1] !== "string" });
              });
              showToast("Workout synced.");
            }
          } catch (error) {
            const status = (error as { status?: number }).status;
            const blocked = status !== undefined && status >= 400 && status < 500 && status !== 408 && status !== 429;
            await postponeCompletion(userId, entry.input.requestId, blocked);
            next = Math.min(next, Date.now() + 5000);
          }
        }
        if (active && next !== Infinity) timer = setTimeout(() => void sync(), Math.max(1000, next - Date.now()));
      } catch {
        if (active && !warned) showToast("Unable to read saved workouts. Your local progress has been kept.");
        warned = true;
      } finally {
        running = false;
        if (active && dirty) {
          dirty = false;
          clearTimeout(timer);
          timer = setTimeout(() => void sync(), 1000);
        }
      }
    };
    const stop = subscribeWorkoutJournal(() => { if (running) dirty = true; else void sync(); });
    const network = onlineManager.subscribe(() => { if (onlineManager.isOnline()) void sync(); });
    const app = AppState.addEventListener("change", (state) => { if (state === "active") void sync(); });
    void sync();
    return () => { active = false; clearTimeout(timer); stop(); network(); app.remove(); };
  }, [userId, client]);
  return null;
}
