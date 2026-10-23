import * as AuthSession from "expo-auth-session";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { ChefuAuthSession, ChefuUser } from "@/types";

export const CLIENT_ID =
  Platform.OS === "web" ? "liftwise-web" : "liftwise-mobile";
const API_BASE = (
  process.env.EXPO_PUBLIC_API_BASE_URL || "https://api.chefu.co.za"
).replace(/\/$/, "");
export const DISCOVERY = {
  authorizationEndpoint: `${API_BASE}/oauth/authorize`,
  tokenEndpoint: `${API_BASE}/oauth/token`,
  userInfoEndpoint: `${API_BASE}/oauth/userinfo`,
};
const KEY = "liftwise_chefu_session";
let current: ChefuAuthSession | null = null;
let hydration: Promise<ChefuAuthSession | null> | null = null;
let refreshing: Promise<string | null> | null = null;
let storageWrites: Promise<void> = Promise.resolve();
const listeners = new Set<(session: ChefuAuthSession | null) => void>();

export function subscribeSession(
  listener: (session: ChefuAuthSession | null) => void,
) {
  listeners.add(listener);
  listener(current);
  return () => {
    listeners.delete(listener);
  };
}

export async function saveSession(session: ChefuAuthSession | null) {
  current = session;
  listeners.forEach((listener) => listener(session));
  const raw = session ? JSON.stringify(session) : null;
  const write = storageWrites
    .catch(() => undefined)
    .then(async () => {
      if (Platform.OS === "web") {
        if (typeof localStorage === "undefined") return;
        if (raw) localStorage.setItem(KEY, raw);
        else localStorage.removeItem(KEY);
      } else if (raw) await SecureStore.setItemAsync(KEY, raw);
      else await SecureStore.deleteItemAsync(KEY);
    });
  storageWrites = write;
  await write;
}

export function readSession(): Promise<ChefuAuthSession | null> {
  if (!hydration)
    hydration = (async () => {
      const raw =
        Platform.OS === "web"
          ? typeof localStorage === "undefined"
            ? null
            : localStorage.getItem(KEY)
          : await SecureStore.getItemAsync(KEY);
      if (raw) {
        try {
          const saved = JSON.parse(raw) as ChefuAuthSession;
          if (
            typeof saved.token !== "string" ||
            !saved.user?.uid ||
            !Number.isFinite(saved.expiresAt)
          )
            throw new Error("Invalid saved session.");
          current = saved;
          listeners.forEach((listener) => listener(saved));
        } catch {
          await saveSession(null);
        }
      }
      return current;
    })();
  return hydration.then(() => current);
}

export function sessionFromToken(
  token: AuthSession.TokenResponse,
  user: ChefuUser,
): ChefuAuthSession {
  if (!token.accessToken || !token.expiresIn)
    throw new Error("CheFu did not return a valid session.");
  return {
    token: token.accessToken,
    refreshToken: token.refreshToken,
    expiresAt: (token.issuedAt + token.expiresIn) * 1000,
    user,
  };
}

export async function fetchUser(token: string): Promise<ChefuUser> {
  const response = await fetch(DISCOVERY.userInfoEndpoint, {
    headers: { Authorization: `Bearer ${token}`, "x-chefu-app": "liftwise" },
  });
  if (!response.ok) throw new Error("Unable to load your CheFu account.");
  const info = await response.json();
  if (!info.sub || !info.email || info.app !== "liftwise")
    throw new Error("Invalid CheFu account response.");
  return {
    uid: info.sub,
    email: info.email,
    name: info.name,
    displayName: info.name || info.email,
    photoURL: info.picture || null,
    roles: info.roles,
  };
}

export async function getToken(): Promise<string | null> {
  await readSession();
  if (!current) return null;
  if (current.expiresAt > Date.now() + 60_000) return current.token;
  if (refreshing) return refreshing;
  const previous = current;
  refreshing = (async () => {
    if (!previous.refreshToken) {
      await saveSession(null);
      return null;
    }
    try {
      const token = await AuthSession.refreshAsync(
        { clientId: CLIENT_ID, refreshToken: previous.refreshToken },
        DISCOVERY,
      );
      if (current !== previous) return current?.token ?? null;
      await saveSession({
        ...sessionFromToken(token, previous.user),
        refreshToken: token.refreshToken || previous.refreshToken,
      });
      return token.accessToken;
    } catch (error) {
      if (
        error instanceof AuthSession.TokenError &&
        error.code === "invalid_grant" &&
        current === previous
      )
        await saveSession(null);
      throw error;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}
