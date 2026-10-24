import { useQuery } from "@tanstack/react-query";
import { addWeeks, startOfWeek, subDays, subWeeks } from "date-fns";
import { getWorkoutCalendarDatesQueryFn } from "@/lib/api";

export function useWorkoutCalendar() {
  const week = startOfWeek(new Date());
  // Include the preceding night for sessions that finish after midnight.
  const start = subDays(subWeeks(week, 2), 1);
  const end = addWeeks(week, 1);
  return useQuery({
    queryKey: ["workout-calendar", start.toISOString(), end.toISOString()],
    queryFn: () => getWorkoutCalendarDatesQueryFn(start, end),
  });
}
