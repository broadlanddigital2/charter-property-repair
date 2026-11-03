// ServiceM8 -> Supabase sync.
//   POST { "mode": "customers" }  companies, company contacts and jobs
//                                  (legacy artisan app:customer-import / app:user-import / app:job-import)
//   POST { "mode": "reporting" }  flattened job + queue reporting tables
//                                  (legacy Python servicem8 service import scripts)
//   POST { "mode": "all" }
// Auth: header x-cron-secret = CRON_SECRET (pg_cron), or an admin user's JWT.
import { callerContact, config, corsHeaders, isAdminContact, json, safeEqual, serviceClient } from "../_shared/http.ts";
import { type SM8Record, sm8List } from "../_shared/servicem8.ts";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

const BATCH = 500;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const admin = serviceClient();

  const viaCron = safeEqual(req.headers.get("x-cron-secret"), await config(admin, "CRON_SECRET"));
  if (!viaCron && !isAdminContact(await callerContact(req, admin))) {
    return json({ status: "failed", message: "Unauthorized" }, 401);
  }

  const { mode = "customers" } = await req.json().catch(() => ({}));
  const results: Record<string, unknown> = {};

  for (const kind of mode === "all" ? ["customers", "reporting"] : [mode]) {
    const { data: run } = await admin.from("sync_runs").insert({ kind }).select("id").single();
    try {
      const stats = kind === "reporting" ? await syncReporting(admin) : await syncCustomers(admin);
      await admin.from("sync_runs").update({ finished_at: new Date().toISOString(), ok: true, stats }).eq("id", run!.id);
      results[kind] = stats;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error(`[servicem8-sync:${kind}]`, e);
      await admin.from("sync_runs").update({ finished_at: new Date().toISOString(), ok: false, error: message }).eq("id", run!.id);
      return json({ status: "failed", kind, message }, 500);
    }
  }

  const heartbeat = await config(admin, "BETTERSTACK_HEARTBEAT_URL");
  if (heartbeat && (mode === "reporting" || mode === "all")) await fetch(heartbeat).catch(() => {});

  return json({ status: "OK", results });
});

// ---------------------------------------------------------------------------
// Customers: companies, contacts, jobs
// ---------------------------------------------------------------------------
async function upsertBatched(admin: SupabaseClient, table: string, rows: Record<string, unknown>[], onConflict: string) {
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await admin.from(table).upsert(rows.slice(i, i + BATCH), { onConflict });
    if (error) throw new Error(`${table} upsert: ${error.message}`);
  }
}

async function selectAll<T>(admin: SupabaseClient, table: string, cols: string): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin.from(table).select(cols).range(from, from + 999);
    if (error) throw error;
    out.push(...(data as T[]));
    if (!data || data.length < 1000) return out;
  }
}

const nz = (v: unknown) => (v === undefined || v === "" ? null : v);
const uuidOrNull = (v: unknown) =>
  typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v) && !/^0{8}-/.test(v) ? v : null;

