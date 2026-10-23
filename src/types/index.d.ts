import { ExerciseItem, WorkoutExercise } from "@/lib/api";
import { QueryObserverResult, RefetchOptions } from "@tanstack/react-query";
import { ImperativeRouter } from "expo-router";
import { Dispatch, SetStateAction } from "react";

export type ChefuUser = {
  uid?: string;
  email?: string;
  displayName?: string;
  name?: string;
  photoURL?: string | null;
  roles?: string[];
  fullName?: string;
  imageUrl?: string;
  primaryEmailAddress?: { emailAddress?: string };
  emailAddresses?: { emailAddress?: string }[];
};

export type ChefuAuthSession = {
  token: string;
  refreshToken?: string;
  expiresAt: number;
  user: ChefuUser;
};

export type ChefuAuthContextValue = {
  isLoaded: boolean;
  isSignedIn: boolean;
  isAuthenticating: boolean;
  userId?: string;
  session: ChefuAuthSession | null;
  user: ChefuUser | null;
  sessionClaims?: { aud?: string };
  getToken: (
    options?: { template?: string } | Record<string, never>,
  ) => Promise<string | null>;
  signInWithChefuAccount: (
    mode?: "login" | "register",
  ) => Promise<ChefuUser | null>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<ChefuUser | null>;
};


export type ExerciseUIProps = {
  exercises: NoInfer<ExerciseItem[]>;
  isPending: boolean;
  muted:
  | "#EF4444"
  | "#FFFFFF"
  | "#2563EB"
  | "#1D4ED8"
  | "#EFF6FF"
  | "#f6f6f6"
  | "#E2E8F0"
  | "#0F172A"
  | "#F1F5F9"
  | "#64748B"
  | "#3B82F6"
  | "#0B0F19"
  | "#242C3E"
  | "#161D2E"
  | "#F8FAFC"
  | "#2E3750"
  | "#1C2436"
  | "#8B94A8"
  | "#000000";
  isError: boolean;
  refetch: (
    options?: RefetchOptions | undefined,
  ) => Promise<QueryObserverResult<NoInfer<ExerciseItem[]>, Error>>;
  router: ImperativeRouter;
  query: string;
  setQuery: Dispatch<SetStateAction<string>>;
  primary:
  | "#EF4444"
  | "#FFFFFF"
  | "#2563EB"
  | "#1D4ED8"
  | "#EFF6FF"
  | "#f6f6f6"
  | "#E2E8F0"
  | "#0F172A"
  | "#F1F5F9"
  | "#64748B"
  | "#3B82F6"
  | "#0B0F19"
  | "#242C3E"
  | "#161D2E"
  | "#F8FAFC"
  | "#2E3750"
  | "#1C2436"
  | "#8B94A8"
  | "#000000";
  selectedExercises: WorkoutExercise[];
  toggleExercise: (exercise: ExerciseItem) => void;
  isRefetching: boolean;
}