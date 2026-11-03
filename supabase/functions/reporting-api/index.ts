// Read-only ServiceM8 reporting feed (replaces servicem8.broadlanddigital.co.uk
// /api/v1/servicem8/job-data/ and /queue-data/).
//   GET /functions/v1/reporting-api/job-data
//   GET /functions/v1/reporting-api/queue-data
// Auth: header x-api-key = REPORTING_API_KEY, or an admin user's JWT.
import { callerContact, config, corsHeaders, isAdminContact, json, safeEqual, serviceClient } from "../_shared/http.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const admin = serviceClient();

  const keyOk = safeEqual(req.headers.get("x-api-key"), await config(admin, "REPORTING_API_KEY"));
  if (!keyOk && !isAdminContact(await callerContact(req, admin))) {
    return json({ detail: "Not authenticated" }, 401);
  }

  const path = new URL(req.url).pathname.replace(/\/+$/, "");
  const kind = path.endsWith("/job-data") ? "jobs" : path.endsWith("/queue-data") ? "queues" : null;
  if (!kind) return json({ endpoints: ["job-data", "queue-data"] });

  const { data, error } = await admin.rpc("sm8_reporting", { p_kind: kind });
  if (error) return json({ detail: error.message }, 500);
  return json(data);
});
