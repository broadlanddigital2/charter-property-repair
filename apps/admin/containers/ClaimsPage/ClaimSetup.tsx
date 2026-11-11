import clsx from "clsx";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

import { ROOMS } from "@/components/RoomBadges";
import { errorLogger } from "@/services/axiosService";
import { setClaim } from "@/services/requestService";
import { TClaim, TClaimRoom } from "@/types/api";

type Props = {
  claim: TClaim;
  onSaved: (claim: TClaim) => void;
  onClose: () => void;
};

/** Set up a claim: its budget and the rooms being done (with quantities and notes). */
const ClaimSetup = ({ claim, onSaved, onClose }: Props) => {
  const [budget, setBudget] = useState<string>("");
  const [rooms, setRooms] = useState<TClaimRoom[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setBudget(claim.budget === null || claim.budget === undefined ? "" : String(claim.budget));
    setRooms(claim.rooms.map((r) => ({ slug: r.slug, quantity: r.quantity, notes: r.notes })));
  }, [claim]);

  const roomOf = (slug: string) => rooms.find((r) => r.slug === slug);

  const toggle = (slug: string) =>
    setRooms((list) =>
      list.some((r) => r.slug === slug)
        ? list.filter((r) => r.slug !== slug)
        : [...list, { slug, quantity: 1, notes: null }]
    );

  const patch = (slug: string, change: Partial<TClaimRoom>) =>
    setRooms((list) => list.map((r) => (r.slug === slug ? { ...r, ...change } : r)));

  const save = async () => {
    const value = budget.trim() === "" ? null : Math.round(Number(budget));
    if (value !== null && (!Number.isFinite(value) || value < 0)) {
      toast.error("Budget must be a positive number of pounds");
      return;
    }
    try {
      setSaving(true);
      const ordered = ROOMS.map((r) => roomOf(r.slug)).filter(Boolean) as TClaimRoom[];
      const res = await setClaim(claim.guid, value, ordered);
      onSaved({ ...claim, budget: res.budget, rooms: res.rooms });
      toast.success(`Claim ${claim.job_number ?? ""} saved`);
    } catch (error) {
      errorLogger(error, "Failed to save the claim");
    } finally {
      setSaving(false);
    }
  };

  const selectedCount = rooms.reduce((n, r) => n + r.quantity, 0);

  return (
    <div className="card border-0 shadow-sm mb-4">
      <div className="card-header bg-body d-flex flex-wrap align-items-center gap-2">
        <span className="fs-5 fw-semibold">Claim {claim.job_number ?? "—"}</span>
        {claim.status && <span className="badge text-bg-light">{claim.status}</span>}
        {claim.orders > 0 && (
          <span className="badge text-bg-warning">
            {claim.orders} order{claim.orders === 1 ? "" : "s"} placed
          </span>
        )}
        <button type="button" className="btn-close ms-auto" aria-label="Close" onClick={onClose} />
      </div>
      <div className="card-body">
        <div className="row g-3 mb-4 small">
          <div className="col-md-5">
            <div className="text-body-secondary">Customer</div>
            <div className="fw-semibold">{claim.company?.name}</div>
          </div>
          <div className="col-md-7">
            <div className="text-body-secondary">Property</div>
            <div>{claim.job_address?.trim() || "—"}</div>
          </div>
        </div>

        <div className="row g-4">
          <div className="col-md-4 col-lg-3">
            <label className="form-label fw-semibold small mb-1" htmlFor="claim-budget">
              Budget
            </label>
            <div className="input-group">
              <span className="input-group-text">£</span>
              <input
                id="claim-budget"
                className="form-control"
                inputMode="numeric"
                placeholder="Not set"
                value={budget}
                onChange={(e) => setBudget(e.target.value.replace(/[^0-9.]/g, ""))}
              />
            </div>
            <div className="form-text">What the insurer covers for in-budget products.</div>
          </div>

          <div className="col-md-8 col-lg-9">
            <div className="d-flex align-items-center gap-2 mb-1">
              <span className="form-label fw-semibold small mb-0">Rooms being done</span>
              <span className="badge text-bg-light">{selectedCount}</span>
            </div>
            <div className="d-flex flex-wrap gap-2">
              {ROOMS.map((room) => {
                const on = !!roomOf(room.slug);
                return (
                  <button
                    key={room.slug}
                    type="button"
                    aria-pressed={on}
                    className={clsx("btn btn-sm rounded-pill", on ? "btn-info text-white" : "btn-outline-secondary")}
                    onClick={() => toggle(room.slug)}
                  >
                    {room.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {rooms.length > 0 && (
          <div className="table-responsive mt-3">
            <table className="table table-sm align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Room</th>
                  <th style={{ width: 120 }}>How many</th>
                  <th>Notes (optional)</th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {ROOMS.filter((r) => roomOf(r.slug)).map((room) => {
                  const r = roomOf(room.slug)!;
                  return (
                    <tr key={room.slug}>
                      <td className="fw-medium">{room.name}</td>
                      <td>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          className="form-control form-control-sm"
                          value={r.quantity}
                          onChange={(e) =>
                            patch(room.slug, { quantity: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })
                          }
                        />
                      </td>
                      <td>
                        <input
                          className="form-control form-control-sm"
                          placeholder="e.g. flood damage to flooring and skirting"
                          value={r.notes ?? ""}
                          onChange={(e) => patch(room.slug, { notes: e.target.value })}
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn-close btn-sm"
                          aria-label={`Remove ${room.name}`}
                          onClick={() => toggle(room.slug)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="card-footer bg-body d-flex justify-content-end gap-2">
        <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary" disabled={saving} onClick={save}>
          {saving ? "Saving…" : "Save claim"}
        </button>
      </div>
    </div>
  );
};

export default ClaimSetup;
