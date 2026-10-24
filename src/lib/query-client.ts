import { QueryClient } from "@tanstack/react-query";
import { hasPendingWorkoutChanges } from "./optimistic-workouts";

export function createQueryClient() {
  const client: QueryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 24 * 60 * 60_000,
        retry: 1,
        refetchOnWindowFocus: false,
        refetchOnReconnect: () =>
          !client.isMutating() && !hasPendingWorkoutChanges(client),
        refetchOnMount: () =>
          !client.isMutating() && !hasPendingWorkoutChanges(client),
      },
      mutations: { retry: false, networkMode: "always" },
    },
  });
  client.setQueryDefaults(["exercises"], { staleTime: 24 * 60 * 60_000 });
  client.setQueryDefaults(["exercise"], { staleTime: 24 * 60 * 60_000 });
  client.setQueryDefaults(["exercise-instructions"], {
    staleTime: 24 * 60 * 60_000,
  });
  client.setQueryDefaults(["streak"], { staleTime: 5 * 60_000 });
  return client;
}
