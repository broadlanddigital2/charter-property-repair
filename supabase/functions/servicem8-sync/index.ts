// ServiceM8 -> Supabase sync.
//   POST { "mode": "customers" }  companies, company contacts and jobs
//                                  (legacy artisan app:customer-import / app:user-import / app:job-import)
//   POST { "mode": "reporting" }  flattened job + queue reporting tables
//                                  (legacy Python servicem8 service import scripts)
//   POST { "mode": "all" }
// Auth: header x-cron-secret = CRON_SECRET (pg_cron), or an admin user's JWT.
//
// Customers: read page by page and upserted as they arrive.
// Reporting: edge functions get ~2s CPU per call, so each call loads only a few
// ServiceM8 pages into reporting.raw_* tables, saves its position
// (reporting.sync_state) and re-invokes itself; when everything is loaded a
// one-off pg_cron job builds and publishes the report in SQL.
import { callerContact, config, corsHeaders, isAdminContact, json, safeEqual, serviceClient } from "../_shared/http.ts";
import { type SM8Record, sm8Page, sm8Pages } from "../_shared/servicem8.ts";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

const BATCH = 500;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const admin = serviceClient();

  const viaCron = safeEqual(req.headers.get("x-cron-secret"), await config(admin, "CRON_SECRET"));
  if (!viaCron && !isAdminContact(await callerContact(req, admin))) {
    return json({ status: "failed", message: "Unauthorized" }, 401);
  }

  const body = await req.json().catch(() => ({}));
  const mode: string = body.mode ?? "customers";

  try {
    const results: Record<string, unknown> = {};
    if (mode === "customers" || mode === "all") {
      const { data: run } = await admin.from("sync_runs").insert({ kind: "customers" }).select("id").single();
      try {
        const stats = await syncCustomers(admin);
        await admin.from("sync_runs").update({ finished_at: new Date().toISOString(), ok: true, stats }).eq("id", run!.id);
        results.customers = stats;
      } catch (e) {
        await admin.from("sync_runs").update({ finished_at: new Date().toISOString(), ok: false, error: errMsg(e) }).eq("id", run!.id);
        throw e;
      }
    }
    if (mode === "reporting" || mode === "all") {
      results.reporting = await reportingChunk(admin, Boolean(body.continue));
    }
    return json({ status: "OK", results });
  } catch (e) {
    console.error(`[servicem8-sync:${mode}]`, e);
    return json({ status: "failed", mode, message: errMsg(e) }, 500);
  }
});

const errMsg = (e: unknown) => (e instanceof Error ? e.message : (e as { message?: string })?.message ?? String(e));

async function rpc<T = unknown>(admin: SupabaseClient, fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await admin.rpc(fn, args);
  if (error) throw new Error(`${fn}: ${error.message}`);
  return data as T;
}

// ---------------------------------------------------------------------------
// helpers
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

