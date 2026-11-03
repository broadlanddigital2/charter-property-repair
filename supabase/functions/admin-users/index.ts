// Admin-only contact/login management (legacy /company/contact/* and /user/activate).
//   POST { action: "create",   company_guid, name, email, type, is_primary_contact, phone?, mobile?, password? }
//   POST { action: "update",   contact_guid, ...fields, password? }
//   POST { action: "activate", email }   -> marks active and emails a set-password link
//   POST { action: "deactivate", email }
import { callerContact, config, corsHeaders, isAdminContact, json, serviceClient } from "../_shared/http.ts";

const CONTACT_FIELDS = ["name", "email", "is_primary_contact", "active", "phone", "mobile", "type", "company_id"] as const;
const BOOL_FIELDS = new Set(["is_primary_contact", "active"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const admin = serviceClient();
  if (!isAdminContact(await callerContact(req, admin))) {
    return json({ status: "failed", message: "Unauthorized" }, 401);
  }

  try {
    const body = await req.json();
    const portalUrl = (await config(admin, "PORTAL_URL")) ?? "";
    const adminUrl = (await config(admin, "ADMIN_URL")) ?? portalUrl;
    const redirectFor = (type: string) => `${type?.toUpperCase() === "ADMIN" ? adminUrl : portalUrl}/reset-password`;

    switch (body.action) {
      case "create": {
        const row: Record<string, unknown> = {
          company_id: body.company_guid ?? null,
          name: body.name,
          email: String(body.email).trim(),
          type: body.type ?? "JOB",
          is_primary_contact: Boolean(Number(body.is_primary_contact)),
          phone: body.phone ?? null,
          mobile: body.mobile ?? null,
          active: false,
        };
        if (body.password) {
          const { data, error } = await admin.auth.admin.createUser({
            email: row.email as string,
            password: body.password,
            email_confirm: true,
          });
          if (error) throw error;
          row.user_id = data.user.id;
        }
        const { data: contact, error } = await admin.from("contacts").insert(row).select().single();
        if (error) throw error;
        return json({ status: "OK", contact: { ...contact, guid: contact.id } });
      }

      case "update": {
        const { data: current, error: e1 } = await admin.from("contacts").select("*").eq("id", body.contact_guid).single();
        if (e1) throw e1;
        const patch: Record<string, unknown> = {};
        for (const k of CONTACT_FIELDS) if (k in body) patch[k] = BOOL_FIELDS.has(k) ? Boolean(Number(body[k])) : body[k];
        if ("company_guid" in body) patch.company_id = body.company_guid;
        const { data: contact, error } = await admin.from("contacts").update(patch).eq("id", current.id).select().single();
        if (error) throw error;
        if (current.user_id && (body.password || (patch.email && patch.email !== current.email))) {
          const { error: e2 } = await admin.auth.admin.updateUserById(current.user_id, {
            ...(body.password ? { password: body.password } : {}),
            ...(patch.email ? { email: patch.email as string, email_confirm: true } : {}),
          });
          if (e2) throw e2;
        }
        return json({ status: "OK", contact: { ...contact, guid: contact.id } });
      }

      case "activate": {
        const { data: contact, error } = await admin.from("contacts").select("*").eq("email", body.email).single();
        if (error) throw error;
        if (contact.active) return json({ status: "error", message: "This user account is already active." }, 422);

        let userId = contact.user_id as string | null;
        if (!userId) {
          // Creates the login and emails an invitation to set a password.
          const { data, error: e } = await admin.auth.admin.inviteUserByEmail(contact.email, {
            redirectTo: redirectFor(contact.type),
            data: { name: contact.name },
          });
          if (e) throw e;
          userId = data.user.id;
        } else {
          const { error: e } = await admin.auth.resetPasswordForEmail(contact.email, { redirectTo: redirectFor(contact.type) });
          if (e) throw e;
        }
        const { error: e3 } = await admin.from("contacts").update({ active: true, user_id: userId }).eq("id", contact.id);
        if (e3) throw e3;
        return json({ status: "OK", message: "User account activated successfully." });
      }

      case "deactivate": {
        const { error } = await admin.from("contacts").update({ active: false }).eq("email", body.email);
        if (error) throw error;
        return json({ status: "OK", message: "User account deactivated." });
      }

      default:
        return json({ status: "failed", message: "Unknown action" }, 422);
    }
  } catch (e) {
    console.error("[admin-users]", e);
    const message = e instanceof Error ? e.message : (e as { message?: string })?.message ?? String(e);
    return json({ status: "failed", message }, 500);
  }
});
