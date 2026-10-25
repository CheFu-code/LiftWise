import { workoutHaptic } from "@/lib/workout-haptics";
import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { syncRestAlert } from "@/lib/workout-reminders";
import { showToast } from "@/lib/toast-store";

export function useWorkoutTimer(options?: { userId?: string; restAlerts?: boolean; sound?: boolean }) {
  const preferences = useRef(options);
  preferences.current = options;
  const alertKey = useRef("");
  if (!alertKey.current) alertKey.current = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [rest, setRest] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const accumulatedRef = useRef(0);
  const lastResumeAt = useRef(Date.now());
  const isPausedRef = useRef(false);
  const restEndsAt = useRef<number | null>(null);

  useEffect(() => {
    void syncRestAlert(options?.userId, alertKey.current, options?.restAlerts ? restEndsAt.current ?? undefined : undefined, options?.sound !== false).catch(() => undefined);
  }, [options?.userId, options?.restAlerts, options?.sound]);
  useEffect(() => () => { void syncRestAlert(undefined, alertKey.current).catch(() => undefined); }, []);

  useEffect(() => {
    if (!isPaused) lastResumeAt.current = Date.now();

    const tick = () => {
      if (!isPaused)
        setElapsed(
          accumulatedRef.current + (Date.now() - lastResumeAt.current) / 1000,
        );
      if (restEndsAt.current !== null) {
        const remaining = Math.max(0, (restEndsAt.current - Date.now()) / 1000);
        setRest(remaining);
        if (remaining === 0) {
          const overdue = Date.now() - restEndsAt.current;
          restEndsAt.current = null;
          if (AppState.currentState === "active" && overdue <= 2000) workoutHaptic("rest");
        }
      }
    };
    let timer: ReturnType<typeof setInterval> | undefined;
    const update = () => {
      clearInterval(timer);
      tick();
      if (AppState.currentState === "active") timer = setInterval(tick, 1000);
    };
    update();
    const subscription = AppState.addEventListener("change", update);
    return () => { clearInterval(timer); subscription.remove(); };
  }, [isPaused]);

  const pause = () => {
    if (isPausedRef.current) return;
    accumulatedRef.current += (Date.now() - lastResumeAt.current) / 1000;
    isPausedRef.current = true;
    setIsPaused(true);
  };

  const resume = () => {
    if (!isPausedRef.current) return;
    lastResumeAt.current = Date.now();
    isPausedRef.current = false;
    setIsPaused(false);
  };

  const togglePause = () => {
    if (isPausedRef.current) resume();
    else pause();
  };

  const startRest = (seconds: number) => {
    const duration = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
    restEndsAt.current = duration > 0 ? Date.now() + duration * 1000 : null;
    setRest(duration);
    const pref = preferences.current;
    if (pref?.restAlerts && duration > 0) void syncRestAlert(pref.userId, alertKey.current, restEndsAt.current ?? undefined, pref.sound !== false).catch(() => showToast("Unable to schedule the rest alert. The timer still works in the app."));
    else void syncRestAlert(undefined, alertKey.current).catch(() => undefined);
  };

  const skipRest = () => {
    restEndsAt.current = null;
    setRest(0);
    void syncRestAlert(undefined, alertKey.current).catch(() => undefined);
  };

  const restore = (snapshot: { startedAt: number; elapsed: number; paused: boolean; savedAt: number }) => {
    setStartedAt(snapshot.startedAt);
    accumulatedRef.current = snapshot.elapsed + (snapshot.paused ? 0 : Math.max(0, Date.now() - snapshot.savedAt) / 1000);
    lastResumeAt.current = Date.now();
    isPausedRef.current = snapshot.paused;
    setIsPaused(snapshot.paused);
    setElapsed(accumulatedRef.current);
  };

  return {
    elapsed,
    isPaused,
    pause,
    rest,
    resume,
    startedAt,
    skipRest,
    startRest,
    togglePause,
    restore,
  };
}
