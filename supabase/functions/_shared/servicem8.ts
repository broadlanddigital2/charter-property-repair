// Minimal ServiceM8 REST client (https://developer.servicem8.com/reference).
// Auth: set SERVICEM8_API_KEY (preferred, X-Api-Key header) or
// SERVICEM8_USERNAME + SERVICEM8_PASSWORD (basic auth, as the legacy app did).

const BASE_URL = (Deno.env.get("SERVICEM8_API_URL") ?? "https://api.servicem8.com/api_1.0").replace(/\/$/, "");

function authHeaders(): Record<string, string> {
  const apiKey = Deno.env.get("SERVICEM8_API_KEY");
  if (apiKey) return { "X-Api-Key": apiKey };
  const user = Deno.env.get("SERVICEM8_USERNAME");
  const pass = Deno.env.get("SERVICEM8_PASSWORD");
  if (user && pass) return { Authorization: "Basic " + btoa(`${user}:${pass}`) };
  throw new Error("ServiceM8 credentials are not configured (SERVICEM8_API_KEY or SERVICEM8_USERNAME/PASSWORD)");
}

export function servicem8Configured(): boolean {
  return Boolean(
    Deno.env.get("SERVICEM8_API_KEY") ||
      (Deno.env.get("SERVICEM8_USERNAME") && Deno.env.get("SERVICEM8_PASSWORD")),
  );
}

// deno-lint-ignore no-explicit-any
export type SM8Record = Record<string, any>;

export async function sm8List(resource: string, filter?: string): Promise<SM8Record[]> {
  const url = new URL(`${BASE_URL}/${resource}.json`);
  if (filter) url.searchParams.set("$filter", filter);
  const res = await fetch(url, { headers: { Accept: "application/json", ...authHeaders() } });
  if (!res.ok) {
    throw new Error(`ServiceM8 GET ${resource} failed: ${res.status} ${await res.text()}`);
  }
  return await res.json();
}

/** Create a note on a ServiceM8 job. Returns the new note's uuid. */
export async function sm8CreateJobNote(jobUuid: string, note: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/note.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ related_object: "job", related_object_uuid: jobUuid, note }),
  });
  if (!res.ok) {
    throw new Error(`ServiceM8 note create failed: ${res.status} ${await res.text()}`);
  }
  const uuid = res.headers.get("x-record-uuid");
  if (!uuid) throw new Error("ServiceM8 did not return x-record-uuid");
  return uuid;
}
