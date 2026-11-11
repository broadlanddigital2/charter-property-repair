// Customer portal data layer — Supabase edition.
// Same function names and return shapes as the legacy Laravel API client,
// so the screens are unchanged.
import axios from "axios";

import {
  TApiAddress,
  TApiAddressDetails,
  TBasket,
  TBasketLine,
  TCategory,
  TCategoryTree,
  TCompany,
  TJob,
  TJobBudget,
  TLoginCredentials,
  TLoginRes,
  TOrder,
  TPagination,
  TPriceBandsCategory,
  TPriceBandsRes,
  TProduct,
  TSupplier,
  TUser,
  TBudgetSummary,
  TClaimSelectionLine,
  TClaimView,
  TItemProduct,
  TFilterSelection,
  TItemFilter,
} from "@/types/api";
import { apiError, invoke, requireSession, supabase, unwrap } from "./supabase";

// rows from plain table selects: add legacy `guid`
const g = <T,>(row: any): T => (row ? { ...row, guid: row.id } : row);
const gs = <T,>(rows: any[] | null): T[] => (rows ?? []).map((r) => g<T>(r));

export const login = async (credentials: TLoginCredentials): Promise<TLoginRes> => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: credentials.email.trim(),
    password: credentials.password,
  });
  if (error || !data.session) throw apiError(error?.message === "Invalid login credentials" ? "Invalid password" : error?.message || "Failed to login", 422);

  const { data: contact } = await supabase
    .from("contacts").select("active").eq("user_id", data.user.id).maybeSingle();
  if (!contact?.active) {
    await supabase.auth.signOut();
    throw apiError("This user account is inactive.", 422);
  }
  return { status: "OK", token: data.session.access_token };
};

export const logoutSession = async () => {
  await supabase.auth.signOut();
};

/** Request a password reset email (used by the "Forgotten Password" page). */
export const resetPassword = async (email: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw apiError(error.message, 422);
};

/**
 * Set a new password. Supabase's reset/invite link signs the user in on
 * arrival at /reset-password, so token/email are no longer needed.
 */
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

export const getPriceBands = async (): Promise<TPriceBandsRes> => {
  const rows = unwrap(await supabase.from("price_bands").select("*").order("band"));
  return { status: "OK", categories: gs<TPriceBandsCategory>(rows) };
};

export const getCategories = async () => {
  const rows = unwrap(await supabase.from("categories").select("*").order("name"));
  return { status: "OK", categories: gs<TCategory>(rows) };
};

export const getCategoryTree = async () => {
  const tree = unwrap(await supabase.rpc("category_tree")) as TCategoryTree;
  return { status: "OK", category_trees: tree };
};

export const getSuppliers = async () => {
  const rows = unwrap(await supabase.from("suppliers").select("*").order("name"));
  return { status: "OK", suppliers: gs<TSupplier>(rows) };
};

export const getCategorySuppliers = async (categoryGUID: string) => {
  const rows = unwrap(
    await supabase.from("suppliers").select("*, products!inner(category_id)").eq("products.category_id", categoryGUID)
  );
  const suppliers = gs<TSupplier>(rows).map(({ products, ...s }: TSupplier & { products?: unknown }) => s as TSupplier);
  return { status: "OK", suppliers };
};

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

export const getAllProducts = async (productGUIDs?: string[]) => {
  const products = unwrap(
    await supabase.rpc("api_products", { p_ids: productGUIDs && productGUIDs.length ? productGUIDs : null })
  ) as TProduct[];
  return { status: "OK", products };
};

export const getProducts = async ({
  categoryGUID,
  supplierGUID,
  page = 1,
  perPage = 20,
  withChildren = false,
}: {
  categoryGUID: string;
  supplierGUID: string;
  page: number;
  perPage?: number;
  withChildren?: boolean;
}) => {
  const res = await getCategoryProducts({ categoryGUID, page, perPage, withChildren });
  if (supplierGUID) {
    res.products.data = res.products.data.filter((p) => p.supplier?.guid === supplierGUID);
  }
  return res;
};

export const getCategoryProducts = async ({
  categoryGUID,
  page = 1,
  perPage = 20,
  withChildren = false,
}: {
  categoryGUID: string;
  page: number;
  perPage?: number;
  withChildren?: boolean;
}) => {
  const products = unwrap(
    await supabase.rpc("api_products_by_category", {
      p_category_id: categoryGUID,
      p_with_children: withChildren,
      p_page: page,
      p_per_page: perPage,
    })
  ) as TPagination<TProduct>;
  return { status: "OK", products };
};

export const getProductByGUID = async (guid: string) => {
  const product = unwrap(await supabase.rpc("api_product", { p_id: guid })) as TProduct | null;
  if (!product) throw apiError("Product not found", 404);
  return { status: "OK", product };
};

export const getBasket = async (basketGUID: string, jobGUID?: string) => {
  const res = unwrap(
    await supabase.rpc("api_basket", { p_basket_id: basketGUID, p_job_id: jobGUID || null })
  ) as { status: string; basket: TBasket; budget?: TJobBudget } | null;
  if (!res) throw apiError("Basket not found", 404);
  return res;
};

