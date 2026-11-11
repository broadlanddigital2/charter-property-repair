// Turn each supplier's product data (stored in `miscellaneous`) into one shape for the product page.

export type TSpec = { label: string; value: string };
export type TDoc = { name: string; url: string };
export type TDetails = { specs: TSpec[]; features: string[]; images: string[]; documents: TDoc[]; link: string | null };

const parse = (v: unknown): any => {
  if (typeof v !== "string") return v;
  const t = v.trim();
  if (!t.startsWith("{") && !t.startsWith("[")) return v;
  try {
    return JSON.parse(t);
  } catch {
    return v;
  }
};

const pipeList = (s: unknown) =>
  typeof s === "string" ? s.split(" | ").map((x) => x.trim()).filter(Boolean) : [];

const pipeSpecs = (s: unknown): TSpec[] =>
  pipeList(s)
    .filter((p) => p.includes(":"))
    .map((p) => ({ label: p.slice(0, p.indexOf(":")).trim(), value: p.slice(p.indexOf(":") + 1).trim() }))
    .filter((x) => x.label && x.value);

const objSpecs = (o: unknown): TSpec[] =>
  o && typeof o === "object" && !Array.isArray(o)
    ? Object.entries(o as Record<string, unknown>)
        .filter(([, v]) => v !== null && v !== "" && typeof v !== "object")
        .map(([k, v]) => ({ label: k, value: String(v) }))
    : [];

const abs = (u: string) => (u.startsWith("//") ? `https:${u}` : u.startsWith("/-/") ? `https://www.howdens.com${u}` : u);

const HIDE = /^(no\.|gross weight|net weight|manufacturer model no|model number|country origin|vat|made to order|assembly service required)$/i;

export function productDetails(miscellaneous: unknown, mainImage?: string | null): TDetails {
  const m = parse(miscellaneous);
  const out: TDetails = { specs: [], features: [], images: [], documents: [], link: null };
  if (!m || typeof m !== "object") return out;

  // Howdens: JSON objects as text
  out.specs.push(...objSpecs(parse(m.specifications)));
  out.specs.push(...objSpecs(parse(m.measurements)));
  // Travis Perkins / Eastbrooke: "Key: value | Key: value"
  out.specs.push(...pipeSpecs(m.technicalSpecifications));
  if (typeof m.specifications === "string" && !m.specifications.trim().startsWith("{")) out.specs.push(...pipeSpecs(m.specifications));
  // Benchmarx
  for (const [k, label] of [["attr_colour", "Colour"], ["attr_finish", "Finish"], ["attr_style", "Style"], ["attr_type", "Type"]])
    if (m[k]) out.specs.push({ label, value: String(m[k]) });
  // Chartered Properties tiles
  for (const k of ["material", "finish", "width (mm)", "length (mm)", "thickness (mm)", "pieces per m2", "box quantity"])
    if (m[k]) out.specs.push({ label: k.replace(/^\w/, (c: string) => c.toUpperCase()), value: String(m[k]) });
  if (m.wall === "✓" || m.floor === "✓")
    out.specs.push({ label: "Suitable for", value: [m.wall === "✓" && "Walls", m.floor === "✓" && "Floors"].filter(Boolean).join(", ") });

  const seen = new Set<string>();
  out.specs = out.specs.filter((s) => {
    const k = s.label.toLowerCase();
    if (HIDE.test(s.label) || seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  out.features = pipeList(m.featuresAndBenefits);

  // Gallery: Howdens galleryImages, Travis Perkins otherImages
  const gallery = parse(m.galleryImages);
  if (Array.isArray(gallery)) out.images.push(...gallery.map((g: any) => g?.src).filter(Boolean).map(abs));
  if (typeof m.otherImages === "string")
    out.images.push(...m.otherImages.split(/[|,\s]+/).filter((u: string) => u.includes("/")).map(abs));
  const all = [mainImage, ...out.images].filter(Boolean) as string[];
  out.images = Array.from(new Set(all)).slice(0, 8);

  const docs = parse(m.documents);
  if (Array.isArray(docs)) out.documents = docs.filter((d: any) => d?.url && d?.name).map((d: any) => ({ name: d.name, url: abs(d.url) }));

  out.link = m.canonicalUrl || m.productPage || null;
  return out;
}
