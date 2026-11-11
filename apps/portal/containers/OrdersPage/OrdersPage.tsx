import Link from "next/link";
import { observer } from "mobx-react-lite";
import { useEffect, useMemo, useState } from "react";

import withAuth from "@/hoc/withAuth";
import DashboardLayout from "@/components/DashboardLayout";
import PageHeader from "@/components/PageHeader";
import { useStores } from "@/hooks/useStores";
import { getOrderData } from "@/services/requestService";
import { errorLogger } from "@/services/axiosService";
import { TJob, TOrder } from "@/types/api";

type Line = {
  guid: string;
  name?: string;
  sku?: string;
  quantity?: number;
  item?: string | null;
  in_budget?: number;
  product?: { guid?: string | null; name?: string; sku?: string; image?: string | null; in_budget?: number; supplier?: { name?: string } } | null;
};

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
const fmtTime = (d: string) => new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
const cleanAddress = (a?: string | null) => a?.replace(/\s*\n\s*/g, ", ").replace(/,\s*$/, "") || "";

const Thumb = ({ src, size = 56 }: { src?: string | null; size?: number }) => (
  <div className="shrink-0 overflow-hidden rounded-lg bg-[#F3ECFB] p-1" style={{ width: size, height: size }}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img
      src={src || "/images/placeholder.jpg"}
      alt=""
      loading="lazy"
      className="block h-full w-full object-contain"
      onError={(e) => {
        const img = e.currentTarget;
        if (!img.src.endsWith("/images/placeholder.jpg")) img.src = "/images/placeholder.jpg";
      }}
    />
  </div>
);

