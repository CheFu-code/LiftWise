import { addDays, startOfDay } from "date-fns";
import { API_URL, authenticatedFetch } from "./auth-client";

export type WorkoutListItem = {
    exerciseCount: number;
    id: string;
    image: string | null;
    muscles: string;
    name: string;
    totalSets: number;
};
export type WorkoutPage = { items: WorkoutListItem[]; nextCursor: string | null };
export async function getWorkoutPage(cursor?: string) {
  const params = new URLSearchParams({ limit: "20" });
  if (cursor) params.set("cursor", cursor);
  const { data, error } = await authenticatedFetch<WorkoutPage>(`${API_URL}/liftwise/workouts/page?${params}`);
  if (error || !data) throw new Error(error?.message || "Unable to load workouts.");
  return data;
}

export type CreateWorkoutInput = {
    name: string;
    description?: string;
    image?: string;
    exercises: {
        id: string;
        reps?: number;
        rest?: number;
        sets?: number;
    }[];
};

export type ExerciseItem = {
    category: string;
    description: string;
    difficulty: string;
    equipment: string | null;
    forceType: string | null;
    id: string;
    image: string | null;
    mechanics: string | null;
    muscles: string;
    name: string;
};

export type WorkoutExercise = {
    id: string;
    image: string | null;
    muscles: string;
    name: string;
    targetWeight?: number | null;
    reps?: number;
    rest?: number;
    sets?: number;
};

export type WorkoutDetail = {
    description: string | null;
    exercises: WorkoutExercise[];
    id: string;
    image: string | null;
    muscles: string;
    name: string;
};

export type SaveSessionSet = {
    exerciseId: string;
    reps: number;
    setNumber: number;
    weight?: number;
};

export type SaveSessionInput = {
    requestId?: string;
    weightUnit?: "kg";
    completedAt: string;
    durationSeconds: number;
    sets: SaveSessionSet[];
    startedAt: string;
    workoutId: string;
};

export type HistorySessionItem = {
    id: string;
    workoutId: string;
    workoutName: string;
    image: string | null;
    completedAt: string;
    durationSeconds: number;
    exerciseCount: number;
    setCount: number;
};

export type HistorySet = {
    reps: number;
    weight: number | null;
};

export type HistoryExercise = {
    id: string;
    name: string;
    image: string | null;
    sets: HistorySet[];
};

export type HistoryDetail = {
    id: string;
    image: string | null;
    workoutId: string;
    workoutName: string;
    completedAt: string;
    durationSeconds: number;
    exercises: HistoryExercise[];
    setCount: number;
    volume: number | null;
};

export type HomeStats = {
    avgTimeSeconds: number;
    totalTimeSeconds: number;
    workouts: number;
};

export type WorkoutCalendarDates = {
    workoutDates: string[];
    sessions: {
        startedAt: string;
        completedAt: string;
        durationSeconds: number;
    }[];
};
export type HistoryPage = {
    items: HistorySessionItem[];
    nextCursor: string | null;
    summary?: { workouts: number; totalTimeSeconds: number };
};

export async function createWorkoutMutationFn(data: CreateWorkoutInput) {
    const { data: result, error } = await authenticatedFetch<WorkoutDetail>(
        `${API_URL}/liftwise/workouts`,
        {
            method: "POST",
            body: JSON.stringify(data),
            headers: {
                "Content-Type": "application/json",
            },
        },
    );
    if (error) throw new Error(error.message);

    return result;
}

export async function getWorkoutsQueryFn(limit?: number) {
    const { data, error } = await authenticatedFetch<WorkoutListItem[]>(
        `${API_URL}/liftwise/workouts${limit ? `?limit=${limit}` : ""}`,
        {
            method: "GET",
        },
    );
    if (error) throw new Error(error.message);

    return data;
}

export async function getWorkoutQueryFn(id: string) {
    const { data, error } = await authenticatedFetch<WorkoutDetail>(
        `${API_URL}/liftwise/workouts/${id}`,
        {
            method: "GET",
        },
    );
    if (error) throw new Error(error.message);

    return data;
}

export async function reorderWorkoutExercisesMutationFn(
    id: string,
    exerciseIds: string[],
) {
    const { data, error } = await authenticatedFetch<{ success: boolean }>(
        `${API_URL}/liftwise/workouts/${encodeURIComponent(id)}/exercise-order`,
        {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ exerciseIds }),
        },
    );
    if (error || !data?.success)
        throw new Error(error?.message || "Unable to save exercise order.");
}

export async function changeWorkoutCoverMutationFn(id: string, image: string) {
    const { data, error } = await authenticatedFetch<{ image: string }>(
        `${API_URL}/liftwise/workouts/${encodeURIComponent(id)}/cover`,
        {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image }),
        },
    );
    if (error || !data?.image)
        throw new Error(error?.message || "Unable to change cover image.");
    return data;
}

export async function duplicateWorkoutMutationFn(id: string) {
    const { data, error } = await authenticatedFetch<WorkoutDetail>(
        `${API_URL}/liftwise/workouts/${encodeURIComponent(id)}/duplicate`,
        { method: "POST" },
    );
    if (error || !data?.id)
        throw new Error(error?.message || "Unable to duplicate workout.");
    return data;
}

