import Link from "next/link";
import { observer } from "mobx-react-lite";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";

import DashboardLayout from "@/components/DashboardLayout";
import PageHeader, { bannerButton } from "@/components/PageHeader";
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
        <div className="max-w-[1280px] mx-auto px-4 py-10" />
      </DashboardLayout>
    );
  }

  const address = claim.job_address?.replace(/\s*\n\s*/g, ", ").replace(/,\s*$/, "");

  return (
    <DashboardLayout>
      <div className="max-w-[1280px] mx-auto px-4 py-8">
        <PageHeader
          back={reviewing ? { href: `/claim?job=${claim.guid}`, label: "Back to rooms" } : { href: "/dashboard", label: "My claims" }}
          chips={[
            `Claim ${claim.job_number ?? ""}`,
            claim.company?.name,
            claim.company ? `Price band ${claim.company.price_band ?? "not set"}` : null,
            claim.ordered ? "Ordered" : null,
          ]}
          title={reviewing ? "Review your selections" : "Choose a room"}
          subtitle={address || undefined}
          actions={
            !claim.ordered && lines.length > 0 && !reviewing ? (
              <Link href={`/claim?job=${claim.guid}&review=1`} className={bannerButton}>
                Review & place order ({lines.length})
              </Link>
            ) : undefined
          }
        />

        {claim.ordered && (
          <div className="mb-6 rounded-xl bg-[#D1FADF] text-[#027A48] p-4">
            This claim has been ordered. You can see it under <Link href="/orders" className="underline">Orders</Link>.
          </div>
        )}

        {!reviewing ? (
          claim.rooms.length === 0 ? (
            <p className="text-gray-600">No rooms have been set up on this claim yet. Please contact us.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {claim.rooms.map((room) => {
                const done = room.items.filter((i) => i.selected > 0).length;
                return (
                  <Link
                    key={room.slug}
                    href={`/claim-room?job=${claim.guid}&room=${room.slug}`}
                    className="group rounded-xl bg-white shadow-sm ring-1 ring-transparent hover:ring-[#6D21C7] p-5 duration-150"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-xl font-bold">
                        {room.name}
                        {room.quantity > 1 && <span className="font-normal"> × {room.quantity}</span>}
                      </h2>
                      <span className="text-xs font-semibold rounded-full bg-[#6D21C7]/10 px-3 py-1 text-[#6D21C7]">
                        {done}/{room.items.length} items
                      </span>
                    </div>
                    {room.notes && <p className="mt-2 text-sm text-gray-700 ">{room.notes}</p>}
                    <div className="mt-4 h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full bg-[#31B75C]"
                        style={{ width: `${room.items.length ? Math.round((done / room.items.length) * 100) : 0}%` }}
                      />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-[#6D21C7]">
                      {claim.ordered ? "View" : done ? "Continue →" : "Start →"}
                    </p>
                  </Link>
                );
              })}
            </div>
          )
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-6">
              {lines.length === 0 ? (
                <div className="rounded-xl bg-white shadow-sm p-8 text-center text-gray-600">
                  You haven&apos;t added anything yet.{" "}
                  <Link href={`/claim?job=${claim.guid}`} className="underline">
                    Choose a room
                  </Link>{" "}
                  to get started.
                </div>
              ) : (
                Array.from(grouped.entries()).map(([slug, room]) => {
                  const count = Array.from(room.items.values()).reduce((n, ls) => n + ls.reduce((m, l) => m + l.quantity, 0), 0);
                  return (
                    <section key={slug} className="overflow-hidden rounded-xl bg-white shadow-sm">
                      <header className="flex flex-wrap items-center gap-3 border-b bg-[#F7F2FC] px-5 py-4">
                        <h2 className="text-lg font-bold text-[#4B1590]">{room.name}</h2>
                        <span className="rounded-full bg-white px-3 py-0.5 text-xs font-semibold text-[#6D21C7] ring-1 ring-[#E6D8F7]">
                          {count} item{count === 1 ? "" : "s"}
                        </span>
                        {!claim.ordered && (
                          <Link
                            href={`/claim-room?job=${claim.guid}&room=${slug}`}
                            className="ml-auto rounded-md border border-[#6D21C7] px-3 py-1.5 text-sm font-semibold text-[#6D21C7] hover:bg-[#6D21C7] hover:text-white"
                          >
                            Edit room
                          </Link>
                        )}
                      </header>
                      {Array.from(room.items.entries()).map(([item, ls]) => (
                        <div key={item} className="border-b last:border-b-0">
                          <p className="px-5 pt-4 text-xs font-semibold uppercase tracking-wide text-gray-500">{item}</p>
                          <ul className="px-3 pb-3">
                            {ls.map((l) => (
                              <li key={l.product.guid} className="flex items-center gap-4 rounded-lg px-2 py-2 hover:bg-[#F7F2FC]">
                                <Link
                                  href={`/product?guid=${l.product.guid}&job=${claim.guid}&room=${l.room}&item=${encodeURIComponent(l.item)}`}
                                  className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-[#F3ECFB] p-1 flex items-center justify-center"
                                  aria-hidden
                                  tabIndex={-1}
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={l.product.image || "/images/placeholder.jpg"}
                                    alt=""
                                    loading="lazy"
                                    className="block h-full w-full object-contain"
                                    onError={(e) => {
                                      const img = e.currentTarget;
                                      if (!img.src.endsWith("/images/placeholder.jpg")) img.src = "/images/placeholder.jpg";
                                    }}
                                  />
                                </Link>
                                <div className="min-w-0 flex-1">
                                  <Link
                                    href={`/product?guid=${l.product.guid}&job=${claim.guid}&room=${l.room}&item=${encodeURIComponent(l.item)}`}
                                    className="font-medium leading-snug hover:text-[#6D21C7]"
                                  >
                                    {l.product.name}
                                  </Link>
                                  <p className="mt-0.5 text-xs text-gray-500">
                                    {[l.product.supplier?.name, l.product.sku].filter(Boolean).join(" · ")}
                                  </p>
                                </div>
                                <span
                                  className={`hidden sm:inline text-[11px] font-semibold rounded-full px-2 py-0.5 ${
                                    Number(l.product.in_budget) ? "bg-[#D1FADF] text-[#027A48]" : "bg-[#6D21C7] text-white"
                                  }`}
                                >
                                  {Number(l.product.in_budget) ? "Included" : "Extra cost"}
                                </span>
                                <span className="grid h-9 min-w-[2.75rem] place-items-center rounded-full bg-[#6D21C7]/10 px-3 text-sm font-bold text-[#6D21C7]">
                                  ×{l.quantity}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </section>
                  );
                })
              )}
            </div>

            {/* Summary */}
            <aside className="lg:sticky lg:top-4 self-start">
              <div className="overflow-hidden rounded-xl bg-white shadow-sm">
                <div className="bg-gradient-to-br from-[#6D21C7] to-[#4B1590] px-5 py-4 text-white">
                  <p className="text-sm text-white/80">Order summary</p>
                  <p className="text-lg font-bold">Claim {claim.job_number}</p>
                </div>
                <dl className="divide-y px-5 text-sm">
                  <div className="flex justify-between py-3">
                    <dt className="text-gray-500">Rooms</dt>
                    <dd className="font-semibold">{grouped.size}</dd>
                  </div>
                  <div className="flex justify-between py-3">
                    <dt className="text-gray-500">Products</dt>
                    <dd className="font-semibold">{lines.length}</dd>
                  </div>
                  <div className="flex justify-between py-3">
                    <dt className="text-gray-500">Total quantity</dt>
                    <dd className="font-semibold">{lines.reduce((n, l) => n + l.quantity, 0)}</dd>
                  </div>
                  <div className="flex justify-between py-3">
                    <dt className="text-gray-500">Extra cost items</dt>
                    <dd className="font-semibold">{lines.filter((l) => !Number(l.product.in_budget)).length}</dd>
                  </div>
                </dl>
                <div className="space-y-3 p-5 pt-2">
                  {!claim.ordered && lines.length > 0 && (
                    <button
                      type="button"
                      onClick={placeOrder}
                      className="w-full rounded-md bg-[#31B75C] py-3 font-semibold text-white hover:bg-[#2a9e4f]"
                    >
                      Place order
                    </button>
                  )}
                  <Link
                    href={`/claim?job=${claim.guid}`}
                    className="block w-full rounded-md border border-gray-300 py-2.5 text-center text-sm font-semibold hover:border-[#6D21C7]"
                  >
                    Back to rooms
                  </Link>
                  {!claim.ordered && (
                    <p className="text-xs text-gray-500">
                      Once placed, your order goes to the team handling your claim and can&apos;t be changed here.
                    </p>
                  )}
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default withAuth(observer(ClaimPage));
