import { Nullable } from "./utils";

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
  company: any;
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
  company_name?: string; // added client-side for search results
  company_guid?: string; // added client-side
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
  price_bands: TPriceBandsCategory | null;
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

export type TCreateCompanyContactBody = {
  company_guid: string;
  service_mate_uuid: string;
  name: string;
  email: string;
  password: string;
  is_primary_contact: boolean;
  phone?: string;
  mobile?: string;
  type: string;
};

export type TPriceBandsCategory = {
  guid: string;
  band: number;
  created_at: string;
  updated_at: string;
};

export type TPriceBandsRes = {
  status: string;
  price_bands: TPriceBandsCategory[];
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

export type Product = {
  description: string;
  image: Nullable<string>;
  manufacturer: Nullable<string>;
  name: string;
  miscellaneous: string;
  price: Nullable<string | number>;
  price_band: TPriceBandsCategory | null;
  sku: string;
  price_has_vat: number;
  guid: string;
  category?: TCategory;
  supplier?: TSupplier;
  rooms?: TProductRoom[];
  rooms_manual?: number;
};

export type TProductRoom = { slug: string; name: string };

export type TRoom = { guid: string; slug: string; name: string; sort: number; products: number };

export type TRoomRule = {
  id: string;
  supplier: string;
  category: string | null;
  name_pattern: string | null;
  rooms: string[];
  priority: number;
  origin: "sheet" | "suggested" | "manual";
  note: string | null;
  active: boolean;
};

export type TCategory = {
  guid: string;
  name: string;
  image: string | null;
  created_at: string;
  updated_at: string;
  children?: TCategory[]
};

export type TCategoryTree = (TCategory & { children: TCategory[] })[];

export type TSupplier = {
  guid: string;
  name: string;
  image: string | null;
  created_at: string;
  updated_at: string;
};

export type TJob = {
  guid: string;
  service_mate_uuid: string;
  created_at: string;
  updated_at: string;
}
