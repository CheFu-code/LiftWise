import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/chefu-auth";
import { getExerciseBookmarks, setExerciseBookmark } from "@/lib/api";
import { useActionModal } from "@/components/ui/action-modal";

export function useExerciseBookmarks() {
  const { userId } = useAuth();
  const showModal = useActionModal();
  const client = useQueryClient();
  const queryKey = ["exercise-bookmarks", userId];
  const query = useQuery({
    queryKey,
    queryFn: getExerciseBookmarks,
    enabled: !!userId,
  });
  const mutation = useMutation({
    mutationFn: ({ id, saved }: { id: string; saved: boolean }) =>
      setExerciseBookmark(id, saved),
    onSuccess: async (_data, { id, saved }) => {
      client.setQueryData<string[]>(queryKey, (current = []) =>
        saved
          ? [...new Set([...current, id])]
          : current.filter((item) => item !== id),
      );
      await client.invalidateQueries({ queryKey });
    },
    onError: (error) =>
      showModal("Unable to update saved exercises", error.message),
  });
  return {
    ...query,
    ids: query.data ?? [],
    saving: mutation.isPending,
    toggle: (id: string) =>
      mutation.mutate({ id, saved: !query.data?.includes(id) }),
  };
}
