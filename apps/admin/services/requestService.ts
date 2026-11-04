// Admin data layer — Supabase edition.
// Same function names and return shapes as the legacy Laravel API client.
import axios from "axios";

import {
  TApiAddress,
  TApiAddressDetails,
  TCompany,
  TCompanyContact,
  TLoginCredentials,
  TLoginRes,
  TPriceBandsRes,
  TUser,
  TCategory,
  TSupplier,
  Product,
  TCategoryTree,
  TJob,
  TRoom,
  TRoomRule,
  TProductRoom,
} from "@/types/api";
import { TUserFormData } from "@/containers/UsersPage/UsersPage";
import { apiError, invoke, requireSession, supabase, unwrap } from "./supabase";

const g = <T,>(row: any): T => (row ? { ...row, guid: row.id } : row);
const gs = <T,>(rows: any[] | null): T[] => (rows ?? []).map((r) => g<T>(r));

/** Keep only writable columns so form extras (guid, relations…) don't break the update. */
const pick = (obj: Record<string, unknown>, keys: readonly string[]) =>
  Object.fromEntries(Object.entries(obj).filter(([k, v]) => keys.includes(k) && v !== undefined));

const COMPANY_COLUMNS = [
  "name", "website", "abn_number", "address", "address_street", "address_city", "address_state",
  "address_postcode", "address_country", "billing_address", "active", "is_individual", "badges",
  "fax_number", "custom_field_payment_terms", "payment_terms", "service_mate_uuid",
] as const;
const PRODUCT_COLUMNS = ["sku", "name", "manufacturer", "description", "price", "price_has_vat", "miscellaneous"] as const;
const BOOL_COLUMNS = new Set(["active", "is_individual", "price_has_vat"]);
const normaliseBools = (o: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [k, BOOL_COLUMNS.has(k) ? Boolean(Number(v)) : v]));

export const login = async (credentials: TLoginCredentials): Promise<TLoginRes> => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: credentials.email.trim(),
    password: credentials.password,
  });
  if (error || !data.session) {
    throw apiError(error?.message === "Invalid login credentials" ? "Invalid password" : error?.message || "Failed to login", 422);
  }
  const { data: contact } = await supabase
    .from("contacts").select("active, type").eq("user_id", data.user.id).maybeSingle();
  if (!contact || String(contact.type).toUpperCase() !== "ADMIN") {
    await supabase.auth.signOut();
    throw apiError("Unauthorized", 401);
  }
  if (!contact.active) {
    await supabase.auth.signOut();
    throw apiError("This user account is inactive.", 422);
  }
  return { status: "OK", token: data.session.access_token };
};

export const logoutSession = async () => {
  await supabase.auth.signOut();
};

export const resetPassword = async (email: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw apiError(error.message, 422);
};

export const confirmPasswordReset = async ({
  password,
}: {
  token?: string;
  email?: string;
  password: string;
  password_confirmation?: string;
}) => {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw apiError("The password reset link is invalid or has expired", 422);
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw apiError(error.message, 422);
  await supabase.auth.signOut();
};

export const getUser = async (): Promise<TUser> => {
  await requireSession();
  const user = unwrap(await supabase.rpc("api_me"));
  if (!user) throw apiError("Unauthenticated.", 401);
  return user as TUser;
};

// ---- Companies & contacts -------------------------------------------------
export const getCompanies = async () => {
  const companies = unwrap(await supabase.rpc("api_companies")) as TCompany[];
  return { status: "OK", companies };
};

export const getCompanyByGuid = async (guid: string) => {
  const company = unwrap(
    await supabase.from("companies").select("*, contacts(*), jobs(*), price_bands:price_bands(*), basket:baskets(*)").eq("id", guid).single()
  );
  return { status: "OK", company: g<TCompany>(company) };
};

export const updateCompany = async (
  guid: string,
  companyData: Partial<TCompany> & { price_band_guid?: string }
) => {
  const patch: Record<string, unknown> = normaliseBools(pick(companyData as Record<string, unknown>, COMPANY_COLUMNS));
  if ("price_band_guid" in companyData) patch.price_band_id = companyData.price_band_guid || null;
  const company = unwrap(await supabase.from("companies").update(patch).eq("id", guid).select("*, price_bands:price_bands(*), basket:baskets(*)").single());
  return { status: "OK", company: g<TCompany>(company) };
};

export const deleteCompany = async (guid: string) => {
  unwrap(await supabase.from("companies").delete().eq("id", guid));
};

export const createCompanyContact = async (
  contactData: TUserFormData & {
    userData: Pick<TCompanyContact, "is_primary_contact" | "type">;
  } & {
    userData: {
      company_guid: string;
      service_mate_uuid: string;
      password?: string;
    };
  }
) => {
  return invoke<{ status: string; contact: TCompanyContact }>("admin-users", {
    action: "create",
    ...contactData.userData,
  });
};

export const updateCompanyContact = async (
  newData: Partial<TCompanyContact> & { contact_guid: string }
) => {
  return invoke<{ status: string; contact: TCompanyContact }>("admin-users", { action: "update", ...newData });
};

