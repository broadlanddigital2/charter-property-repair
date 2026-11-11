export type TLoginCredentials = {
  email: string;
  password: string;
};

export type TLoginRes = {
  status: string;
  token: string;
};

export type TUser = {
  id: number;
  name: string;
  email: string;
  email_verified_at: any;
  created_at: string;
  updated_at: string;
  guid: any;
  active: number;
  is_primary_contact: number;
  phone: any;
  mobile: any;
  type: string;
  service_mate_uuid: any;
  company: TCompany | null;
};

export type TCompanyContact = {
  guid: string;
  id: number;
  active: number;
  created_at: string;
  updated_at: string;
  email: string;
  email_verified_at: string | null;
  is_primary_contact: number;
  mobile: string;
  name: string;
  phone: string;
  type: string;
};

export type TCompany = {
  guid: string;
  service_mate_uuid: string;
  name: string;
  website: string;
  abn_number: string;
  address: string;
  address_street: string;
  address_city: string;
  address_state: string;
  address_postcode: string;
  address_country: string;
  billing_address: string;
  active: number;
  is_individual: number;
  contacts: TCompanyContact[];
  badges: string;
  fax_number: string;
  tax_rate_uuid: string;
  custom_field_payment_terms: string;
  parent_company_uuid: string;
  payment_terms: string;
  jobs: TJob[];
  created_at: string;
  updated_at: string;
};

export type TCompanyAddressData = Pick<
  TCompany,
  | "address_postcode"
  | "address_city"
  | "address_country"
  | "address_street"
  | "address_state"
>;

export type TPriceBandsCategory = {
  guid: string;
  band: number;
  created_at: string;
  updated_at: string;
};

export type TPriceBandsRes = {
  status: string;
  categories: TPriceBandsCategory[];
};

export type TApiAddress = {
  country: string;
  county: string; // state?
  district: string;
  line_1: string; // street
  line_2: string;
  line_3: string;
};

export type TApiAddressDetails = {
  code: number;
  limit: number;
  message: string;
  page: number;
  total: number;
  result: TApiAddress[];
};

export type TProduct = {
  guid: string;
  sku: string;
  name: string;
  manufacturer: string | null;
  description: string;
  image: string | null;
  price: number | null;
  price_has_vat: number;
  miscellaneous: string;
  category: TCategory;
  supplier: TSupplier;
  in_budget: 0 | 1;
  created_at: string;
  updated_at: string;
};

export type TProductDetails = {
  featuresAndBenefits: string;
  minimumHirePeriod: string;
  otherImages: string;
  technicalSpecifications: string;
  type: string;
  vatRate: string;
};

export type TCategory = {
  guid: string;
  name: string;
  image: string | null;
  created_at: string;
  updated_at: string;
  children?: TCategory[];
};

export type TCategoryTree = (TCategory & { children: TCategory[] })[];

export type TSupplier = {
  guid: string;
  name: string;
  image: string | null;
  created_at: string;
  updated_at: string;
};

export type TBasket = {
  created_at: string;
  guid: string;
  updated_at: string;
  basket_lines?: TBasketLine[];
};

export type TJobBudget = {
  budget: number | null;
  total_in_budget: number;
  total_out_of_budget: number;
  total_remaning_budget: number;
  customer_to_pay: number;
};

export type TBasketLine = {
  guid: string;
  product?: TProduct;
  created_at: string;
  updated_at: string;
};

export type TJob = {
  guid: string;
  service_mate_uuid: string;
  job_number?: string | null;
  job_address?: string | null;
  status?: string | null;
  budget?: number | null;
  orders?: unknown[];
  rooms?: { slug: string; name: string; quantity: number; notes: string | null }[];
  activated_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type TOrder = {
  guid: string;
  created_at: string;
  updated_at: string;
  job: TJob;
  order_lines: TBasketLine[];
  service_mate_note_uuid: string;
};

export type TPagination<T> = {
  current_page: number;
  data: T[];
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number;
  total: number;
};

// ---- Claim → rooms → items journey ----
export type TBudgetSummary = {
  budget: number | null;
  total_in_budget: number;
  total_out_of_budget: number;
  total_remaning_budget: number;
  customer_to_pay: number;
} | null;

export type TRoomItem = { item: string; products: number; selected: number };

export type TClaimRoom = {
  slug: string;
  name: string;
  quantity: number;
  notes: string | null;
  items: TRoomItem[];
  selected_lines: number;
};

export type TClaimView = {
  guid: string;
  job_number: string | null;
  job_address: string | null;
  status: string | null;
  budget: number | null;
  ordered: boolean;
  budget_summary: TBudgetSummary;
  company?: { name: string; price_band: number | null } | null;
  rooms: TClaimRoom[];
};

export type TItemProduct = TProduct & { selected_quantity: number };

export type TClaimSelectionLine = {
  room: string;
  room_name: string;
  item: string;
  quantity: number;
  product: TProduct;
};

export type TItemFilter = { key: string; values: { value: string; count: number }[] };
export type TFilterSelection = Record<string, string[]>;
