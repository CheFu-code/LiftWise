import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { onlineManager, useQueryClient } from "@tanstack/react-query";
import * as Network from "expo-network";
import { showToast } from "@/lib/toast-store";
import { restoreAndPersistQueries } from "@/lib/query-persistence";
import { hasPendingWorkoutChanges } from "@/lib/optimistic-workouts";

export function useQueryPersistence(uid?: string) {
  const client = useQueryClient();
  const [restoredUid, setRestoredUid] = useState<string>();
  useEffect(() => {
    if (!uid) {
      setRestoredUid(undefined);
      return;
    }
    let active = true;
    let offlineAnnounced = false;
    const updateConnection = (state: Network.NetworkState) => {
      if (!active) return;
      const online =
        state.isConnected !== false && state.isInternetReachable !== false;
      onlineManager.setOnline(online);
      if (!online && !offlineAnnounced)
        showToast("You're offline. Connect to refresh or save changes.");
      offlineAnnounced = !online;
    };
    let network: ReturnType<typeof Network.addNetworkStateListener> | undefined;
    try {
      network = Network.addNetworkStateListener(updateConnection);
      void Network.getNetworkStateAsync()
        .then(updateConnection)
        .catch(() => undefined);
    } catch {
      /* Cache restoration also works when device network status is unavailable. */
    }
    let stop = () => {};
    let flushCache = () => {};
    void restoreAndPersistQueries(client, uid, () => active).then((cleanup) => {
      if (!active) {
        cleanup();
        return;
      }
      stop = cleanup;
      flushCache = cleanup.flush;
      setRestoredUid(uid);
    });
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") flushCache();
      if (
        state === "active" &&
        !client.isMutating() &&
        !hasPendingWorkoutChanges(client)
      )
        void client.refetchQueries({ type: "active", stale: true });
    });
    return () => {
      active = false;
      stop();
      subscription.remove();
      network?.remove();
      onlineManager.setOnline(true);
    };
  }, [uid, client]);
  return !uid || restoredUid === uid;
}
