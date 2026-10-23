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
) {
  const response = await fetch(`${API_URL}/liftwise/profile`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(onboardingValuesSchema.parse(values)),
  });
  if (!response.ok)
    throw new Error("Unable to save your preferences. Please try again.");
}
