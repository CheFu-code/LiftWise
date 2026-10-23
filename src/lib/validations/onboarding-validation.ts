import { z } from "zod";

export const onboardingValuesSchema = z.object({
  experience: z.enum(["beginner", "intermediate", "advanced"]),
  // Reuse gender values collected by other apps through the shared account.
  gender: z.string().trim().min(1).max(80),
  goal: z.enum(["build-muscle", "lose-fat", "maintain"]),
  weightUnit: z.enum(["kg", "lb"]).optional(),
});

export type OnboardingValues = z.infer<typeof onboardingValuesSchema>;
export type OnboardingExperience = OnboardingValues["experience"];
export type OnboardingGender = OnboardingValues["gender"];
export type OnboardingGoal = OnboardingValues["goal"];
export type OnboardingWeightUnit = OnboardingValues["weightUnit"];