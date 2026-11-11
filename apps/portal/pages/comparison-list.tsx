import Link from "next/link";
import { observer } from "mobx-react-lite";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";

import withAuth from "@/hoc/withAuth";
import DashboardLayout from "@/components/DashboardLayout";
import PageHeader from "@/components/PageHeader";
import useCompare from "@/hooks/useCompare";
import { errorLogger } from "@/services/axiosService";
import { getAllProducts, getClaimSelection, setSelection } from "@/services/requestService";
import { supabase } from "@/services/supabase";
import { TProduct } from "@/types/api";
import { productDetails } from "@/containers/ProductPage/productDetails";

const KEY_ORDER = ["Colour", "Finish", "Material", "Style", "Range", "Type", "Size", "Width", "Height", "Depth", "Length", "Thickness", "Use", "Brand"];

/** Side-by-side comparison of up to 4 products. In a claim, each can be added to the item. */
const ComparisonPage = () => {
  const router = useRouter();
  const q = router.query;
  const job = typeof q.job === "string" ? q.job : "";
  const room = typeof q.room === "string" ? q.room : "";
  const item = typeof q.item === "string" ? q.item : "";
  const inClaim = !!(job && room && item);

  const { ids, remove, clear } = useCompare();
  const [products, setProducts] = useState<TProduct[]>([]);
  const [attrs, setAttrs] = useState<{ product_id: string; key: string; value: string }[]>([]);
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!router.isReady) return;
    if (!ids.length) {
      setProducts([]);
      setLoaded(true);
      return;
    }
    (async () => {
      try {
        const [{ products: p }, a] = await Promise.all([
          getAllProducts(ids),
          supabase.from("product_attrs").select("product_id, key, value").in("product_id", ids),
        ]);
        setProducts(ids.map((id) => p.find((x) => x.guid === id)).filter(Boolean) as TProduct[]);
        setAttrs((a.data as typeof attrs) ?? []);
        if (inClaim) {
          const lines = await getClaimSelection(job);
          const m: Record<string, number> = {};
          for (const l of lines) if (l.room === room && l.item === item) m[l.product.guid] = l.quantity;
          setSelected(m);
        }
      } catch (error) {
        errorLogger(error, "Couldn't load the products to compare");
      } finally {
        setLoaded(true);
      }
    })();
  }, [ids, router.isReady, job, room, item]); // eslint-disable-line react-hooks/exhaustive-deps

  // rows: normalised facts first, then the specification labels most products share
  const rows = useMemo(() => {
    const factKeys = Array.from(new Set(attrs.map((a) => a.key))).sort(
      (x, y) => (KEY_ORDER.indexOf(x) + 1 || 99) - (KEY_ORDER.indexOf(y) + 1 || 99)
    );
    const facts = factKeys.map((k) => ({
      label: k,
      values: products.map((p) => attrs.filter((a) => a.product_id === p.guid && a.key === k).map((a) => a.value).join(", ")),
    }));
    const specMaps = products.map((p) => new Map(productDetails(p.miscellaneous).specs.map((s) => [s.label, s.value])));
    const counts = new Map<string, number>();
    specMaps.forEach((m) => m.forEach((_, k) => counts.set(k, (counts.get(k) ?? 0) + 1)));
    const factSet = new Set(factKeys.map((k) => k.toLowerCase()));
    const specs = Array.from(counts.entries())
      .filter(([k, n]) => n >= Math.min(2, products.length) && !factSet.has(k.toLowerCase()))
      .slice(0, 20)
      .map(([k]) => ({ label: k, values: specMaps.map((m) => m.get(k) ?? "") }));
    return [...facts, ...specs].filter((r) => r.values.some(Boolean));
  }, [products, attrs]);

  const add = async (p: TProduct, n: number) => {
    try {
      setBusy(p.guid);
      const res = await setSelection(job, room, item, p.guid, n);
      setSelected((s) => ({ ...s, [p.guid]: res.quantity }));
      toast.success(n > 0 ? `Added to ${item}` : `Removed from ${item}`);
    } catch (error) {
      errorLogger(error, "Couldn't update your selection");
    } finally {
      setBusy(null);
    }
  };

  const back = inClaim ? { href: `/claim-room?job=${job}&room=${room}&item=${encodeURIComponent(item)}`, label: `Back to ${item}` } : undefined;
  const differs = (values: string[]) => new Set(values.map((v) => v || "—")).size > 1;

  return (
    <DashboardLayout>
      <div className="max-w-[1280px] mx-auto px-4 py-8">
        <PageHeader
          back={back}
          title="Compare products"
          subtitle={products.length ? "Differences are highlighted." : undefined}
          actions={
            products.length ? (
              <button type="button" onClick={clear} className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:border-[#6D21C7]">
                Clear comparison
              </button>
            ) : undefined
          }
        />

        {loaded && products.length === 0 ? (
          <div className="rounded-xl bg-white shadow-sm p-8 text-center text-gray-600">
            Nothing to compare yet. Tick <b>Compare</b> on products, or use <b>Add to compare</b> on a product page.
            {back && (
              <div className="mt-4">
                <Link href={back.href} className="underline">
                  {back.label}
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
            <table className="w-full min-w-[640px] table-fixed text-sm">
              <colgroup>
                <col className="w-40" />
                {products.map((p) => (
                  <col key={p.guid} />
                ))}
              </colgroup>
              <thead>
                <tr className="align-top">
                  <th className="p-4" />
                  {products.map((p) => {
                    const href = `/product?guid=${p.guid}${inClaim ? `&job=${job}&room=${room}&item=${encodeURIComponent(item)}` : ""}`;
                    const qty = selected[p.guid] ?? 0;
                    return (
                      <th key={p.guid} className="p-4 text-left font-normal">
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => remove(p.guid)}
                            className="absolute right-0 top-0 grid h-6 w-6 place-items-center rounded-full bg-gray-100 text-xs hover:bg-gray-200"
                            aria-label={`Remove ${p.name} from comparison`}
                          >
                            ✕
                          </button>
                          <Link href={href} className="block h-36 rounded-lg bg-[#F3ECFB] p-2" tabIndex={-1} aria-hidden>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={p.image || "/images/placeholder.jpg"} alt="" className="block h-full w-full object-contain" />
                          </Link>
                          <Link href={href} className="mt-3 block font-semibold leading-snug hover:text-[#6D21C7]">
                            {p.name}
                          </Link>
                          <p className="mt-1 text-xs text-gray-500">{[p.supplier?.name, p.sku].filter(Boolean).join(" · ")}</p>
                          <span
                            className={`mt-2 inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                              Number(p.in_budget) ? "bg-[#D1FADF] text-[#027A48]" : "bg-[#6D21C7] text-white"
                            }`}
                          >
                            {Number(p.in_budget) ? "Included in budget" : "Extra cost"}
                          </span>
                          {inClaim && (
                            <div className="mt-3">
                              {qty === 0 ? (
                                <button
                                  type="button"
                                  disabled={busy === p.guid}
                                  onClick={() => add(p, 1)}
                                  className="w-full rounded-md bg-[#6D21C7] py-2 text-sm font-semibold text-white hover:bg-[#5a19a8] disabled:opacity-50"
                                >
                                  Add to {item}
                                </button>
                              ) : (
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="font-semibold text-[#027A48]">Added × {qty}</span>
                                  <button type="button" className="ml-auto underline text-red-600" disabled={busy === p.guid} onClick={() => add(p, 0)}>
                                    Remove
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const diff = differs(r.values);
                  return (
                    <tr key={r.label} className={`border-t align-top ${diff ? "bg-[#6D21C7]/[0.04]" : ""}`}>
                      <th scope="row" className="p-3 text-left font-medium text-gray-500">
                        {r.label}
                      </th>
                      {r.values.map((v, i) => (
                        <td key={i} className={`p-3 break-words ${diff ? "font-medium" : ""}`}>
                          {v || <span className="text-gray-400">—</span>}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default withAuth(observer(ComparisonPage));