async function syncCustomers(admin: SupabaseClient) {
  const [companies, contacts, jobs] = await Promise.all([
    sm8List("company"),
    sm8List("companycontact"),
    sm8List("job"),
  ]);

  // Companies: ServiceM8 owns these fields; price band / active stay local.
  await upsertBatched(
    admin,
    "companies",
    companies.filter((c) => uuidOrNull(c.uuid) && c.name).map((c) => ({
      service_mate_uuid: c.uuid,
      name: c.name,
      website: nz(c.website),
      abn_number: nz(c.abn_number),
      address: nz(c.address),
      address_street: nz(c.address_street),
      address_city: nz(c.address_city),
      address_state: nz(c.address_state),
      address_postcode: nz(c.address_postcode),
      address_country: nz(c.address_country),
      billing_address: nz(c.billing_address),
      is_individual: String(c.is_individual) === "1",
      badges: nz(c.badges),
      fax_number: nz(c.fax_number),
      tax_rate_uuid: uuidOrNull(c.tax_rate_uuid),
      custom_field_payment_terms: nz(c.payment_terms),
      parent_company_uuid: uuidOrNull(c.parent_company_uuid),
      payment_terms: nz(c.payment_terms),
    })),
    "service_mate_uuid",
  );

  const companyIds = new Map(
    (await selectAll<{ id: string; service_mate_uuid: string }>(admin, "companies", "id, service_mate_uuid"))
      .map((c) => [c.service_mate_uuid, c.id]),
  );

  // Contacts: never touch active/user_id; skip emails already used by another contact.
  const existing = await selectAll<{ email: string; service_mate_uuid: string | null }>(admin, "contacts", "email, service_mate_uuid");
  const emailOwner = new Map(existing.map((c) => [c.email.toLowerCase(), c.service_mate_uuid]));
  const seen = new Set<string>();
  const contactRows = contacts
    .filter((c) => String(c.active ?? "1") === "1" && uuidOrNull(c.uuid) && c.email)
    .filter((c) => {
      const email = String(c.email).trim().toLowerCase();
      if (seen.has(email)) return false;
      seen.add(email);
      const owner = emailOwner.get(email);
      return owner === undefined || owner === c.uuid;
    })
    .map((c) => ({
      service_mate_uuid: c.uuid,
      company_id: companyIds.get(c.company_uuid) ?? null,
      name: `${c.first ?? ""} ${c.last ?? ""}`.trim() || String(c.email),
      email: String(c.email).trim(),
      is_primary_contact: String(c.is_primary_contact) === "1",
      phone: nz(c.phone),
      mobile: nz(c.mobile),
      type: nz(c.type) ?? "JOB",
    }));
  await upsertBatched(admin, "contacts", contactRows, "service_mate_uuid");

  // Jobs: only for known companies; budget stays local.
  const jobRows = jobs
    .filter((j) => String(j.active ?? "1") === "1" && uuidOrNull(j.uuid) && companyIds.has(j.company_uuid))
    .map((j) => ({
      service_mate_uuid: j.uuid,
      company_id: companyIds.get(j.company_uuid),
      job_number: nz(j.generated_job_id),
      job_address: nz(j.job_address),
      status: nz(j.status),
    }));
  await upsertBatched(admin, "jobs", jobRows, "service_mate_uuid");

  return { companies: companies.length, contacts: contactRows.length, jobs: jobRows.length };
}

// ---------------------------------------------------------------------------
// Reporting (port of servicem8/src/scripts/import_pricing_data.py + import_queue_data.py)
// ---------------------------------------------------------------------------
function cleanDate(val: unknown): string | null {
  if (!val || val === "N/A") return null;
  const d = String(val).split(" ")[0];
  return /^0000-00-00/.test(d) || !/^\d{4}-\d{2}-\d{2}$/.test(d) ? null : d;
}

