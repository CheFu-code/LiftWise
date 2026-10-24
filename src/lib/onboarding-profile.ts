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
  return onboardingValuesSchema.partial().parse((await response.json()) ?? {});
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
          ["goal", "experience", "weightUnit", "reminder"]
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
