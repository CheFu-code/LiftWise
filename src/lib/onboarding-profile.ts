import { API_URL } from "./auth-client";
import {
  onboardingValuesSchema,
  type OnboardingValues,
} from "./validations/onboarding-validation";

export async function fetchOnboardingProfile(
  token: string,
): Promise<Partial<OnboardingValues>> {
  const response = await fetch(`${API_URL}/liftwise/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok)
    throw new Error("Unable to load your profile. Please try again.");
  const profile = (await response.json()) ?? {};
  // Legacy profiles may contain null or retired answers. Ask those required
  // questions again while retaining the user's other saved preferences.
  for (const field of ["gender", "goal", "experience", "ageRange", "trainingLocation"] as const) {
    if (!onboardingValuesSchema.shape[field].safeParse(profile[field]).success)
      delete profile[field];
  }
  return onboardingValuesSchema.partial().parse(profile);
}

export async function postOnboardingProfile(
  token: string,
  values: OnboardingValues,
  previous?: Partial<OnboardingValues>,
) {
  const parsed = onboardingValuesSchema.parse(values);
  const patch =
    previous && onboardingValuesSchema.safeParse(previous).success
      ? Object.fromEntries(
          [
            "goal",
            "experience",
            "fitnessLevel",
            "heightCm",
            "weight",
            "weightUnit",
            "ageRange",
            "trainingLocation",
            "limitations",
            "reminder",
          ]
            .filter(
              (key) =>
                JSON.stringify(parsed[key as keyof OnboardingValues]) !==
                JSON.stringify(previous[key as keyof OnboardingValues]),
            )
            .map((key) => [key, parsed[key as keyof OnboardingValues]]),
        )
      : null;
  if (patch && !Object.keys(patch).length) return;
  const response = await fetch(`${API_URL}/liftwise/profile`, {
    method: patch ? "PATCH" : "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(patch ?? parsed),
  });
  if (!response.ok)
    throw new Error("Unable to save your preferences. Please try again.");
}
