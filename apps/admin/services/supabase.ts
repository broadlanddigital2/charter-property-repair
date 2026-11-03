import { AxiosError, AxiosHeaders } from "axios";
import { createClient, type PostgrestError } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
);

/**
 * Wrap Supabase/edge-function errors as AxiosError so the existing screens'
 * error handling (`error instanceof AxiosError`, `error.response.data.message`)
 * keeps working unchanged.
 */
export function apiError(message: string, status = 500): AxiosError {
  const headers = new AxiosHeaders();
  return new AxiosError(message, String(status), undefined, undefined, {
    status,
    statusText: message,
    headers,
    config: { headers },
    data: { status: "failed", message },
  });
}

let onUnauthenticated: (() => void) | null = null;
export const setUnauthenticatedHandler = (fn: () => void) => {
  onUnauthenticated = fn;
};

export function unwrap<T>(res: { data: T | null; error: PostgrestError | null; status?: number }): T {
  if (res.error) {
    const status = res.status ?? 500;
    if (status === 401 || res.error.code === "PGRST301") onUnauthenticated?.();
    throw apiError(res.error.message, status);
  }
  return res.data as T;
}

export async function requireSession() {
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    onUnauthenticated?.();
    throw apiError("Unauthenticated.", 401);
  }
  return data.session;
}

/** Invoke an edge function, surfacing its JSON error message. */
export async function invoke<T>(name: string, body: unknown): Promise<T> {
  await requireSession();
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let message = error.message;
    let status = 500;
    // FunctionsHttpError carries the Response in `context`
    const ctx = (error as { context?: Response }).context;
    if (ctx) {
      status = ctx.status;
      try {
        const j = await ctx.json();
        message = j.message ?? j.error ?? message;
      } catch {
        /* ignore */
      }
    }
    if (status === 401) onUnauthenticated?.();
    throw apiError(message, status);
  }
  return data as T;
}