export const activateUser = async (email: string) => {
  return invoke<{ status: string; message: string }>("admin-users", { action: "activate", email });
};

// ---- Price bands ----------------------------------------------------------
export const getPriceBands = async (): Promise<TPriceBandsRes> => {
  const rows = unwrap(await supabase.from("price_bands").select("*").order("band"));
  return { status: "OK", price_bands: gs<TPriceBandsRes["price_bands"][number]>(rows) };
};

// ---- Categories -----------------------------------------------------------
export const getCategories = async () => {
  const rows = unwrap(await supabase.from("categories").select("*").order("name"));
  return { status: "OK", categories: gs<TCategory>(rows) };
};

export const getCategoryTree = async () => {
  const tree = unwrap(await supabase.rpc("category_tree")) as TCategoryTree;
  return { status: "OK", category_trees: tree };
};

type TCategoryInput = Partial<TCategory> & { parent_guid?: string | null };
const categoryPatch = (d: TCategoryInput) => {
  const patch: Record<string, unknown> = {};
  if (d.name !== undefined) patch.name = d.name;
  if ("parent_guid" in d) patch.parent_id = d.parent_guid || null;
  return patch;
};

export const createCategory = async (newData: TCategoryInput) => {
  const category = unwrap(await supabase.from("categories").insert(categoryPatch(newData)).select().single());
  return { status: "OK", category: g<TCategory>(category) };
};

export const updateCategory = async (categoryGUID: string, newData: TCategoryInput) => {
  const category = unwrap(await supabase.from("categories").update(categoryPatch(newData)).eq("id", categoryGUID).select().single());
  return { status: "OK", category: g<TCategory>(category) };
};

export const deleteCategory = async (categoryGUID: string) => {
  unwrap(await supabase.from("categories").delete().eq("id", categoryGUID));
};

// ---- Images (Supabase Storage; existing Cloudflare Images URLs keep working) ----
async function uploadImage(table: "categories" | "suppliers" | "products", guidField: string, formData: FormData) {
  const guid = formData.get(guidField) as string;
  const file = formData.get("image") as File | null;
  if (!guid || !file) throw apiError("Image and id are required", 422);
  if (file.size > 2 * 1024 * 1024) throw apiError("The image must not be greater than 2048 kilobytes.", 422);

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${table}/${guid}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("images").upload(path, file, { contentType: file.type, upsert: true });
  if (error) throw apiError(error.message, 422);
  const { data } = supabase.storage.from("images").getPublicUrl(path);
  unwrap(await supabase.from(table).update({ image: data.publicUrl }).eq("id", guid));
  return { status: "OK", image: data.publicUrl };
}

export const uploadCategoryImage = (formData: FormData) => uploadImage("categories", "category_guid", formData);
export const uploadSupplierImage = (formData: FormData) => uploadImage("suppliers", "supplier_guid", formData);
export const uploadProductImage = (formData: FormData) => uploadImage("products", "product_guid", formData);

// ---- Suppliers ------------------------------------------------------------
export const getSuppliers = async () => {
  const rows = unwrap(await supabase.from("suppliers").select("*").order("name"));
  return { status: "OK", suppliers: gs<TSupplier>(rows) };
};

export const createSupplier = async (newData: Partial<TSupplier>) => {
  const supplier = unwrap(await supabase.from("suppliers").insert({ name: newData.name }).select().single());
  return { status: "OK", supplier: g<TSupplier>(supplier) };
};

export const updateSupplier = async (supplierGUID: string, newData: Partial<TSupplier>) => {
  const supplier = unwrap(await supabase.from("suppliers").update({ name: newData.name }).eq("id", supplierGUID).select().single());
  return { status: "OK", supplier: g<TSupplier>(supplier) };
};

export const deleteSupplier = async (supplierGUID: string) => {
  unwrap(await supabase.from("suppliers").delete().eq("id", supplierGUID));
  return { status: "OK" };
};

// ---- Misc -----------------------------------------------------------------
export const getAddresses = async (postcode: string) => {
  // Broadland Digital CRM postcode lookup (Royal Mail PAF), Ideal Postcodes-compatible.
  // Needs a browser key (pk_…) from CRM → Settings → Postcode lookup, allowed for this site's domain.
  const base = process.env.NEXT_PUBLIC_POSTCODE_LOOKUP_URL ||
    "https://dipjypzrfigkzuarlsov.supabase.co/functions/v1/postcode-lookup";
  const { data } = await axios.get<TApiAddressDetails>(
    `${base}/v1/postcodes/${encodeURIComponent(postcode.trim())}`,
    { params: { api_key: process.env.NEXT_PUBLIC_POSTCODE_LOOKUP_KEY } }
  );
  // PAF has no county, and the town is `post_town`; map them to the fields the forms read
  const toTitle = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  data.result = (data.result || []).map((a) => {
    const raw = a as TApiAddress & { post_town?: string };
    return {
      ...a,
      district: a.district || (raw.post_town ? toTitle(raw.post_town) : ""),
      county: a.county || "",
      country: a.country || "United Kingdom",
    };
  });
  return data;
};

