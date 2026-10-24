import { getToken, readSession, saveSession } from "./chefu-session";

// Workout data and identity now use the shared CheFu backend.
export const API_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL || "https://api.chefu.co.za"
).replace(/\/$/, "");

export async function authenticatedFetch<T = unknown>(
  url: string,
  options: RequestInit = {},
  expectedUid?: string,
) {
  const token = await getToken();
  if (expectedUid && (await readSession())?.user.uid !== expectedUid)
    throw Object.assign(new Error("Sign in to sync your workout."), { status: 401 });
  if (!token) throw new Error("Please sign in with your CheFu account.");
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (options.signal?.aborted) controller.abort();
  options.signal?.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(abort, 30_000);
  let response: Response;
  try {
    response = await fetch(url, { ...options, headers, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", abort);
  }
  if (response.status === 401 && (await readSession())?.token === token)
    await saveSession(null);
  const body = await response.json().catch(() => null);
  return response.ok
    ? { data: body as T, error: null }
    : {
        data: null,
        error: {
          message: body?.message || "Request failed.",
          status: response.status,
        },
      };
}
