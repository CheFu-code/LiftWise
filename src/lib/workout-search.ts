export function filterWorkouts<
  T extends { name: string; muscles?: string | null },
>(workouts: T[], query: string) {
  const term = query.trim().toLocaleLowerCase();
  return workouts.filter((workout) =>
    `${workout.name} ${workout.muscles ?? ""}`
      .toLocaleLowerCase()
      .includes(term),
  );
}
