import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key, x-cron-secret",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function serviceClient(): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Resolve the calling user's active contact from the request's JWT. */
export async function callerContact(req: Request, admin: SupabaseClient) {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data: { user } } = await admin.auth.getUser(token);
  if (!user) return null;
  const { data } = await admin
    .from("contacts")
    .select("id, company_id, name, email, type, active")
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle();
  return data;
}

export function isAdminContact(c: { type?: string | null } | null): boolean {
  return Boolean(c && String(c.type ?? "").toUpperCase() === "ADMIN");
}

/** Constant-time-ish compare for shared secrets. */
export function safeEqual(a: string | null, b: string | undefined): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

const configCache = new Map<string, string | null>();
/** Setting from env (wins) or the private.app_config table. */
export async function config(admin: SupabaseClient, key: string): Promise<string | undefined> {
  const env = Deno.env.get(key);
  if (env) return env;
  if (!configCache.has(key)) {
    const { data } = await admin.rpc("app_config_get", { p_key: key });
    configCache.set(key, (data as string | null) ?? null);
  }
  return configCache.get(key) ?? undefined;
}