// ---- Products -------------------------------------------------------------
export const getProducts = async () => {
  const products = unwrap(await supabase.rpc("api_products", { p_ids: null })) as Product[];
  return { status: "OK", products };
};

export const removeProduct = async (guid: string) => {
  unwrap(await supabase.from("products").delete().eq("id", guid));
};

export const updateProduct = async (
  guid: string,
  productData: Partial<Product> & {
    supplier_guid: string;
    category_guid: string;
    price_band_guid?: string;
  }
) => {
  const patch: Record<string, unknown> = normaliseBools(pick(productData as Record<string, unknown>, PRODUCT_COLUMNS));
  if (patch.price === "") patch.price = null;
  // the form sends miscellaneous as a JSON string (legacy API shape); store it as JSON
  if (typeof patch.miscellaneous === "string") {
    try {
      patch.miscellaneous = JSON.parse(patch.miscellaneous as string);
    } catch {
      patch.miscellaneous = { raw: patch.miscellaneous };
    }
  }
  if (productData.supplier_guid) patch.supplier_id = productData.supplier_guid;
  if (productData.category_guid) patch.category_id = productData.category_guid;
  if ("price_band_guid" in productData) patch.price_band_id = productData.price_band_guid || null;
  const product = unwrap(await supabase.from("products").update(patch).eq("id", guid).select().single());
  return { status: "OK", product: g<Product>(product) };
};

export const getJobs = async () => {
  const rows = unwrap(await supabase.from("jobs").select("*").order("created_at", { ascending: false }));
  return { status: "OK", jobs: gs<TJob>(rows) };
};

// ---- Dashboard ------------------------------------------------------------
export type TSyncRun = {
  id: number;
  kind: string;
  started_at: string;
  finished_at: string | null;
  ok: boolean | null;
  stats: Record<string, number> | null;
  error: string | null;
};

export type TRecentOrder = {
  id: string;
  created_at: string;
  job: { job_number: string | null; service_mate_uuid: string; company: { name: string } | null } | null;
  order_lines: { count: number }[];
};

export const getDashboardStats = async () => {
  const count = async (q: PromiseLike<{ count: number | null; error: { message: string } | null }>) => {
    const { count: n, error } = await q;
    if (error) throw apiError(error.message);
    return n ?? 0;
  };
  const head = { count: "exact" as const, head: true };

  const [companies, contacts, activeContacts, products, orders, openJobs, runs, recentOrders] = await Promise.all([
    count(supabase.from("companies").select("id", head)),
    count(supabase.from("contacts").select("id", head).not("company_id", "is", null)),
    count(supabase.from("contacts").select("id", head).not("company_id", "is", null).eq("active", true)),
    count(supabase.from("products").select("id", head)),
    count(supabase.from("orders").select("id", head)),
    count(supabase.from("jobs").select("id", head).in("status", ["Quote", "Work Order"])),
    supabase.from("sync_runs").select("*").order("started_at", { ascending: false }).limit(6),
    supabase
      .from("orders")
      .select("id, created_at, job:jobs(job_number, service_mate_uuid, company:companies(name)), order_lines(count)")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  return {
    companies,
    contacts,
    activeContacts,
    products,
    orders,
    openJobs,
    syncRuns: (unwrap(runs) ?? []) as TSyncRun[],
    recentOrders: (unwrap(recentOrders) ?? []) as unknown as TRecentOrder[],
  };
};

/** One page of products (optionally filtered by name/SKU), for the Products screen. */
export const getProductsPage = async ({
  search,
  page = 1,
  perPage = 10,
  room,
}: {
  search?: string;
  page?: number;
  perPage?: number;
  /** room slug, or "none" for products without a room */
  room?: string;
}) => {
  const res = unwrap(
    await supabase.rpc("api_products_page", {
      p_search: search || null,
      p_page: page,
      p_per_page: perPage,
      p_room: room || null,
    })
  ) as { total: number; data: Product[] };
  return { products: res.data, total: res.total };
};

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------
export const getRooms = async () => unwrap(await supabase.rpc("api_rooms")) as TRoom[];

/** Override a product's rooms; pass null to go back to the automatic rules. */
export const setProductRooms = async (productGUID: string, rooms: string[] | null) =>
  unwrap(await supabase.rpc("api_set_product_rooms", { p_product: productGUID, p_rooms: rooms })) as {
    rooms: TProductRoom[];
    rooms_manual: boolean;
  };

export const getRoomRules = async () =>
  unwrap(
    await supabase
      .from("room_rules")
      .select("id, supplier, category, name_pattern, rooms, priority, origin, note, active")
      .order("supplier")
      .order("priority", { ascending: false })
      .order("category", { nullsFirst: true })
  ) as TRoomRule[];

export const updateRoomRule = async (id: string, patch: Partial<Omit<TRoomRule, "id">>) =>
  unwrap(await supabase.from("room_rules").update(patch).eq("id", id).select().single()) as TRoomRule;
