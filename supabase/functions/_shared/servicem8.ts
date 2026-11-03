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

// ServiceM8 limits requests per minute per account. Space requests out and,
// when we are throttled anyway, wait for the window to reset and try again.
const MIN_GAP_MS = 400;
let lastRequestAt = 0;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function sm8Fetch(url: URL): Promise<Response> {
  let res: Response | null = null;
  for (let attempt = 1; attempt <= 6; attempt++) {
    const wait = lastRequestAt + MIN_GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequestAt = Date.now();
    res = await fetch(url, { headers: { Accept: "application/json", ...authHeaders() } });
    if (res.status !== 429 && res.status < 500) return res;
    await res.body?.cancel();
    const retryAfter = Number(res.headers.get("retry-after"));
    await sleep(retryAfter > 0 ? retryAfter * 1000 : Math.min(15000 * attempt, 60000));
  }
  return res!;
}

/** Fetch one page (cursor "-1" = first). `next` is null on the last page. */
export async function sm8Page(resource: string, cursor = "-1", filter?: string): Promise<{ records: SM8Record[]; next: string | null }> {
  const url = new URL(`${BASE_URL}/${resource}.json`);
  url.searchParams.set("cursor", cursor);
  if (filter) url.searchParams.set("$filter", filter);
  const res = await sm8Fetch(url);
  if (!res.ok) throw new Error(`ServiceM8 GET ${resource} failed: ${res.status} ${await res.text()}`);
  const records = (await res.json()) as SM8Record[];
  return { records, next: res.headers.get("x-next-cursor") };
}

/**
 * Iterate a resource page by page (ServiceM8 cursor pagination, up to 5,000
 * records per page) so large tables never have to fit in memory at once.
 */
export async function* sm8Pages(resource: string, filter?: string): AsyncGenerator<SM8Record[]> {
  let cursor: string | null = "-1";
  for (let page = 0; cursor && page < 10_000; page++) {
    const { records, next } = await sm8Page(resource, cursor, filter);
    yield records;
    cursor = next;
  }
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
