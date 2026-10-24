import { useQuery } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import StreakBottomSheet from "@/components/home/streak-bottom-sheet";
import { getStreakQueryFn } from "@/lib/api";
import { getStreakSummary } from "@/lib/streak";

type StreakContextValue = {
  currentStreak: number;
  isPending: boolean;
  isError: boolean;
  showStreak: () => void;
};

const StreakContext = createContext<StreakContextValue | null>(null);

export function StreakProvider({ children }: React.PropsWithChildren) {
  const [visible, setVisible] = useState(false);
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["streak"],
    queryFn: getStreakQueryFn,
  });

  const streak = useMemo(
    () =>
      getStreakSummary(
        (data?.workoutDates ?? []).map((date) => new Date(date)),
      ),
    [data?.workoutDates],
  );
  const showStreak = useCallback(() => setVisible(true), []);
  const hideStreak = useCallback(() => setVisible(false), []);

  return (
    <StreakContext.Provider
      value={{
        currentStreak: streak.currentStreak,
        isPending,
        isError,
        showStreak,
      }}
    >
      {children}

      <StreakBottomSheet
        isPending={isPending}
        isError={isError}
        onRetry={() => {
          void refetch();
        }}
        bestStreak={streak.bestStreak}
        completedDays={streak.completedDays}
        currentStreak={streak.currentStreak}
        onClose={hideStreak}
        visible={visible}
      />
    </StreakContext.Provider>
  );
}

export function useStreak() {
  const value = useContext(StreakContext);
  if (!value) throw new Error("useStreak must be used inside its provider");
  return value;
}
