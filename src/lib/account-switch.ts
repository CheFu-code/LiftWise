import type { QueryClient } from "@tanstack/react-query";
import { hasPendingWorkoutChanges } from "./optimistic-workouts";

export function assertAccountSwitchReady(client: QueryClient) {
  if (client.isMutating() || hasPendingWorkoutChanges(client)) {
    throw new Error("Your workouts are still saving. Please wait before switching accounts.");
  }
}