// ---------------------------------------------------------------------------
// Customers: companies, contacts, jobs
// ---------------------------------------------------------------------------
async function syncCustomers(admin: SupabaseClient) {
  let companyCount = 0;
  for await (const page of sm8Pages("company")) {
    companyCount += page.length;
    // ServiceM8 owns these fields; price band / active stay local.
    await upsertBatched(
      admin,
      "companies",
      page.filter((c) => uuidOrNull(c.uuid) && c.name).map((c) => ({
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
  }

  const companyIds = new Map(
    (await selectAll<{ id: string; service_mate_uuid: string }>(admin, "companies", "id, service_mate_uuid"))
      .map((c) => [c.service_mate_uuid, c.id]),
  );

  // Contacts: never touch active/user_id; skip emails already used by another contact.
  const existing = await selectAll<{ email: string; service_mate_uuid: string | null }>(admin, "contacts", "email, service_mate_uuid");
  const emailOwner = new Map(existing.map((c) => [c.email.toLowerCase(), c.service_mate_uuid]));
  const seen = new Set<string>();
  let contactCount = 0;
  for await (const page of sm8Pages("companycontact")) {
    const rows = page
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
    contactCount += rows.length;
    await upsertBatched(admin, "contacts", rows, "service_mate_uuid");
  }

  // Jobs: only for known companies; budget stays local.
  let jobCount = 0;
  for await (const page of sm8Pages("job")) {
    const rows = page
      .filter((j) => String(j.active ?? "1") === "1" && uuidOrNull(j.uuid) && companyIds.has(j.company_uuid))
      .map((j) => ({
        service_mate_uuid: j.uuid,
        company_id: companyIds.get(j.company_uuid),
        job_number: nz(j.generated_job_id),
        job_address: nz(j.job_address),
        status: nz(j.status),
      }));
    jobCount += rows.length;
    await upsertBatched(admin, "jobs", rows, "service_mate_uuid");
  }

  return { companies: companyCount, contacts: contactCount, jobs: jobCount };
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

type SyncState = { run_id: number | null; step: number; cursor: string; pages: number; in_progress: boolean; updated_at: string | null };

const STEPS = ["company", "category", "badge", "staff", "jobcontact", "jobmaterial", "job", "queue"] as const;
const PAGES_PER_CALL = 3;
const MS_PER_CALL = 25_000;

/** Map one ServiceM8 page to the minimal rows stored in reporting.raw_*. */
function toRaw(resource: (typeof STEPS)[number], records: SM8Record[]): Record<string, unknown>[] {
  const num = (v: unknown) => { const n = parseFloat(String(v ?? "")); return Number.isFinite(n) ? n : null; };
  switch (resource) {
    case "company": case "category": case "badge":
      return records.filter((r) => uuidOrNull(r.uuid)).map((r) => ({ uuid: r.uuid, name: r.name ?? null }));
    case "staff":
      return records.filter((r) => uuidOrNull(r.uuid))
        .map((r) => ({ uuid: r.uuid, name: `${r.first ?? ""} ${r.last ?? ""}`.trim() || null }));
    case "jobcontact":
      return records.filter((r) => uuidOrNull(r.job_uuid)).map((r) => ({ job_uuid: r.job_uuid, first: r.first ?? null, last: r.last ?? null }));
    case "jobmaterial":
      return records.filter((r) => uuidOrNull(r.job_uuid)).map((r) => ({
        job_uuid: r.job_uuid, price: num(r.price), cost: num(r.cost),
        quantity: r.quantity == null ? null : String(r.quantity), name: r.name ?? null, active: String(r.active ?? ""),
      }));
    case "job":
      return records.filter((j) => uuidOrNull(j.uuid)).map((job) => {
        const cf = (k: string) => cleanDate(job[`customfield_${k}`]);
        return {
          uuid: job.uuid,
          company_uuid: uuidOrNull(job.company_uuid),
          category_uuid: uuidOrNull(job.category_uuid),
          completion_actioned_by_uuid: uuidOrNull(job.completion_actioned_by_uuid),
          badge_uuids: parseList(job.badges),
          row: {
            job_number: nz(job.generated_job_id),
            date: cleanDate(job.date),
            job_status: nz(job.status),
            job_address: nz(job.job_address),
            invoice_date: cleanDate(job.invoice_sent_stamp),
            po_number: nz(job.purchase_order_number),
            description_of_work: nz(job.work_done_description),
            work_completed: cleanDate(job.completion_date),
            payment_method: nz(job.payment_method),
            payment_amount: nz(job.payment_amount),
            total_invoice_amount: nz(job.total_invoice_amount),
            payment_received_date: cleanDate(job.payment_received_stamp),
            completion_date: cleanDate(job.completion_date),
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
          },
        };
      });
    case "queue":
      return records.filter((q) => uuidOrNull(q.uuid)).map((q) => ({
        uuid: q.uuid,
        subscribed: parseList(q.subscribed_staff),
        row: {
          name: q.name ?? "N/A",
          default_timeframe: Number(q.default_timeframe ?? 0),
          active: String(q.active ?? "1") === "1",
          edit_date: cleanDate(q.edit_date),
          requires_assignment: String(q.requires_assignment ?? "0") === "1",
        },
      }));
  }
}

async function reportingChunk(admin: SupabaseClient, isContinuation: boolean) {
  let st = await rpc<SyncState>(admin, "sm8_state");

  if (!isContinuation) {
    const fresh = st.updated_at && Date.now() - Date.parse(st.updated_at) < 10 * 60_000;
    if (st.in_progress && fresh) return { message: "Reporting sync already running", step: STEPS[st.step], pages: st.pages };
    const { data: run } = await admin.from("sync_runs").insert({ kind: "reporting" }).select("id").single();
    await rpc(admin, "sm8_raw_reset");
    st = await rpc<SyncState>(admin, "sm8_state", {
      p_patch: { run_id: run!.id, step: 0, cursor: "-1", pages: 0, in_progress: true, started_at: new Date().toISOString() },
    });
  } else if (!st.in_progress) {
    return { message: "Nothing to continue" };
  }

  const started = Date.now();
  let pagesThisCall = 0;
  try {
    while (st.step < STEPS.length) {
      if (pagesThisCall >= PAGES_PER_CALL || Date.now() - started > MS_PER_CALL) {
        await rpc(admin, "sm8_continue");
        return { continued: true, step: STEPS[st.step], pages: st.pages };
      }
      const resource = STEPS[st.step];
      const { records, next } = await sm8Page(resource, st.cursor);
      const rows = toRaw(resource, records);
      for (let i = 0; i < rows.length; i += 1000) {
        await rpc(admin, "sm8_raw_insert", { p_resource: resource, p_rows: rows.slice(i, i + 1000) });
      }
      pagesThisCall++;
      st = await rpc<SyncState>(admin, "sm8_state", {
        p_patch: next ? { cursor: next, pages: st.pages + 1 } : { step: st.step + 1, cursor: "-1", pages: st.pages + 1 },
      });
    }
    // everything loaded: build + publish in the database (no API statement timeout)
    await rpc(admin, "sm8_schedule_build");
    return { loaded: true, pages: st.pages, message: "Building report" };
  } catch (e) {
    if (st.run_id) {
      await admin.from("sync_runs").update({ finished_at: new Date().toISOString(), ok: false, error: errMsg(e) }).eq("id", st.run_id);
    }
    await admin.rpc("sm8_state", { p_patch: { in_progress: false } });
    throw e;
  }
}
