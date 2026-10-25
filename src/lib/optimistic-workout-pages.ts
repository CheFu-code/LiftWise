import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import type { WorkoutPage } from "./api";

export function optimisticWorkoutPages(client: QueryClient, id: string, change: { image: string } | { exerciseIds: string[] } | { deleted: true }) {
  const key = ["workouts", "pages"];
  const query = client.getQueryCache().find({ queryKey: key, exact: true });
  const previous = client.getQueryData<InfiniteData<WorkoutPage>>(key);
  const originalPage = previous?.pages.findIndex((page) => page.items.some((item) => item.id === id)) ?? -1;
  const original = previous?.pages[originalPage]?.items.find((item) => item.id === id);
  const currentQuery = () => query && client.getQueryCache().find({ queryKey: key, exact: true }) === query;
  const update = (fn: (page: WorkoutPage, index: number) => WorkoutPage) => {
    if (!currentQuery()) return;
    client.setQueryData<InfiniteData<WorkoutPage>>(key, (data) => data ? { ...data, pages: data.pages.map(fn) } : data);
  };
  if (original && !("exerciseIds" in change)) update((page) => ({ ...page, items: "deleted" in change ? page.items.filter((item) => item.id !== id) : page.items.map((item) => item.id === id ? { ...item, image: change.image } : item) }));
  return {
    rollback() {
      if (!original || "exerciseIds" in change) return;
      if ("deleted" in change) {
        if (client.getQueryData<InfiniteData<WorkoutPage>>(key)?.pages.some((page) => page.items.some((item) => item.id === id))) return;
        update((page, index) => {
          if (index !== originalPage) return page;
          const items = [...page.items];
          const offset = previous!.pages[index].items.findIndex((item) => item.id === id);
          items.splice(Math.min(offset, items.length), 0, original);
          return { ...page, items };
        });
      } else update((page) => ({ ...page, items: page.items.map((item) => item.id === id && item.image === change.image ? { ...item, image: original.image } : item) }));
    },
    confirmImage(image: string) {
      if (!("image" in change)) return;
      update((page) => ({ ...page, items: page.items.map((item) => item.id === id && (item.image === change.image || item.image === original?.image) ? { ...item, image } : item) }));
    },
    confirmDeletion() {
      if ("deleted" in change) update((page) => ({ ...page, items: page.items.filter((item) => item.id !== id) }));
    },
  };
}
