import Link from "next/link";
import { observer } from "mobx-react-lite";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";

import DashboardLayout from "@/components/DashboardLayout";
import BudgetBar, { gbp } from "@/components/claim/BudgetBar";
import withAuth from "@/hoc/withAuth";
import { useStores } from "@/hooks/useStores";
import { errorLogger } from "@/services/axiosService";
import { createOrder, getClaimSelection, getClaimView } from "@/services/requestService";
import { TClaimSelectionLine, TClaimView } from "@/types/api";

/** A claim: its rooms (with progress), budget, and review & place order. */
const ClaimPage = () => {
  const router = useRouter();
  const { loaderStore, authStore } = useStores();
  const jobGUID = typeof router.query.job === "string" ? router.query.job : "";
  const reviewing = router.query.review === "1";

  const [claim, setClaim] = useState<TClaimView | null>(null);
  const [lines, setLines] = useState<TClaimSelectionLine[]>([]);

  useEffect(() => {
    if (!jobGUID) return;
    (async () => {
      try {
        loaderStore.setLoading(true);
        const [c, l] = await Promise.all([getClaimView(jobGUID), getClaimSelection(jobGUID)]);
        setClaim(c);
        setLines(l);
      } catch (error) {
        errorLogger(error, "Couldn't load your claim");
      } finally {
        loaderStore.setLoading(false);
      }
    })();
  }, [jobGUID, loaderStore]);

  const grouped = useMemo(() => {
    const m = new Map<string, { name: string; items: Map<string, TClaimSelectionLine[]> }>();
    for (const l of lines) {
      if (!m.has(l.room)) m.set(l.room, { name: l.room_name, items: new Map() });
      const r = m.get(l.room)!;
      if (!r.items.has(l.item)) r.items.set(l.item, []);
      r.items.get(l.item)!.push(l);
    }
    return m;
  }, [lines]);

  const placeOrder = async () => {
    if (!claim) return;
    if (!window.confirm("Place your order? You won't be able to change your selections afterwards.")) return;
    try {
      loaderStore.setLoading(true);
      const { order } = await createOrder(claim.guid, []);
      toast.success("Your order has been placed");
      await authStore.fetchUser();
      router.push(`/order-status?order=${order.guid}`);
    } catch (error) {
      errorLogger(error, "Couldn't place your order");
    } finally {
      loaderStore.setLoading(false);
    }
  };

  if (!claim) {
    return (
      <DashboardLayout>
        <div className="max-w-[1370px] mx-auto px-4 py-10" />
      </DashboardLayout>
    );
  }

  const address = claim.job_address?.replace(/\s*\n\s*/g, ", ").replace(/,\s*$/, "");

  return (
    <DashboardLayout>
      <div className="max-w-[1370px] mx-auto px-4 py-8">
        <Link href="/dashboard" className="text-sm underline text-gray-600">
          ← Back to dashboard
        </Link>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500">
              Claim {claim.job_number}
              {claim.company?.name ? ` · ${claim.company.name}` : ""}
            </p>
            <h1 className="text-2xl font-bold">{reviewing ? "Review your selections" : "Choose a room"}</h1>
            {address && <p className="text-gray-600">{address}</p>}
          </div>
          {!claim.ordered && lines.length > 0 && !reviewing && (
            <Link
              href={`/claim?job=${claim.guid}&review=1`}
              className="rounded-md bg-[#31B75C] text-white px-5 py-3 font-semibold hover:bg-[#3d9d5b]"
            >
              Review & place order ({lines.length})
            </Link>
          )}
        </div>

        <div className="mt-6">
          <BudgetBar summary={claim.budget_summary} priceBand={claim.company?.price_band ?? null} />
        </div>

        {claim.ordered && (
          <div className="mt-6 rounded-[11px] bg-[#D1FADF] text-[#027A48] p-4">
            This claim has been ordered. You can see it under <Link href="/orders" className="underline">Orders</Link>.
          </div>
        )}

        {!reviewing ? (
          claim.rooms.length === 0 ? (
            <p className="mt-10 text-gray-600">No rooms have been set up on this claim yet. Please contact us.</p>
          ) : (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {claim.rooms.map((room) => {
                const done = room.items.filter((i) => i.selected > 0).length;
                return (
                  <Link
                    key={room.slug}
                    href={`/claim-room?job=${claim.guid}&room=${room.slug}`}
                    className="group rounded-[11px] bg-[#6D20C7]/10 hover:bg-[#6D20C7] p-6 duration-200"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-xl font-bold group-hover:text-white">
                        {room.name}
                        {room.quantity > 1 && <span className="font-normal"> × {room.quantity}</span>}
                      </h2>
                      <span className="text-xs font-semibold rounded-full bg-white px-3 py-1 text-[#6D20C7]">
                        {done}/{room.items.length} items
                      </span>
                    </div>
                    {room.notes && <p className="mt-2 text-sm text-gray-700 group-hover:text-white/90">{room.notes}</p>}
                    <div className="mt-4 h-2 rounded-full bg-white/70 overflow-hidden">
                      <div
                        className="h-full bg-[#31B75C]"
                        style={{ width: `${room.items.length ? Math.round((done / room.items.length) * 100) : 0}%` }}
                      />
                    </div>
                    <p className="mt-3 text-sm font-semibold group-hover:text-white">
                      {claim.ordered ? "View" : done ? "Continue →" : "Start →"}
                    </p>
                  </Link>
                );
              })}
            </div>
          )
        ) : (
          <div className="mt-8">
            {lines.length === 0 ? (
              <p className="text-gray-600">You haven&apos;t added anything yet.</p>
            ) : (
              Array.from(grouped.entries()).map(([slug, room]) => (
                <section key={slug} className="mb-8">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold">{room.name}</h2>
                    {!claim.ordered && (
                      <Link href={`/claim-room?job=${claim.guid}&room=${slug}`} className="text-sm underline">
                        Edit
                      </Link>
                    )}
                  </div>
                  {Array.from(room.items.entries()).map(([item, ls]) => (
                    <div key={item} className="mt-3 bg-white rounded-[11px] shadow-sm">
                      <p className="px-4 pt-3 text-sm font-semibold text-gray-500">{item}</p>
                      <ul>
                        {ls.map((l) => (
                          <li key={l.product.guid} className="flex items-center gap-4 px-4 py-3 border-t first:border-t-0">
                            <span className="font-semibold w-10 text-right">{l.quantity}×</span>
                            <span className="flex-1">
                              {l.product.name}
                              <span className="block text-xs text-gray-500">{l.product.sku}</span>
                            </span>
                            <span
                              className={`text-xs rounded-full px-2 py-0.5 ${
                                Number(l.product.in_budget) ? "bg-[#D1FADF] text-[#027A48]" : "bg-[#6D20C7] text-white"
                              }`}
                            >
                              {Number(l.product.in_budget) ? "Included" : "Extra cost"}
                            </span>
                            <span className="w-24 text-right font-semibold">
                              {gbp(Number(l.product.price ?? 0) * l.quantity)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </section>
              ))
            )}
            <div className="flex flex-wrap justify-between gap-4 mt-6">
              <Link href={`/claim?job=${claim.guid}`} className="rounded-md border-2 border-[#6D20C7] px-5 py-3 font-semibold">
                ← Back to rooms
              </Link>
              {!claim.ordered && lines.length > 0 && (
                <button
                  type="button"
                  onClick={placeOrder}
                  className="rounded-md bg-[#31B75C] text-white px-6 py-3 font-semibold hover:bg-[#3d9d5b]"
                >
                  Place order
                  {Number(claim.budget_summary?.customer_to_pay) > 0 &&
                    ` (you pay ${gbp(claim.budget_summary?.customer_to_pay)})`}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default withAuth(observer(ClaimPage));
