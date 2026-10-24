import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/chefu-auth";
import { getExerciseBookmarks, setExerciseBookmark } from "@/lib/api";
import { useRef } from "react";
import { useToast } from "@/components/ui/toast";

export function useExerciseBookmarks() {
  const { userId } = useAuth();
  const { toast, showToast, dismissToast } = useToast();
  const pendingIds = useRef(new Set<string>());
  const needsRefresh = useRef(false);
  const client = useQueryClient();
  const queryKey = ["exercise-bookmarks", userId];
  const mutationKey = ["update-exercise-bookmark", userId];
  const query = useQuery({
    queryKey,
    queryFn: getExerciseBookmarks,
    enabled: !!userId,
  });
  const mutation = useMutation({
    mutationKey,
    mutationFn: ({ id, saved }: { id: string; saved: boolean }) =>
      setExerciseBookmark(id, saved),
    onMutate: async ({ id, saved }) => {
      await client.cancelQueries({ queryKey });
      const wasSaved =
        client.getQueryData<string[]>(queryKey)?.includes(id) ?? false;
      client.setQueryData<string[]>(queryKey, (current = []) =>
        saved
          ? [...new Set([...current, id])]
          : current.filter((item) => item !== id),
      );
      return { wasSaved };
    },
    onError: (_error, { id, saved }, context) => {
      needsRefresh.current = true;
      // Roll back this exercise only; preserve other in-flight bookmark changes.
      if (context && client.getQueryData(queryKey) !== undefined) {
        client.setQueryData<string[]>(queryKey, (current = []) =>
          context.wasSaved
            ? [...new Set([...current, id])]
            : current.filter((item) => item !== id),
        );
      }
      showToast(
        saved
          ? "Failed to save exercise. Please try again."
          : "Failed to remove saved exercise. Please try again.",
      );
    },
    onSettled: (_data, _error, { id }) => {
      pendingIds.current.delete(id);
      // Refetch after the last write so it cannot overwrite another optimistic tick.
      if (
        client.isMutating({ mutationKey }) === 1 &&
        needsRefresh.current &&
        client.getQueryData(queryKey) !== undefined
      ) {
        needsRefresh.current = false;
        void client.invalidateQueries({ queryKey });
      }
    },
  });
  return {
    ...query,
    isError: query.isError && query.data === undefined,
    ids: query.data ?? [],
    saving: mutation.isPending,
    toast,
    dismissToast,
    toggle: (id: string) => {
      if (
        !userId ||
        query.isPending ||
        (query.isError && query.data === undefined) ||
        pendingIds.current.has(id)
      )
        return;
      const alreadySaving = client
        .getMutationCache()
        .findAll({ mutationKey })
        .some(
          (entry) =>
            entry.state.status === "pending" &&
            (entry.state.variables as { id?: string } | undefined)?.id === id,
        );
      if (alreadySaving) return;
      pendingIds.current.add(id);
      mutation.mutate({
        id,
        saved: !client.getQueryData<string[]>(queryKey)?.includes(id),
      });
    },
  };
}