/** The signed-in user's orders, newest first, each showing what was ordered. */
const OrdersPage = () => {
  const { authStore } = useStores();
  const jobs = (authStore.getUser?.company?.jobs || []) as TJob[];
  const orders = useMemo(
    () =>
      jobs
        .flatMap((j) => ((j.orders as { guid: string; created_at: string }[]) || []).map((o) => ({ ...o, job: j })))
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [jobs]
  );

  const [details, setDetails] = useState<Record<string, TOrder>>({});
  const [open, setOpen] = useState<Record<string, boolean>>({});

  // load every order's lines (customers have a handful) so cards can show counts and pictures
  useEffect(() => {
    orders.forEach((o, i) => {
      if (details[o.guid]) return;
      getOrderData(o.guid)
        .then(({ order }) => setDetails((d) => ({ ...d, [o.guid]: order })))
        .catch((e) => errorLogger(e, "Couldn't load an order"));
      if (i === 0) setOpen((s) => (o.guid in s ? s : { ...s, [o.guid]: true }));
    });
  }, [orders]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <DashboardLayout>
      <div className="max-w-[1280px] mx-auto px-4 py-8">
        <PageHeader
          title="Your orders"
          subtitle="Everything you've ordered for your claims."
          chips={orders.length ? [`${orders.length} order${orders.length === 1 ? "" : "s"}`] : undefined}
        />

        {orders.length === 0 ? (
          <div className="rounded-xl bg-white p-10 text-center shadow-sm">
            <p className="text-lg font-semibold">No orders yet</p>
            <p className="mt-1 text-gray-600">When you place an order for a claim it will appear here.</p>
            <Link href="/dashboard" className="mt-5 inline-block rounded-md bg-[#6D21C7] px-5 py-2.5 font-semibold text-white hover:bg-[#5a19a8]">
              Go to my claims
            </Link>
          </div>
        ) : (
          <ul className="space-y-5">
            {orders.map((o) => {
              const lines = ((details[o.guid]?.order_lines as unknown as Line[]) || []).slice();
              const qty = lines.reduce((n, l) => n + (l.quantity ?? 1), 0);
              const isOpen = !!open[o.guid];
              const byItem = new Map<string, Line[]>();
              for (const l of lines) {
                const k = l.item || "Other";
                byItem.set(k, [...(byItem.get(k) ?? []), l]);
              }
              return (
                <li key={o.guid} className="overflow-hidden rounded-xl bg-white shadow-sm">
                  {/* Order header */}
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b bg-[#F7F2FC] px-5 py-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-lg font-bold text-[#4B1590]">Claim {o.job.job_number}</span>
                        <span className="rounded-full bg-[#D1FADF] px-2.5 py-0.5 text-xs font-semibold text-[#027A48]">Order placed</span>
                      </div>
                      {cleanAddress(o.job.job_address) && <p className="text-sm text-gray-600">{cleanAddress(o.job.job_address)}</p>}
                    </div>
                    <dl className="ml-auto flex flex-wrap gap-x-6 gap-y-1 text-sm">
                      <div>
                        <dt className="text-xs text-gray-500">Ordered</dt>
                        <dd className="font-medium">
                          {fmtDate(o.created_at)} · {fmtTime(o.created_at)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-gray-500">Products</dt>
                        <dd className="font-medium">{details[o.guid] ? lines.length : "…"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-gray-500">Total quantity</dt>
                        <dd className="font-medium">{details[o.guid] ? qty : "…"}</dd>
                      </div>
                    </dl>
                  </div>

                  {/* Collapsed preview */}
                  {!isOpen && (
                    <div className="flex flex-wrap items-center gap-3 px-5 py-4">
                      <div className="flex -space-x-2">
                        {lines.slice(0, 6).map((l) => (
                          <div key={l.guid} className="rounded-lg ring-2 ring-white">
                            <Thumb src={l.product?.image} size={44} />
                          </div>
                        ))}
                      </div>
                      {lines.length > 6 && <span className="text-sm text-gray-500">+{lines.length - 6} more</span>}
                      <button
                        type="button"
                        onClick={() => setOpen((s) => ({ ...s, [o.guid]: true }))}
                        className="ml-auto rounded-md border border-[#6D21C7] px-4 py-2 text-sm font-semibold text-[#6D21C7] hover:bg-[#6D21C7] hover:text-white"
                      >
                        View items
                      </button>
                    </div>
                  )}

                  {/* Items */}
                  {isOpen && (
                    <div>
                      {!details[o.guid] ? (
                        <p className="px-5 py-4 text-sm text-gray-500">Loading…</p>
                      ) : lines.length === 0 ? (
                        <p className="px-5 py-4 text-sm text-gray-500">No items on this order.</p>
                      ) : (
                        Array.from(byItem.entries()).map(([item, ls]) => (
                          <div key={item} className="border-b last:border-b-0">
                            <p className="px-5 pt-4 text-xs font-semibold uppercase tracking-wide text-gray-500">{item}</p>
                            <ul className="px-3 pb-3">
                              {ls.map((l) => (
                                <li key={l.guid} className="flex items-center gap-4 rounded-lg px-2 py-2">
                                  <Thumb src={l.product?.image} />
                                  <div className="min-w-0 flex-1">
                                    {l.product?.guid ? (
                                      <Link href={`/product?guid=${l.product.guid}`} className="font-medium leading-snug hover:text-[#6D21C7]">
                                        {l.product?.name ?? l.name}
                                      </Link>
                                    ) : (
                                      <p className="font-medium leading-snug">{l.name}</p>
                                    )}
                                    <p className="mt-0.5 text-xs text-gray-500">
                                      {[l.product?.supplier?.name, l.product?.sku ?? l.sku].filter(Boolean).join(" · ")}
                                    </p>
                                  </div>
                                  <span
                                    className={`hidden sm:inline text-[11px] font-semibold rounded-full px-2 py-0.5 ${
                                      Number(l.in_budget ?? l.product?.in_budget) ? "bg-[#D1FADF] text-[#027A48]" : "bg-[#6D21C7] text-white"
                                    }`}
                                  >
                                    {Number(l.in_budget ?? l.product?.in_budget) ? "Included" : "Extra cost"}
                                  </span>
                                  <span className="grid h-9 min-w-[2.75rem] place-items-center rounded-full bg-[#6D21C7]/10 px-3 text-sm font-bold text-[#6D21C7]">
                                    ×{l.quantity ?? 1}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))
                      )}
                      <div className="flex justify-end px-5 py-3 border-t bg-gray-50">
                        <button
                          type="button"
                          onClick={() => setOpen((s) => ({ ...s, [o.guid]: false }))}
                          className="text-sm text-gray-600 underline"
                        >
                          Hide items
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </DashboardLayout>
  );
};

export default withAuth(observer(OrdersPage));
