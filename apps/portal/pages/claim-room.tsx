import Link from "next/link";
import { observer } from "mobx-react-lite";
import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";

import DashboardLayout from "@/components/DashboardLayout";
import BudgetBar from "@/components/claim/BudgetBar";
import SelectableProduct from "@/components/claim/SelectableProduct";
import withAuth from "@/hoc/withAuth";
import { useStores } from "@/hooks/useStores";
import useDebounce from "@/hooks/useDebounce";
import { errorLogger } from "@/services/axiosService";
import { getClaimView, getItemProducts, setSelection } from "@/services/requestService";
import { TClaimView, TItemProduct } from "@/types/api";

const PER_PAGE = 24;

/** One room of a claim: work through its items, choosing products for each. */
const ClaimRoomPage = () => {
  const router = useRouter();
  const { loaderStore } = useStores();
  const jobGUID = typeof router.query.job === "string" ? router.query.job : "";
  const roomSlug = typeof router.query.room === "string" ? router.query.room : "";
  const itemParam = typeof router.query.item === "string" ? router.query.item : "";

  const [claim, setClaim] = useState<TClaimView | null>(null);
  const [products, setProducts] = useState<TItemProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const q = useDebounce(search, 350);

  const room = claim?.rooms.find((r) => r.slug === roomSlug);
  const items = room?.items ?? [];
  const current = items.find((i) => i.item === itemParam) ?? items[0];
  const currentIndex = current ? items.indexOf(current) : -1;
  const next = currentIndex >= 0 ? items[currentIndex + 1] : undefined;

  const loadClaim = useCallback(async () => {
    const c = await getClaimView(jobGUID);
    setClaim(c);
  }, [jobGUID]);

  useEffect(() => {
    if (!jobGUID) return;
    (async () => {
      try {
        loaderStore.setLoading(true);
        await loadClaim();
      } catch (error) {
        errorLogger(error, "Couldn't load your claim");
      } finally {
        loaderStore.setLoading(false);
      }
    })();
  }, [jobGUID, loadClaim, loaderStore]);

  useEffect(() => {
    setPage(1);
    setSearch("");
  }, [current?.item]);

  useEffect(() => setPage(1), [q]);

  useEffect(() => {
    if (!jobGUID || !roomSlug || !current) return;
    let live = true;
    (async () => {
      try {
        setLoadingProducts(true);
        const res = await getItemProducts(jobGUID, roomSlug, current.item, q.trim(), page, PER_PAGE);
        if (live) {
          setProducts(res.products);
          setTotal(res.total);
        }
      } catch (error) {
        errorLogger(error, "Couldn't load products");
      } finally {
        if (live) setLoadingProducts(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [jobGUID, roomSlug, current?.item, q, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const goToItem = (item: string) =>
    router.push({ pathname: "/claim-room", query: { job: jobGUID, room: roomSlug, item } }, undefined, { shallow: true });

  const change = async (product: TItemProduct, quantity: number) => {
    if (!current || !claim) return;
    try {
      setBusyId(product.guid);
      const res = await setSelection(jobGUID, roomSlug, current.item, product.guid, quantity);
      setProducts((list) => list.map((p) => (p.guid === product.guid ? { ...p, selected_quantity: res.quantity } : p)));
      const delta = res.quantity - (product.selected_quantity || 0);
      setClaim({
        ...claim,
        budget_summary: res.budget_summary,
        rooms: claim.rooms.map((r) =>
          r.slug !== roomSlug
            ? r
            : { ...r, items: r.items.map((i) => (i.item === current.item ? { ...i, selected: Math.max(0, i.selected + delta) } : i)) }
        ),
      });
      if (quantity === 1 && !product.selected_quantity) toast.success(`Added to ${current.item}`);
    } catch (error) {
      errorLogger(error, "Couldn't update your selection");
    } finally {
      setBusyId(null);
    }
  };

  if (!claim) {
    return (
      <DashboardLayout>
        <div className="max-w-[1370px] mx-auto px-4 py-10" />
      </DashboardLayout>
    );
  }

  if (!room) {
    return (
      <DashboardLayout>
        <div className="max-w-[1370px] mx-auto px-4 py-10">
          <p>That room isn&apos;t part of this claim.</p>
          <Link href={`/claim?job=${jobGUID}`} className="underline">
            Back to your claim
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const doneCount = items.filter((i) => i.selected > 0).length;

  return (
    <DashboardLayout>
      <div className="max-w-[1370px] mx-auto px-4 py-8">
        <Link href={`/claim?job=${jobGUID}`} className="text-sm underline text-gray-600">
          ← All rooms
        </Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500">Claim {claim.job_number}</p>
            <h1 className="text-2xl font-bold">
              {room.name}
              {room.quantity > 1 && <span className="font-normal"> × {room.quantity}</span>}
            </h1>
            {room.notes && <p className="text-gray-600">{room.notes}</p>}
          </div>
          <p className="text-sm text-gray-600">
            {doneCount} of {items.length} items chosen
          </p>
        </div>

        <div className="mt-5">
          <BudgetBar summary={claim.budget_summary} />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* Items needed for this room */}
          <nav aria-label="Items for this room" className="lg:sticky lg:top-4 self-start">
            <p className="text-sm font-semibold text-gray-500 mb-2">What&apos;s needed</p>
            <ol className="bg-white rounded-[11px] shadow-sm overflow-hidden">
              {items.map((i, idx) => {
                const active = i.item === current?.item;
                return (
                  <li key={i.item}>
                    <button
                      type="button"
                      onClick={() => goToItem(i.item)}
                      aria-current={active ? "step" : undefined}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left border-t first:border-t-0 ${
                        active ? "bg-[#6D20C7] text-white" : "hover:bg-[#6D20C7]/10"
                      }`}
                    >
                      <span
                        className={`grid place-items-center w-6 h-6 rounded-full text-xs font-bold shrink-0 ${
                          i.selected > 0
                            ? "bg-[#31B75C] text-white"
                            : active
                              ? "bg-white text-[#6D20C7]"
                              : "bg-gray-200 text-gray-600"
                        }`}
                        aria-hidden
                      >
                        {i.selected > 0 ? "✓" : idx + 1}
                      </span>
                      <span className="flex-1">{i.item}</span>
                      {i.selected > 0 && <span className="text-xs opacity-80">{i.selected}</span>}
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          {/* Products for the current item */}
          <section aria-label={current?.item}>
            {current && (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl font-bold mr-auto">{current.item}</h2>
                  <input
                    className="rounded-md border border-gray-300 px-4 py-2 w-full sm:w-72"
                    placeholder={`Search ${current.item.toLowerCase()}…`}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label={`Search ${current.item}`}
                  />
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {total.toLocaleString("en-GB")} products · items included in your budget are shown first
                </p>

                <div
                  className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
                  style={{ opacity: loadingProducts ? 0.6 : 1 }}
                >
                  {products.map((p) => (
                    <SelectableProduct
                      key={p.guid}
                      product={p}
                      busy={busyId === p.guid}
                      disabled={claim.ordered}
                      onChange={(qty) => change(p, qty)}
                    />
                  ))}
                </div>
                {!loadingProducts && products.length === 0 && (
                  <p className="mt-6 text-gray-600">No products match that search.</p>
                )}

                {total > PER_PAGE && (
                  <div className="flex items-center justify-center gap-4 mt-6">
                    <button
                      type="button"
                      className="rounded-md border px-4 py-2 disabled:opacity-40"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Previous
                    </button>
                    <span className="text-sm">
                      Page {page} of {Math.ceil(total / PER_PAGE)}
                    </span>
                    <button
                      type="button"
                      className="rounded-md border px-4 py-2 disabled:opacity-40"
                      disabled={page >= Math.ceil(total / PER_PAGE)}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap justify-between gap-3 mt-8 border-t pt-6">
                  <Link href={`/claim?job=${jobGUID}`} className="rounded-md border-2 border-[#6D20C7] px-5 py-3 font-semibold">
                    Back to rooms
                  </Link>
                  {next ? (
                    <button
                      type="button"
                      onClick={() => {
                        goToItem(next.item);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="rounded-md bg-[#6D20C7] text-white px-5 py-3 font-semibold hover:bg-[#6D20C7]/80"
                    >
                      {current.selected > 0 ? "Next item" : "Skip"}: {next.item} →
                    </button>
                  ) : (
                    <Link
                      href={`/claim?job=${jobGUID}`}
                      className="rounded-md bg-[#31B75C] text-white px-5 py-3 font-semibold hover:bg-[#3d9d5b]"
                    >
                      Finished this room →
                    </Link>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default withAuth(observer(ClaimRoomPage));
