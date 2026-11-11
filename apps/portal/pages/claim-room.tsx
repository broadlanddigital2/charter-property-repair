import Link from "next/link";
import { observer } from "mobx-react-lite";
import { useRouter } from "next/router";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";

import DashboardLayout from "@/components/DashboardLayout";
import PageHeader from "@/components/PageHeader";
import SelectableProduct from "@/components/claim/SelectableProduct";
import FilterBar from "@/components/claim/FilterBar";
import withAuth from "@/hoc/withAuth";
import { useStores } from "@/hooks/useStores";
import useDebounce from "@/hooks/useDebounce";
import { errorLogger } from "@/services/axiosService";
import { getClaimView, getItemFilters, getItemProducts, setSelection } from "@/services/requestService";
import { TClaimView, TFilterSelection, TItemFilter, TItemProduct } from "@/types/api";

const PER_PAGE = 24; // products per lazy-loaded block

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
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [filters, setFilters] = useState<TItemFilter[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<TFilterSelection>({});
  const filterKey = JSON.stringify(selectedFilters);

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
    setSelectedFilters({});
    setFilters([]);
    if (!jobGUID || !roomSlug || !current) return;
    getItemFilters(jobGUID, roomSlug, current.item)
      .then(setFilters)
      .catch((e) => errorLogger(e, "Couldn't load filters"));
  }, [current?.item]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => setPage(1), [q, filterKey]);

  useEffect(() => {
    if (!jobGUID || !roomSlug || !current) return;
    let live = true;
    (async () => {
      try {
        setLoadingProducts(true);
        const res = await getItemProducts(jobGUID, roomSlug, current.item, q.trim(), page, PER_PAGE, selectedFilters);
        if (live) {
          // page 1 replaces the list; later pages append (lazy loading as you scroll)
          setProducts((prev) => (page === 1 ? res.products : [...prev, ...res.products.filter((p) => !prev.some((x) => x.guid === p.guid))]));
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
  }, [jobGUID, roomSlug, current?.item, q, page, filterKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // load the next block of products when the user scrolls near the end of the grid
  const hasMore = products.length < total;
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || loadingProducts) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setPage((p) => p + 1);
      },
      { rootMargin: "600px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loadingProducts, products.length]);

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
        <div className="max-w-[1280px] mx-auto px-4 py-10" />
      </DashboardLayout>
    );
  }

  if (!room) {
    return (
      <DashboardLayout>
        <div className="max-w-[1280px] mx-auto px-4 py-10">
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
      <div className="max-w-[1280px] mx-auto px-4 py-8">
        <PageHeader
          back={{ href: `/claim?job=${jobGUID}`, label: "All rooms" }}
          eyebrow={
            <>
              Claim {claim.job_number}
              {claim.company ? ` · Price band ${claim.company.price_band ?? "not set"}` : ""}
            </>
          }
          title={room.quantity > 1 ? `${room.name} × ${room.quantity}` : room.name}
          subtitle={room.notes ?? undefined}
          actions={<span className="text-sm text-gray-600">{doneCount} of {items.length} items chosen</span>}
        />

        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          {/* Items needed for this room */}
          <nav
            aria-label="Items for this room"
            className="self-start lg:sticky lg:top-4 lg:flex lg:flex-col lg:max-h-[calc(100dvh-2rem)]"
          >
            <p className="text-sm font-semibold text-gray-500 mb-2">What&apos;s needed</p>
            <ol className="bg-white rounded-xl shadow-sm overflow-hidden lg:overflow-y-auto lg:overscroll-contain lg:min-h-0">
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
                <FilterBar filters={filters} selected={selectedFilters} onChange={setSelectedFilters} />
                <p className="text-sm text-gray-500 mt-2">
                  {total.toLocaleString("en-GB")} products · items included in your budget are shown first
                </p>

                <div
                  className="mt-4 grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
                  style={{ opacity: loadingProducts && page === 1 ? 0.6 : 1 }}
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
                  <p className="mt-6 text-gray-600">No products match — try removing a filter or changing your search.</p>
                )}

                <div ref={sentinelRef} aria-hidden className="h-1" />
                {loadingProducts && page > 1 && (
                  <p className="mt-4 text-center text-sm text-gray-500">Loading more…</p>
                )}
                {!hasMore && products.length > PER_PAGE && (
                  <p className="mt-4 text-center text-sm text-gray-500">That&apos;s everything for {current.item.toLowerCase()}.</p>
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