function parseList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String);
  if (typeof v !== "string" || !v.trim()) return [];
  try {
    const parsed = JSON.parse(v.replace(/'/g, '"'));
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return v.split(/[;,]/).map((s) => s.trim()).filter(Boolean);
  }
}

async function syncReporting(admin: SupabaseClient) {
  const [jobs, materials, companies, jobContacts, categories, badges, staff, queues] = await Promise.all([
    sm8List("job"),
    sm8List("jobmaterial"),
    sm8List("company"),
    sm8List("jobcontact"),
    sm8List("category"),
    sm8List("badge"),
    sm8List("staff"),
    sm8List("queue"),
  ]);

  const byUuid = (rows: SM8Record[]) => new Map(rows.map((r) => [r.uuid, r]));
  const companyMap = byUuid(companies), categoryMap = byUuid(categories), badgeMap = byUuid(badges), staffMap = byUuid(staff);
  const contactByJob = new Map<string, SM8Record>();
  for (const c of jobContacts) if (!contactByJob.has(c.job_uuid)) contactByJob.set(c.job_uuid, c);
  const materialsByJob = new Map<string, SM8Record[]>();
  for (const m of materials) {
    const list = materialsByJob.get(m.job_uuid) ?? [];
    list.push(m);
    materialsByJob.set(m.job_uuid, list);
  }
  const staffName = (uuid: string) => {
    const s = staffMap.get(uuid);
    const n = s ? `${s.first ?? ""} ${s.last ?? ""}`.trim() : "";
    return n || null;
  };

  const jobRows = jobs.filter((j) => uuidOrNull(j.uuid)).map((job) => {
    let totalPrice = 0, totalCost = 0;
    let invoiceNo: string | null = null;
    for (const m of materialsByJob.get(job.uuid) ?? []) {
      const price = parseFloat(m.price ?? "0"), cost = parseFloat(m.cost ?? "0");
      const qty = parseFloat(m.quantity ?? "1");
      const name = String(m.name ?? "");
      if (m.quantity !== "-1.0000" && !name.includes("quote") && String(m.active) === "1") {
        if (price > 0) totalPrice += price * qty;
        else totalCost += cost * qty;
      }
      if (name.includes("Invoice No")) {
        const after = name.split("Invoice No")[1].trim();
        invoiceNo = after.includes("\n") ? after.split("\n")[0] : after.split(" ")[0];
      }
    }
    const contact = contactByJob.get(job.uuid);
    const badgeNames = parseList(job.badges).map((u) => badgeMap.get(u)?.name).filter(Boolean).join(",");
    const cf = (k: string) => cleanDate(job[`customfield_${k}`]);
    return {
      uuid: job.uuid,
      job_number: nz(job.generated_job_id),
      date: cleanDate(job.date),
      job_status: nz(job.status),
      company: companyMap.get(job.company_uuid)?.name ?? null,
      contact_first: contact?.first ?? null,
      contact_last: contact?.last ?? null,
      completion_actioned_by_staff_member: staffName(job.completion_actioned_by_uuid),
      job_address: nz(job.job_address),
      invoice_date: cleanDate(job.invoice_sent_stamp),
      po_number: nz(job.purchase_order_number),
      description_of_work: nz(job.work_done_description),
      work_completed: cleanDate(job.completion_date),
      job_category: categoryMap.get(job.category_uuid)?.name ?? null,
      invoice_no: invoiceNo,
      payment_method: nz(job.payment_method),
      payment_amount: nz(job.payment_amount),
      total_invoice_amount: nz(job.total_invoice_amount),
      total_cost: Math.round(totalCost * 100) / 100,
      total_price: Math.round(totalPrice * 100) / 100,
      payment_received_date: cleanDate(job.payment_received_stamp),
      completion_date: cleanDate(job.completion_date),
      badges: badgeNames || null,
      strip_out_date: cf("strip_out_date"),
      actual_start_date: cf("actual_start_date"),
      target_end_date: cf("target_end_date"),
      actual_end_date: cf("actual_end_date"),
      drying_start_date: cf("drying_start_date"),
      drying_target_end_date: cf("drying_target_end_date"),
      drying_actual_end_date: cf("drying_actual_end_date"),
      works_approved_date: cf("works_approved_date"),
      date_choices_and_excess_sent: cf("date_choices_and_excess_sent"),
      date_choices_and_excess_received: cf("date_choices_and_excess_received"),
      start_date: cf("start_date"),
      target_start_date: cf("target_start_date"),
    };
  });

  const queueRows = queues.filter((q) => uuidOrNull(q.uuid)).map((q) => {
    const names = parseList(q.subscribed_staff)
      .map((item) => (item.length === 36 ? staffName(item) : item))
      .filter(Boolean);
    return {
      uuid: q.uuid,
      name: q.name ?? "N/A",
      default_timeframe: Number(q.default_timeframe ?? 0),
      active: String(q.active ?? "1") === "1",
      edit_date: cleanDate(q.edit_date),
      subscribed_staff: names.length ? names.join(", ") : null,
      requires_assignment: String(q.requires_assignment ?? "0") === "1",
    };
  });

  const { data, error } = await admin.rpc("sm8_replace_reporting", { p_jobs: jobRows, p_queues: queueRows });
  if (error) throw new Error(`reporting write: ${error.message}`);
  return data;
}
