import { isSameDay } from "date-fns";
import type { HomeStats, WorkoutCalendarDates } from "./api";

export function calendarStats(
  calendar: WorkoutCalendarDates | null | undefined,
  date: Date,
): HomeStats | undefined {
  if (!calendar) return;
  const sessions = calendar.sessions.filter((session) =>
    isSameDay(new Date(session.startedAt), date),
  );
  const totalTimeSeconds = sessions.reduce(
    (sum, session) => sum + session.durationSeconds,
    0,
  );
  return {
    workouts: sessions.length,
    totalTimeSeconds,
    avgTimeSeconds: sessions.length
      ? Math.round(totalTimeSeconds / sessions.length)
      : 0,
  };
}