export async function deleteWorkoutMutationFn(id: string) {
    const { data, error } = await authenticatedFetch<{ success: boolean }>(
        `${API_URL}/liftwise/workouts/${encodeURIComponent(id)}`,
        { method: "DELETE" },
    );
    if (error || !data?.success)
        throw new Error(error?.message || "Unable to delete workout.");
}

export async function getExerciseBookmarks() {
    const { data, error } = await authenticatedFetch<string[]>(
        `${API_URL}/liftwise/exercise-bookmarks`,
    );
    if (error || !data)
        throw new Error(error?.message || "Unable to load saved exercises.");
    return data;
}
export async function setExerciseBookmark(id: string, saved: boolean) {
    const { data, error } = await authenticatedFetch<{ success: boolean }>(
        `${API_URL}/liftwise/exercise-bookmarks/${encodeURIComponent(id)}`,
        { method: saved ? "PUT" : "DELETE" },
    );
    if (error || !data?.success)
        throw new Error(error?.message || "Unable to save exercise.");
}

export async function getExercisesQueryFn(search?: string) {
    const query = search ? `?search=${encodeURIComponent(search)}` : "";
    const { data, error } = await authenticatedFetch<ExerciseItem[]>(
        `${API_URL}/liftwise/exercises${query}`,
        {
            method: "GET",
        },
    );
    if (error) throw new Error(error.message);

    return data;
}

export async function getExerciseQueryFn(id: string) {
    const { data, error } = await authenticatedFetch<ExerciseItem>(
        `${API_URL}/liftwise/exercises/${id}`,
        {
            method: "GET",
        },
    );
    if (error) throw new Error(error.message);

    return data;
}

export async function getExerciseInstructionsQueryFn(id: string) {
    const { data, error } = await authenticatedFetch<{
        instructions: string[];
    }>(`${API_URL}/liftwise/exercises/${id}/instructions`, {
        method: "GET",
    });
    if (error) throw new Error(error.message);

    return data;
}

export async function createWorkoutSessionMutationFn(data: SaveSessionInput, expectedUid?: string) {
    const { data: result, error } = await authenticatedFetch(
        `${API_URL}/liftwise/workout-sessions`,
        {
            method: "POST",
            body: JSON.stringify(data),
            headers: {
                "Content-Type": "application/json",
            },
        },
        expectedUid,
    );
    if (error) throw Object.assign(new Error(error.message), { status: error.status });

    return result;
}

export async function getHistoryQueryFn(limit?: number) {
    const query = limit === undefined ? "" : `?limit=${limit}`;
    const { data, error } = await authenticatedFetch<HistorySessionItem[]>(
        `${API_URL}/liftwise/workout-sessions${query}`,
        {
            method: "GET",
        },
    );
    if (error) throw new Error(error.message);

    return data;
}

export async function getHistoryPage(cursor?: string, day?: Date) {
    const params = new URLSearchParams({ limit: "20" });
    if (cursor) params.set("cursor", cursor);
    if (day) {
        params.set("start", startOfDay(day).toISOString());
        params.set("end", addDays(startOfDay(day), 1).toISOString());
    }
    const { data, error } = await authenticatedFetch<HistoryPage>(
        `${API_URL}/liftwise/workout-sessions/page?${params}`,
    );
    if (error || !data)
        throw new Error(error?.message || "Unable to load workout history.");
    return data;
}

export async function getHistoryDetailQueryFn(id: string) {
    const { data, error } = await authenticatedFetch<HistoryDetail>(
        `${API_URL}/liftwise/workout-sessions/${id}`,
        {
            method: "GET",
        },
    );
    if (error) throw new Error(error.message);

    return data;
}

export async function getHomeStatsQueryFn(date: Date) {
    const start = startOfDay(date);
    const end = addDays(start, 1); // beginning of the following day
    const query = new URLSearchParams({
        end: end.toISOString(),
        start: start.toISOString(),
    });

    const { data, error } = await authenticatedFetch<HomeStats>(
        `${API_URL}/liftwise/home-stats?${query}`,
        {
            method: "GET",
        },
    );
    if (error) throw new Error(error.message);

    return data;
}

export async function getWorkoutCalendarDatesQueryFn(start: Date, end: Date) {
    const query = new URLSearchParams({
        end: end.toISOString(),
        start: start.toISOString(),
    });

    const { data, error } = await authenticatedFetch<WorkoutCalendarDates>(
        `${API_URL}/liftwise/workout-sessions/calendar?${query}`,
        {
            method: "GET",
        },
    );
    if (error) throw new Error(error.message);

    return data;
}

export async function getStreakQueryFn() {
    const { data, error } = await authenticatedFetch<
        Pick<WorkoutCalendarDates, "workoutDates">
    >(`${API_URL}/liftwise/workout-sessions/streak`, { method: "GET" });
    if (error) throw new Error(error.message);

    return data;
}
