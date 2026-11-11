import { observer } from "mobx-react-lite";
import { useEffect, useState } from "react";

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
  product?: { name?: string; sku?: string; image?: string | null } | null;
};

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/** The signed-in user's orders, newest first; open one to see what was ordered. */
const OrdersPage = () => {
  const { authStore } = useStores();
  const jobs = (authStore.getUser?.company?.jobs || []) as TJob[];
  const orders = jobs
    .flatMap((j) => ((j.orders as { guid: string; created_at: string }[]) || []).map((o) => ({ ...o, job: j })))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  const [openId, setOpenId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, TOrder>>({});

  useEffect(() => {
    if (!openId || details[openId]) return;
    getOrderData(openId)
      .then(({ order }) => setDetails((d) => ({ ...d, [openId]: order })))
      .catch((e) => errorLogger(e, "Couldn't load that order"));
  }, [openId, details]);

  return (
    <DashboardLayout>
      <div className="max-w-[1280px] mx-auto px-4 py-8">
        <PageHeader title="Orders" subtitle="Products you've ordered for your claims." />

        {orders.length === 0 ? (
          <div className="rounded-xl bg-white shadow-sm p-8 text-center text-gray-600">You haven&apos;t placed any orders yet.</div>
        ) : (
          <ul className="space-y-3">
            {orders.map((o) => {
              const isOpen = openId === o.guid;
              const lines = (details[o.guid]?.order_lines as unknown as Line[]) || [];
              return (
                <li key={o.guid} className="rounded-xl bg-white shadow-sm">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenId(isOpen ? null : o.guid)}
                    className="w-full flex flex-wrap items-center gap-x-6 gap-y-1 px-5 py-4 text-left"
                  >
                    <span className="font-semibold">Claim {o.job.job_number}</span>
                    <span className="text-gray-600 flex-1 min-w-[12rem]">
                      {o.job.job_address?.replace(/\s*\n\s*/g, ", ").replace(/,\s*$/, "")}
                    </span>
                    <span className="text-sm text-gray-500">Ordered {fmtDate(o.created_at)}</span>
                    <span aria-hidden className="text-gray-400">{isOpen ? "▴" : "▾"}</span>
                  </button>
                  {isOpen && (
                    <div className="border-t px-5 py-4">
                      {!details[o.guid] ? (
                        <p className="text-sm text-gray-500">Loading…</p>
                      ) : lines.length === 0 ? (
                        <p className="text-sm text-gray-500">No lines on this order.</p>
                      ) : (
                        <table className="w-full text-sm">
                          <thead className="text-left text-gray-500">
                            <tr>
                              <th className="py-1 pr-3 font-medium w-14">Qty</th>
                              <th className="py-1 pr-3 font-medium">Product</th>
                              <th className="py-1 pr-3 font-medium">For</th>
                            </tr>
                          </thead>
                          <tbody>
                            {lines.map((l) => (
                              <tr key={l.guid} className="border-t">
                                <td className="py-2 pr-3 font-semibold">{l.quantity ?? 1}×</td>
                                <td className="py-2 pr-3">
                                  {l.product?.name ?? l.name}
                                  <span className="block text-xs text-gray-500">{l.product?.sku ?? l.sku}</span>
                                </td>
                                <td className="py-2 pr-3 text-gray-600">{l.item ?? "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
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
