import * as AuthSession from "expo-auth-session";
import { randomUUID } from "expo-crypto";
import * as WebBrowser from "expo-web-browser";
import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { onboardingValuesSchema } from "./validations/onboarding-validation";
import {
  fetchOnboardingProfile,
  postOnboardingProfile,
} from "./onboarding-profile";
import type { ChefuAuthContextValue, ChefuAuthSession } from "@/types";
import {
  CLIENT_ID,
  DISCOVERY,
  getToken,
  readSession,
  saveSession,
  subscribeSession,
  fetchUser,
  sessionFromToken,
} from "./chefu-session";

WebBrowser.maybeCompleteAuthSession();
const ACCOUNT_URL =
  process.env.EXPO_PUBLIC_ACCOUNT_APP_URL || "https://myaccount.chefu.co.za";
const ChefuAuthContext = createContext<ChefuAuthContextValue | null>(null);

async function refreshOnboardingProfile() {
  const token = await getToken();
  if (!token) throw new Error("Please sign in again.");
  const current = await readSession();
  const onboardingProfile = await fetchOnboardingProfile(token);
  const latest = await readSession();
  if (
    current &&
    latest &&
    latest.user.uid === current.user.uid &&
    latest.onboardingProfile === current.onboardingProfile
  )
    await saveSession({ ...latest, onboardingProfile });
  return onboardingProfile;
}

export function ChefuAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<ChefuAuthSession | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const queryClient = useQueryClient();
  useEffect(() => subscribeSession(setSession), []);
  useEffect(() => {
    let active = true;
    void readSession()
      .then(refreshOnboardingProfile)
      .catch(() => undefined)
      .finally(() => {
        if (active) setIsLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (isLoaded && !session) {
      void queryClient.cancelQueries().then(() => queryClient.clear());
    }
  }, [isLoaded, session, queryClient]);

  const value: ChefuAuthContextValue = {
    isLoaded,
    isSignedIn: !!session,
    isAuthenticating,
    isOnboardingComplete: onboardingValuesSchema.safeParse(
      session?.onboardingProfile,
    ).success,
    refreshOnboardingProfile,
    saveOnboardingProfile: async (values) => {
      const token = await getToken();
      if (!token) throw new Error("Please sign in again.");
      const current = await readSession();
      await postOnboardingProfile(token, values);
      const onboardingProfile = await fetchOnboardingProfile(token);
      const latest = await readSession();
      if (current && latest && latest.user.uid === current.user.uid)
        await saveSession({
          ...latest,
          onboardingProfile,
          user: { ...latest.user, gender: onboardingProfile.gender },
        });
    },
    userId: session?.user.uid,
    session,
    user: session?.user ?? null,
    getToken,
    signInWithChefuAccount: async (mode = "login") => {
      if (isAuthenticating) return null;
      setIsAuthenticating(true);
      try {
        const redirectUri = AuthSession.makeRedirectUri({
          scheme: "liftwise",
          path: "sso-callback",
          native: "liftwise://sso-callback",
        });
        const state = randomUUID();
        const request = new AuthSession.AuthRequest({
          clientId: CLIENT_ID,
          redirectUri,
          responseType: AuthSession.ResponseType.Code,
          scopes: ["openid", "profile", "email"],
          state,
          extraParams: { nonce: randomUUID() },
          usePKCE: true,
        });
        const authorizationUrl = await request.makeAuthUrlAsync(DISCOVERY);
        const accountUrl = new URL(
          mode === "register" ? "/register" : "/login",
          ACCOUNT_URL,
        );
        accountUrl.searchParams.set("app", "liftwise");
        accountUrl.searchParams.set("returnTo", authorizationUrl);
        const result = await request.promptAsync(DISCOVERY, {
          url: accountUrl.toString(),
        });
        if (result.type !== "success") {
          if (result.type === "error")
            throw new Error(
              result.params.error_description ||
                result.params.error ||
                "Sign-in failed.",
            );
          return null;
        }
        if (
          result.params.state !== state ||
          !result.params.code ||
          !request.codeVerifier
        )
          throw new Error("Sign-in response failed security validation.");
        const token = await AuthSession.exchangeCodeAsync(
          {
            clientId: CLIENT_ID,
            code: result.params.code,
            redirectUri,
            extraParams: { code_verifier: request.codeVerifier },
          },
          DISCOVERY,
        );
        const next = sessionFromToken(
          token,
          await fetchUser(token.accessToken),
        );
        next.onboardingProfile = await fetchOnboardingProfile(
          token.accessToken,
        );
        await queryClient.cancelQueries();
        queryClient.clear();
        await saveSession(next);
        return next.user;
      } finally {
        setIsAuthenticating(false);
      }
    },
    signOut: async () => {
      await saveSession(null);
      await queryClient.cancelQueries();
      queryClient.clear();
    },
    refreshUser: async () => {
      const token = await getToken();
      if (!token) return null;
      const current = await readSession();
      if (!current) return null;
      const user = await fetchUser(token);
      const latest = await readSession();
      if (
        !latest ||
        latest.user.uid !== current.user.uid ||
        user.uid !== latest.user.uid
      )
        return null;
      await saveSession({ ...latest, user });
      return user;
    },
  };
  return createElement(ChefuAuthContext.Provider, { value }, children);
}

export function useAuth() {
  const context = useContext(ChefuAuthContext);
  if (!context) throw new Error("ChefuAuthProvider is required.");
  return context;
}
