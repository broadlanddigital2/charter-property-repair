import clsx from "clsx";
import { observer } from "mobx-react-lite";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

import DashboardLayout from "@/components/DashboardLayout";
import Pagination from "@/components/Pagination";
import RoomBadges from "@/components/RoomBadges";
import withAuth from "@/hoc/withAuth";
import useDebounce from "@/hooks/useDebounce";
import { errorLogger } from "@/services/axiosService";
import { getClaimsPage, TClaimFilter } from "@/services/requestService";
import { TClaim } from "@/types/api";
import ClaimSetup from "./ClaimSetup";

const PER_PAGE = 20;

const FILTERS: { value: TClaimFilter; label: string }[] = [
  { value: "setup", label: "Needs set-up" },
  { value: "open", label: "Open" },
  { value: "ordered", label: "Ordered" },
  { value: "all", label: "All" },
];

/** Claims (ServiceM8 jobs): set the budget and the rooms being done. */
const ClaimsPage = () => {
  const router = useRouter();
  const [claims, setClaims] = useState<TClaim[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<TClaimFilter>("setup");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TClaim | null>(null);
  const q = useDebounce(search, 350);

  useEffect(() => setPage(1), [q, filter]);

  // /claims?q=10544 deep link
  useEffect(() => {
    if (router.isReady && typeof router.query.q === "string") {
      setSearch(router.query.q);
      setFilter("all");
    }
  }, [router.isReady, router.query.q]);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        setLoading(true);
        const res = await getClaimsPage({ search: q.trim(), filter, page, perPage: PER_PAGE });
        if (live) {
          setClaims(res.claims);
          setTotal(res.total);
        }
      } catch (error) {
        errorLogger(error, "Failed to load claims");
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [q, filter, page]);

  const open = (claim: TClaim) => {
    setSelected(claim);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <DashboardLayout>
      <>
        {selected && (
          <ClaimSetup
            key={selected.guid}
            claim={selected}
            onClose={() => setSelected(null)}
            onSaved={(saved) => {
              setSelected(saved);
              setClaims((list) => list.map((c) => (c.guid === saved.guid ? saved : c)));
            }}
          />
        )}

        <div className="card border-0 shadow-sm">
          <div className="card-header bg-body d-flex flex-wrap align-items-center gap-2">
            <span className="fw-semibold me-2">Claims</span>
            <div className="btn-group btn-group-sm" role="group" aria-label="Filter claims">
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  className={clsx("btn", filter === f.value ? "btn-primary" : "btn-outline-secondary")}
                  onClick={() => setFilter(f.value)}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <input
              className="form-control form-control-sm ms-auto"
              style={{ maxWidth: 300 }}
              placeholder="Job number, customer or address…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <span className="small text-body-secondary">{total.toLocaleString("en-GB")}</span>
          </div>

          {!loading && claims.length === 0 ? (
            <div className="card-body text-body-secondary small">
              {filter === "setup" && !q ? "Every open claim has its budget and rooms set." : "No claims found."}
            </div>
          ) : (
            <div className="table-responsive" style={{ opacity: loading ? 0.6 : 1 }}>
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Job</th>
                    <th>Customer / property</th>
                    <th className="text-end">Budget</th>
                    <th>Rooms</th>
                    <th>Status</th>
                    <th style={{ width: 90 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {claims.map((c) => (
                    <tr
                      key={c.guid}
                      style={{ cursor: "pointer" }}
                      className={clsx(selected?.guid === c.guid && "table-active")}
                      onClick={() => open(c)}
                    >
                      <td className="fw-semibold text-nowrap">{c.job_number ?? "—"}</td>
                      <td style={{ maxWidth: 380 }}>
                        <div className="text-truncate">{c.company?.name}</div>
                        <div className="small text-body-secondary text-truncate">
                          {c.job_address?.replace(/\s*\n\s*/g, ", ").replace(/,\s*$/, "") || "—"}
                        </div>
                      </td>
                      <td className="text-end text-nowrap">
                        {c.budget === null ? (
                          <span className="badge text-bg-warning">Not set</span>
                        ) : (
                          `£${c.budget.toLocaleString("en-GB")}`
                        )}
                      </td>
                      <td style={{ maxWidth: 260 }}>
                        {c.rooms.length ? (
                          <RoomBadges rooms={c.rooms.map((r) => ({ slug: r.slug, name: r.name ?? r.slug }))} max={3} />
                        ) : (
                          <span className="badge text-bg-warning">No rooms</span>
                        )}
                      </td>
                      <td className="small text-nowrap">
                        {c.status ?? "—"}
                        {c.orders > 0 && <div className="text-body-secondary">{c.orders} ordered</div>}
                      </td>
                      <td className="text-end">
                        <button type="button" className="btn btn-sm btn-outline-primary">
                          Set up
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {total > PER_PAGE && (
            <div className="card-footer bg-body">
              <Pagination currentPage={page} totalPages={Math.ceil(total / PER_PAGE)} onPageChange={setPage} />
            </div>
          )}
        </div>
      </>
    </DashboardLayout>
  );
};

export default withAuth(observer(ClaimsPage));