export const createBasket = async (companyGUID: string) => {
  // one basket per company: return the existing one if present
  const existing = unwrap(await supabase.from("baskets").select("*").eq("company_id", companyGUID).maybeSingle());
  if (existing) return { status: "OK", basket: g<TBasket>(existing) };
  const basket = unwrap(await supabase.from("baskets").insert({ company_id: companyGUID }).select().single());
  return { status: "OK", basket: g<TBasket>(basket) };
};

export const getOrderLine = async (id: string) => {
  const line = unwrap(await supabase.from("order_lines").select("*").eq("id", id).single());
  return { status: "OK", order_line: g(line) };
};

export const createBasketLine = async ({
  basketGUID,
  productGUID,
}: {
  basketGUID: string;
  productGUID: string;
}) => {
  const line = unwrap(
    await supabase.from("basket_lines").insert({ basket_id: basketGUID, product_id: productGUID }).select().single()
  );
  return { status: "OK", basket_line: g<TBasketLine>(line) };
};

export const removeBasketLine = async (basketLineGUID: string) => {
  unwrap(await supabase.from("basket_lines").delete().eq("id", basketLineGUID));
  return { status: "OK" };
};

export const getOrderData = async (guid: string) => {
  const order = unwrap(await supabase.rpc("api_order", { p_order_id: guid })) as TOrder | null;
  if (!order) throw apiError("Order not found", 404);
  return { order, status: "OK" };
};

export const createOrder = async (jobGUID: string, _productGUIDs: string[]) => {
  const res = await invoke<{ status: string; order: TOrder & { id: string } }>("place-order", { job_guid: jobGUID });
  return { status: res.status, order: { ...res.order, guid: res.order.id } as TOrder };
};

export const getJob = async (guid: string) => {
  const job = unwrap(await supabase.from("jobs").select("*, orders(*)").eq("id", guid).single());
  return { status: "OK", job: g<TJob>(job) };
};

// ---------------------------------------------------------------------------
// Claim users: passwordless sign-in with a 6-digit emailed code
// ---------------------------------------------------------------------------
export const requestLoginCode = async (email: string) => {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { shouldCreateUser: false },
  });
  if (error) {
    const msg = /signups? not allowed|not found|user not found/i.test(error.message)
      ? "We couldn't find a claim for that email. Check the address in your email from us."
      : error.message;
    throw apiError(msg, 422);
  }
};

export const verifyLoginCode = async (email: string, code: string): Promise<TLoginRes> => {
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: code.replace(/\D/g, ""),
    type: "email",
  });
  if (error || !data.session) throw apiError("That code is incorrect or has expired. Request a new one.", 422);

  const { data: contact } = await supabase
    .from("contacts").select("active").eq("user_id", data.session.user.id).maybeSingle();
  if (!contact?.active) {
    await supabase.auth.signOut();
    throw apiError("Your claim hasn't been activated yet.", 422);
  }
  return { status: "OK", token: data.session.access_token };
};

// ---------------------------------------------------------------------------
// Claim → rooms → items → products
// ---------------------------------------------------------------------------
export const getClaimView = async (jobGUID: string) =>
  unwrap(await supabase.rpc("api_claim_view", { p_job: jobGUID })) as TClaimView;

export const getItemProducts = async (
  jobGUID: string, room: string, item: string, search = "", page = 1, perPage = 24,
  filters: TFilterSelection = {}
) => {
  const active = Object.fromEntries(Object.entries(filters).filter(([, v]) => v.length));
  const res = unwrap(await supabase.rpc("api_item_products", {
    p_job: jobGUID, p_room: room, p_item: item, p_search: search || null, p_page: page, p_per_page: perPage,
    p_filters: Object.keys(active).length ? active : null,
  })) as { total: number; data: TItemProduct[] };
  return { products: res.data, total: res.total };
};

/** quantity 0 removes the product from this item */
export const setSelection = async (jobGUID: string, room: string, item: string, productGUID: string, quantity: number) =>
  unwrap(await supabase.rpc("api_set_selection", {
    p_job: jobGUID, p_room: room, p_item: item, p_product: productGUID, p_quantity: quantity,
  })) as { quantity: number; budget_summary: TBudgetSummary };

export const getClaimSelection = async (jobGUID: string) =>
  unwrap(await supabase.rpc("api_claim_selection", { p_job: jobGUID })) as TClaimSelectionLine[];

export const getItemFilters = async (jobGUID: string, room: string, item: string) =>
  unwrap(await supabase.rpc("api_item_filters", { p_job: jobGUID, p_room: room, p_item: item })) as TItemFilter[];

/** Normalised filter attributes for one product (Colour, Finish, Material…). */
export const getProductAttrs = async (guid: string) =>
  unwrap(await supabase.from("product_attrs").select("key, value").eq("product_id", guid)) as { key: string; value: string }[];
