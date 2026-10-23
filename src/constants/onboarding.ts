import {
  onboardingValuesSchema,
  type OnboardingValues,
} from "@/lib/validations/onboarding-validation";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const steps = [
  { field: "gender", key: "gender" },
  { field: "goal", key: "goal" },
  { field: "experience", key: "experience" },
] as const;

export function pendingOnboardingSteps(profile: Partial<OnboardingValues>) {
  return steps.filter(
    (step) =>
      !onboardingValuesSchema.shape[step.field].safeParse(profile[step.field])
        .success,
  );
}

export function mergeOnboardingDraft(
  profile: Partial<OnboardingValues>,
  draft: Partial<OnboardingValues>,
) {
  return { ...draft, ...profile };
}

const key = (uid: string) => `liftwise_onboarding_${uid}`;
let writes: Promise<unknown> = Promise.resolve();

export async function readOnboardingDraft(
  uid: string,
): Promise<Partial<OnboardingValues>> {
  await writes.catch(() => undefined);
  const raw = await AsyncStorage.getItem(key(uid));
  if (!raw) return {};
  try {
    return onboardingValuesSchema.partial().parse(JSON.parse(raw));
  } catch {
    return {};
  }
}

export function saveOnboardingDraft(
  uid: string,
  values: Partial<OnboardingValues>,
) {
  writes = writes
    .catch(() => undefined)
    .then(() => AsyncStorage.setItem(key(uid), JSON.stringify(values)));
  return writes;
}

export async function clearOnboardingDraft(uid: string) {
  writes = writes
    .catch(() => undefined)
    .then(() => AsyncStorage.removeItem(key(uid)));
  await writes;
}
