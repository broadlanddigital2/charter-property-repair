// Website enquiry form -> SendGrid email to Charter.
//   POST /functions/v1/send-enquiry  (JSON: name, email, phone, postcode, type, reference, message, page, company)
// Public endpoint (no login). Protected by a honeypot field, validation and a
// per-IP rate limit. Every submission is logged in private.enquiries first.
// Secret: SENDGRID_API_KEY. Settings (app_config): ENQUIRY_TO, ENQUIRY_FROM, ENQUIRY_FROM_NAME.
import { config, corsHeaders, json, serviceClient } from "../_shared/http.ts";

const LIMITS = { name: 120, email: 200, phone: 40, postcode: 15, type: 60, reference: 80, message: 2500, page: 200 };
const MAX_PER_HOUR = 5;

const clean = (v: unknown, max: number) => String(v ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim().slice(0, max);
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ detail: "Method not allowed" }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ detail: "Invalid request" }, 400);
  }

  // Honeypot: real visitors never fill the hidden "company" field.
  if (clean(body.company, 200)) return json({ ok: true });

  const f = {
    name: clean(body.name, LIMITS.name),
    email: clean(body.email, LIMITS.email).toLowerCase(),
    phone: clean(body.phone, LIMITS.phone),
    postcode: clean(body.postcode, LIMITS.postcode).toUpperCase(),
    type: clean(body.type, LIMITS.type) || "General enquiry",
    reference: clean(body.reference, LIMITS.reference),
    message: clean(body.message, LIMITS.message),
    page: clean(body.page, LIMITS.page),
  };
  if (!f.name || !f.message) return json({ detail: "Please add your name and a message." }, 422);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) return json({ detail: "Please check your email address." }, 422);

  const admin = serviceClient();
  const ip = (req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
  const ipHash = ip ? await sha256(ip + (Deno.env.get("SUPABASE_URL") ?? "")) : null;

  const { data: id, error: insErr } = await admin.rpc("enquiry_log", {
    p_name: f.name, p_email: f.email, p_phone: f.phone, p_postcode: f.postcode, p_type: f.type,
    p_reference: f.reference, p_message: f.message, p_page: f.page, p_ip_hash: ipHash, p_max_per_hour: MAX_PER_HOUR,
  });
  if (insErr) return json({ detail: "We couldn't send your enquiry. Please call 01603 944 080." }, 500);
  if (!id) return json({ detail: "Too many enquiries from this connection. Please call 01603 944 080." }, 429);

  const apiKey = Deno.env.get("SENDGRID_API_KEY");
  const to = (await config(admin, "ENQUIRY_TO")) ?? "mail@charterpropertyrepairs.co.uk";
  const from = (await config(admin, "ENQUIRY_FROM")) ?? "no-reply@charterpropertyrepairs.co.uk";
  const fromName = (await config(admin, "ENQUIRY_FROM_NAME")) ?? "Charter Property Repairs website";

  const rows: [string, string][] = [
    ["Name", f.name], ["Email", f.email], ["Phone", f.phone], ["Postcode", f.postcode],
    ["Enquiry type", f.type], ["Claim / job reference", f.reference], ["Sent from", f.page],
  ];
  const text = rows.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("\n") + `\n\nMessage:\n${f.message}\n`;
  const html =
    `<div style="font-family:Arial,sans-serif;color:#29232f;max-width:600px">` +
    `<h2 style="color:#662d91;margin:0 0 12px">New website enquiry</h2><table style="border-collapse:collapse;width:100%">` +
    rows.filter(([, v]) => v).map(([k, v]) =>
      `<tr><td style="padding:6px 12px 6px 0;color:#625c68;white-space:nowrap;vertical-align:top">${esc(k)}</td><td style="padding:6px 0">${esc(v)}</td></tr>`).join("") +
    `</table><h3 style="margin:18px 0 6px">Message</h3><p style="white-space:pre-wrap;margin:0">${esc(f.message)}</p>` +
    `<p style="color:#625c68;font-size:12px;margin-top:24px">Reply to this email to answer ${esc(f.name)} directly.</p></div>`;

  let status = "sent";
  let error: string | null = null;
  if (!apiKey) {
    status = "failed";
    error = "SENDGRID_API_KEY not set";
  } else {
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: from, name: fromName },
        reply_to: { email: f.email, name: f.name },
        subject: `Website enquiry – ${f.type} – ${f.name}`,
        content: [{ type: "text/plain", value: text }, { type: "text/html", value: html }],
        tracking_settings: { click_tracking: { enable: false }, open_tracking: { enable: false } },
      }),
    });
    if (!res.ok) {
      status = "failed";
      error = `SendGrid ${res.status}: ${(await res.text()).slice(0, 500)}`;
    }
  }

  await admin.rpc("enquiry_set_status", { p_id: id, p_status: status, p_error: error });
  if (status !== "sent") {
    console.error("send-enquiry failed", id, error);
    return json({ detail: "We couldn't send your enquiry just now. Please call 01603 944 080 or email mail@charterpropertyrepairs.co.uk." }, 502);
  }
  return json({ ok: true });
});
