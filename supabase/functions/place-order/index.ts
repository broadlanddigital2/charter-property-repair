// POST { job_guid }  (Authorization: Bearer <user JWT>)
// Replaces legacy POST /api/order:
//   1. builds "Order lines: ..." note from the caller's basket (company basket, or a claim user's own)
//   2. posts it to the job in ServiceM8 (only when SERVICEM8_NOTES_ENABLED=true)
//   3. creates the order + snapshotted lines and clears the basket
import { callerContact, config, corsHeaders, json, serviceClient } from "../_shared/http.ts";
import { sm8CreateJobNote } from "../_shared/servicem8.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ status: "failed", message: "Method not allowed" }, 405);

  const admin = serviceClient();
  try {
    const contact = await callerContact(req, admin);
    if (!contact) return json({ status: "failed", message: "Unauthenticated." }, 401);

    const { job_guid } = await req.json().catch(() => ({}));
    if (!job_guid) return json({ status: "failed", message: "job_guid is required" }, 422);

    const { data: job } = await admin
      .from("jobs").select("id, company_id, service_mate_uuid").eq("id", job_guid).maybeSingle();
    const isClaimant = String(contact.type ?? "").toUpperCase() === "CLAIMANT";
    let allowed = !!job && job.company_id === contact.company_id && !isClaimant;
    if (job && isClaimant) {
      // claim users may only order on the claims they are linked to
      const { data: link } = await admin
        .from("job_contacts").select("job_id").eq("job_id", job.id).eq("contact_id", contact.id).maybeSingle();
      allowed = !!link;
    }
    if (!job || !allowed) {
      return json({ status: "failed", message: "Job not found" }, 404);
    }

    // company users share the company basket; claim users have their own
    const { data: basketId } = await admin.rpc("order_basket_id", { p_contact_id: contact.id });
    const { data: basket } = basketId
      ? await admin
          .from("baskets")
          .select("id, basket_lines(product:products(name, description, sku))")
          .eq("id", basketId)
          .maybeSingle()
      : { data: null };
    const lines = basket?.basket_lines ?? [];
    if (!lines.length) return json({ status: "failed", message: "Basket not found" }, 404);

    // Same note format as the legacy CreateOrderService
    let note = "Order lines:";
    for (const l of lines) {
      // deno-lint-ignore no-explicit-any
      const p = (l as any).product ?? {};
      note += ` ${p.name ?? ""} ${p.description ?? ""} ${p.sku ?? ""},`;
    }
    note += `\nPlaced by ${contact.name} <${contact.email}>`;

    let noteUuid: string | null = null;
    if ((await config(admin, "SERVICEM8_NOTES_ENABLED")) === "true") {
      noteUuid = await sm8CreateJobNote(job.service_mate_uuid, note);
    } else {
      console.log("[place-order] SERVICEM8_NOTES_ENABLED is not true; skipping ServiceM8 note:\n" + note);
    }

    const { data: orderId, error } = await admin.rpc("create_order_from_basket", {
      p_contact_id: contact.id,
      p_job_id: job.id,
      p_note_uuid: noteUuid,
    });
    if (error) throw error;

    const { data: order } = await admin
      .from("orders")
      .select("id, created_at, updated_at, service_mate_note_uuid, job:jobs(id, service_mate_uuid, job_number, created_at, updated_at), order_lines(*)")
      .eq("id", orderId)
      .single();

    return json({ status: "OK", order });
  } catch (e) {
    console.error("[place-order]", e);
    return json({ status: "failed", message: e instanceof Error ? e.message : String(e) }, 500);
  }
});
