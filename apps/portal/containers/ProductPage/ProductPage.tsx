import Link from "next/link";
import { observer } from "mobx-react-lite";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";

import withAuth from "@/hoc/withAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { useStores } from "@/hooks/useStores";
import { errorLogger } from "@/services/axiosService";
import { getClaimSelection, getProductAttrs, getProductByGUID, setSelection } from "@/services/requestService";
import { TProduct } from "@/types/api";
import { productDetails } from "./productDetails";

const PREFERRED = ["Colour", "Finish", "Material", "Style", "Range", "Type", "Size", "Width", "Height", "Depth", "Length"];

/**
 * Product details. Opened from a claim room (?job&room&item) it also lets the
 * user add the product to that item, or change the quantity.
 */
const ProductPage = () => {
  const router = useRouter();
  const { loaderStore } = useStores();
  const q = router.query;
  const guid = typeof q.guid === "string" ? q.guid : "";
  const job = typeof q.job === "string" ? q.job : "";
  const room = typeof q.room === "string" ? q.room : "";
  const item = typeof q.item === "string" ? q.item : "";
  const inClaim = !!(job && room && item);

  const [product, setProduct] = useState<(TProduct & { rooms?: { slug: string; name: string }[] }) | null>(null);
  const [attrs, setAttrs] = useState<{ key: string; value: string }[]>([]);
  const [active, setActive] = useState(0);
  const [broken, setBroken] = useState<Record<string, boolean>>({});
  const [qty, setQty] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!guid) return;
    (async () => {
      try {
        loaderStore.setLoading(true);
        const [{ product: p }, a] = await Promise.all([getProductByGUID(guid), getProductAttrs(guid).catch(() => [])]);
        setProduct(p);
        setAttrs(a);
        setActive(0);
        if (inClaim) {
          const lines = await getClaimSelection(job);
          const line = lines.find((l) => l.product.guid === guid && l.room === room && l.item === item);
          setQty(line?.quantity ?? 0);
        }
      } catch (error) {
        errorLogger(error, "Couldn't load this product");
      } finally {
        loaderStore.setLoading(false);
      }
    })();
  }, [guid, job, room, item]); // eslint-disable-line react-hooks/exhaustive-deps

  const details = useMemo(() => productDetails(product?.miscellaneous, product?.image), [product]);
  const images = details.images.filter((u) => !broken[u]);
  const mainImage = images[active] ?? images[0] ?? "/images/placeholder.jpg";

  // key facts: the normalised attributes, in a sensible order
  const facts = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const a of attrs) m.set(a.key, [...(m.get(a.key) ?? []), a.value]);
    return Array.from(m.entries()).sort(
      (x, y) => (PREFERRED.indexOf(x[0]) + 1 || 99) - (PREFERRED.indexOf(y[0]) + 1 || 99)
    );
  }, [attrs]);

  const backHref = inClaim
    ? `/claim-room?job=${job}&room=${room}&item=${encodeURIComponent(item)}`
    : null;

  const change = async (n: number) => {
    if (!product) return;
    try {
      setBusy(true);
      const res = await setSelection(job, room, item, product.guid, n);
      setQty(res.quantity);
      if (n > 0 && qty === 0) toast.success(`Added to ${item}`);
      if (n === 0) toast.info(`Removed from ${item}`);
    } catch (error) {
      errorLogger(error, "Couldn't update your selection");
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-[1280px] mx-auto px-4 py-8">
        {backHref ? (
          <Link href={backHref} className="inline-block text-sm text-gray-600 hover:text-[#6D21C7] mb-4">
            ← Back to {item}
          </Link>
        ) : (
          <button type="button" onClick={() => router.back()} className="text-sm text-gray-600 hover:text-[#6D21C7] mb-4">
            ← Back
          </button>
        )}

        {product && (
          <>
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              {/* Gallery */}
              <div>
                <div className="rounded-xl bg-white shadow-sm aspect-square max-h-[520px] w-full flex items-center justify-center overflow-hidden p-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={mainImage}
                    alt={product.name}
                    className="block h-full w-full object-contain"
                    onError={() => mainImage && setBroken((b) => ({ ...b, [mainImage]: true }))}
                  />
                </div>
                {images.length > 1 && (
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1" role="list" aria-label="More images">
                    {images.map((src, i) => (
                      <button
                        key={src}
                        type="button"
                        role="listitem"
                        aria-label={`Image ${i + 1}`}
                        aria-pressed={i === active}
                        onClick={() => setActive(i)}
                        className={`h-20 w-20 shrink-0 rounded-lg bg-white p-1 ring-2 ${
                          i === active ? "ring-[#6D21C7]" : "ring-transparent hover:ring-gray-300"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={src}
                          alt=""
                          loading="lazy"
                          className="block h-full w-full object-contain"
                          onError={() => setBroken((b) => ({ ...b, [src]: true }))}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Summary */}
              <div>
                <p className="text-sm text-gray-500">
                  {[product.supplier?.name, product.category?.name].filter(Boolean).join(" · ")}
                </p>
                <h1 className="mt-1 text-2xl md:text-3xl font-bold tracking-tight">{product.name}</h1>
                <p className="mt-1 text-sm text-gray-500">SKU {product.sku}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span
                    className={`text-xs font-semibold px-3 py-1 rounded-full ${
                      Number(product.in_budget) ? "bg-[#D1FADF] text-[#027A48]" : "bg-[#6D21C7] text-white"
                    }`}
                  >
                    {Number(product.in_budget) ? "Included in budget" : "Extra cost"}
                  </span>
                  {(product.rooms ?? []).slice(0, 6).map((r) => (
                    <span key={r.slug} className="text-xs px-3 py-1 rounded-full bg-white ring-1 ring-gray-200 text-gray-700">
                      {r.name}
                    </span>
                  ))}
                </div>

                {inClaim && (
                  <div className="mt-6 rounded-xl bg-white shadow-sm p-5">
                    <p className="text-sm text-gray-500">
                      For <b className="text-[#1F1A2B]">{item}</b>
                    </p>
                    {qty === 0 ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => change(1)}
                        className="mt-3 w-full rounded-md bg-[#6D21C7] py-3 font-semibold text-white hover:bg-[#5a19a8] disabled:opacity-50"
                      >
                        Add to {item}
                      </button>
                    ) : (
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <div className="flex items-center rounded-md border" role="group" aria-label="Quantity">
                          <button type="button" className="px-4 py-2 hover:bg-gray-100" disabled={busy} onClick={() => change(qty - 1)} aria-label="Decrease quantity">
                            −
                          </button>
                          <span className="min-w-[3rem] text-center font-semibold" aria-live="polite">
                            {qty}
                          </span>
                          <button type="button" className="px-4 py-2 hover:bg-gray-100" disabled={busy} onClick={() => change(qty + 1)} aria-label="Increase quantity">
                            +
                          </button>
                        </div>
                        <span className="text-sm text-[#027A48] font-semibold">Added</span>
                        <button type="button" className="ml-auto text-sm text-red-600 underline" disabled={busy} onClick={() => change(0)}>
                          Remove
                        </button>
                      </div>
                    )}
                    {backHref && (
                      <Link href={backHref} className="mt-3 inline-block text-sm underline text-gray-600">
                        Keep choosing {item.toLowerCase()}
                      </Link>
                    )}
                  </div>
                )}

                {facts.length > 0 && (
                  <dl className="mt-6 grid grid-cols-2 gap-3">
                    {facts.slice(0, 8).map(([k, vs]) => (
                      <div key={k} className="rounded-lg bg-white p-3 shadow-sm">
                        <dt className="text-xs text-gray-500">{k}</dt>
                        <dd className="font-medium">{vs.join(", ")}</dd>
                      </div>
                    ))}
                  </dl>
                )}

                {product.description && product.description.trim() !== product.name.trim() && (
                  <p className="mt-6 text-gray-700 leading-relaxed whitespace-pre-line">{product.description}</p>
                )}
              </div>
            </div>

            {/* Details */}
            <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              {details.specs.length > 0 && (
                <section>
                  <h2 className="text-lg font-bold mb-3">Specification</h2>
                  <dl className="divide-y rounded-xl bg-white shadow-sm">
                    {details.specs.map((s) => (
                      <div key={s.label} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-4 px-5 py-2.5 text-sm">
                        <dt className="text-gray-500">{s.label}</dt>
                        <dd className="break-words">{s.value}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              )}

              <div className="space-y-8">
                {details.features.length > 0 && (
                  <section>
                    <h2 className="text-lg font-bold mb-3">Features</h2>
                    <ul className="rounded-xl bg-white shadow-sm p-5 space-y-2 text-sm">
                      {details.features.map((f) => (
                        <li key={f} className="flex gap-2">
                          <span aria-hidden className="text-[#31B75C]">✓</span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {details.documents.length > 0 && (
                  <section>
                    <h2 className="text-lg font-bold mb-3">Documents</h2>
                    <ul className="divide-y rounded-xl bg-white shadow-sm text-sm">
                      {details.documents.map((d) => (
                        <li key={d.url}>
                          <a href={d.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-5 py-3 hover:text-[#6D21C7]">
                            <span aria-hidden>📄</span>
                            {d.name}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {details.link && (
                  <a href={details.link} target="_blank" rel="noreferrer" className="inline-block text-sm underline text-gray-600">
                    View on the {product.supplier?.name ?? "supplier"} website ↗
                  </a>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default withAuth(observer(ProductPage));
