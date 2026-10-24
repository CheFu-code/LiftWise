import type { OnboardingValues } from "./validations/onboarding-validation";

// Editable starting values, never a prescribed load or a generated training plan.
export function workoutDefaults(profile?: Partial<OnboardingValues>) {
  return {
    sets:
      profile?.experience === "beginner"
        ? 2
        : profile?.experience === "advanced"
          ? 4
          : 3,
    reps: profile?.goal === "lose-fat" ? 12 : 10,
    rest: profile?.goal === "build-muscle" ? 90 : 60,
  };
}
