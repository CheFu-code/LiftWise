import { API_URL, authenticatedFetch } from "./auth-client";

export async function submitSupportReport(input: {
  requestId: string;
  description: string;
  appVersion: string;
  platform: string;
}) {
  const { data, error } = await authenticatedFetch<{
    id: string;
    success: boolean;
  }>(`${API_URL}/liftwise/support-reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (error || !data?.success || !data.id)
    throw new Error(
      error?.message || "Unable to send your report. Please try again.",
    );
  return data;
}
