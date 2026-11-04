import clsx from "clsx";
import Link from "next/link";
import { observer } from "mobx-react-lite";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";

import DashboardLayout from "@/components/DashboardLayout";
import { ROOMS } from "@/components/RoomBadges";
import withAuth from "@/hoc/withAuth";
import { useStores } from "@/hooks/useStores";
import { errorLogger } from "@/services/axiosService";
import { getRoomRules, getRooms, updateRoomRule } from "@/services/requestService";
import { TRoom, TRoomRule } from "@/types/api";

const ORIGIN_BADGE: Record<TRoomRule["origin"], string> = {
  sheet: "text-bg-light",
  suggested: "text-bg-warning",
  manual: "text-bg-secondary",
};

/**
 * Rooms overview + the room rules matrix (the ROOM_LIST_FOR_MATERIALS sheet).
 * Each rule row maps a supplier + category (and optional keyword) to rooms;
 * ticking a box re-assigns rooms for every matching product straight away.
 */
const RoomsPage = () => {
  const { loaderStore } = useStores();
  const [rooms, setRooms] = useState<TRoom[]>([]);
  const [rules, setRules] = useState<TRoomRule[]>([]);
  const [supplier, setSupplier] = useState("");
  const [origin, setOrigin] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const [r, rr] = await Promise.all([getRooms(), getRoomRules()]);
    setRooms(r);
    setRules(rr);
  };

  useEffect(() => {
    (async () => {
      try {
        loaderStore.setLoading(true);
        await load();
      } catch (error) {
        errorLogger(error, "Failed to load rooms");
      } finally {
        loaderStore.setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const suppliers = useMemo(() => Array.from(new Set(rules.map((r) => r.supplier))).sort(), [rules]);

  const visible = rules.filter(
    (r) =>
      (!supplier || r.supplier === supplier) &&
      (!origin || r.origin === origin) &&
      (!query ||
        `${r.category ?? ""} ${r.note ?? ""} ${r.name_pattern ?? ""}`.toLowerCase().includes(query.toLowerCase()))
  );

  const patchRule = async (rule: TRoomRule, patch: Partial<TRoomRule>) => {
    try {
      setBusy(rule.id);
      const saved = await updateRoomRule(rule.id, patch);
      setRules((list) => list.map((r) => (r.id === rule.id ? saved : r)));
      setRooms(await getRooms());
      toast.success("Rule updated — products re-assigned");
    } catch (error) {
      errorLogger(error, "Failed to update rule");
    } finally {
      setBusy(null);
    }
  };

  const toggleRoom = (rule: TRoomRule, slug: string) => {
    const next = rule.rooms.includes(slug) ? rule.rooms.filter((s) => s !== slug) : [...rule.rooms, slug];
    patchRule(rule, { rooms: ROOMS.map((r) => r.slug).filter((s) => next.includes(s)) });
  };

  const suggestedCount = rules.filter((r) => r.origin === "suggested").length;

  return (
    <DashboardLayout>
      <>
        <div className="row g-3 mb-4">
          {rooms.map((room) => (
            <div className="col-6 col-md-4 col-xl-2" key={room.slug}>
              <Link
                href={`/products?room=${room.slug}`}
                className="card border-0 shadow-sm h-100 text-decoration-none"
              >
                <div className="card-body py-3">
                  <div className="small text-body-secondary text-truncate">{room.name}</div>
                  <div className="fs-4 fw-semibold text-body">{room.products.toLocaleString("en-GB")}</div>
                  <div className="small text-body-tertiary">products</div>
                </div>
              </Link>
            </div>
          ))}
        </div>

        <div className="card border-0 shadow-sm">
          <div className="card-header bg-body">
            <div className="d-flex flex-wrap align-items-center gap-2">
              <span className="fw-semibold me-2">Room rules</span>
              <select
                className="form-select form-select-sm w-auto"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
              >
                <option value="">All suppliers</option>
                {suppliers.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <select
                className="form-select form-select-sm w-auto"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
              >
                <option value="">All sources</option>
                <option value="sheet">From room list</option>
                <option value="suggested">Suggested ({suggestedCount})</option>
                <option value="manual">Added manually</option>
              </select>
              <input
                className="form-control form-control-sm w-auto"
                placeholder="Filter categories…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <span className="ms-auto small text-body-secondary">{visible.length} rules</span>
            </div>
            <p className="small text-body-secondary mb-0 mt-2">
              Each product takes the highest-priority rule that matches its supplier, category and keyword.
              Products with rooms set by hand on the Products screen are not changed.
            </p>
          </div>
          <div className="table-responsive">
            <table className="table table-sm table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Supplier</th>
                  <th>Category / keyword</th>
                  {ROOMS.map((r) => (
                    <th key={r.slug} className="text-center small" style={{ width: 64 }} title={r.name}>
                      {r.short}
                    </th>
                  ))}
                  <th className="text-center small">On</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((rule) => (
                  <tr key={rule.id} className={clsx(!rule.active && "opacity-50")}>
                    <td className="small text-nowrap">{rule.supplier}</td>
                    <td style={{ minWidth: 220 }}>
                      <div className="fw-medium">{rule.category ?? "All categories"}</div>
                      <div className="small text-body-secondary d-flex flex-wrap gap-1 align-items-center">
                        {rule.name_pattern && (
                          <code className="small" title="Matched against product name and description">
                            {rule.name_pattern}
                          </code>
                        )}
                        <span className={clsx("badge", ORIGIN_BADGE[rule.origin])}>
                          {rule.origin === "sheet" ? "room list" : rule.origin}
                        </span>
                        {rule.priority !== 0 && <span className="badge text-bg-light">priority {rule.priority}</span>}
                        {rule.origin !== "sheet" && rule.note && <span>{rule.note}</span>}
                      </div>
                    </td>
                    {ROOMS.map((r) => (
                      <td key={r.slug} className="text-center">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          aria-label={`${rule.category ?? rule.supplier}: ${r.name}`}
                          checked={rule.rooms.includes(r.slug)}
                          disabled={busy === rule.id}
                          onChange={() => toggleRoom(rule, r.slug)}
                        />
                      </td>
                    ))}
                    <td className="text-center">
                      <div className="form-check form-switch d-inline-block mb-0">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          aria-label="Rule active"
                          checked={rule.active}
                          disabled={busy === rule.id}
                          onChange={() => patchRule(rule, { active: !rule.active })}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </>
    </DashboardLayout>
  );
};

export default withAuth(observer(RoomsPage));
