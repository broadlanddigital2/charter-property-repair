import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";

import useDebounce from "@/hooks/useDebounce";
import { errorLogger } from "@/services/axiosService";
import { claimAddUser, claimRemoveUser, searchContacts } from "@/services/requestService";
import { TClaimUser } from "@/types/api";

type Props = {
  claimGUID: string;
  users: TClaimUser[];
  onChange: (users: TClaimUser[]) => void;
};

/**
 * The people who will use this claim in the portal. Search existing users or
 * add a new one — new users are saved in Users (under the claim's customer).
 */
const ClaimUsers = ({ claimGUID, users, onChange }: Props) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TClaimUser[]>([]);
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", mobile: "" });
  const [busy, setBusy] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const q = useDebounce(query, 300);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    let live = true;
    searchContacts(q.trim())
      .then((r) => live && setResults(r))
      .catch((e) => errorLogger(e, "Search failed"));
    return () => {
      live = false;
    };
  }, [q]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const run = async (fn: () => Promise<TClaimUser[]>, ok: string) => {
    try {
      setBusy(true);
      onChange(await fn());
      toast.success(ok);
      return true;
    } catch (error) {
      errorLogger(error, "Couldn't update the claim's users");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const pick = async (u: TClaimUser) => {
    setOpen(false);
    setQuery("");
    await run(() => claimAddUser(claimGUID, { contactGUID: u.guid }), `${u.name} added to the claim`);
  };

  const create = async () => {
    const ok = await run(
      () => claimAddUser(claimGUID, { name: form.name, email: form.email, mobile: form.mobile }),
      `${form.name} added to the claim and saved in Users`
    );
    if (ok) {
      setForm({ name: "", email: "", mobile: "" });
      setAdding(false);
    }
  };

  const startNew = () => {
    const looksLikeEmail = query.includes("@");
    setForm({ name: looksLikeEmail ? "" : query.trim(), email: looksLikeEmail ? query.trim() : "", mobile: "" });
    setAdding(true);
    setOpen(false);
  };

  return (
    <div>
      <div className="d-flex align-items-center gap-2 mb-2">
        <span className="form-label fw-semibold small mb-0">Claim users</span>
        <span className="badge text-bg-light">{users.length}</span>
        <span className="small text-body-secondary">People who will choose products for this claim</span>
      </div>

      {users.length > 0 && (
        <ul className="list-group mb-3">
          {users.map((u) => (
            <li key={u.guid} className="list-group-item d-flex align-items-center gap-3">
              <div className="flex-grow-1 min-w-0">
                <div className="fw-semibold text-truncate">{u.name}</div>
                <div className="small text-body-secondary text-truncate">
                  {[u.email, u.mobile].filter(Boolean).join(" · ")}
                </div>
              </div>
              {u.invited_at ? (
                <span className="badge text-bg-success" title={new Date(u.invited_at).toLocaleString("en-GB")}>
                  Email sent
                </span>
              ) : (
                <span className="badge text-bg-light">Not invited yet</span>
              )}
              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                disabled={busy}
                onClick={() => run(() => claimRemoveUser(claimGUID, u.guid), `${u.name} removed from the claim`)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {!adding ? (
        <div ref={wrapRef} className="position-relative" style={{ maxWidth: 520 }}>
          <div className="input-group">
            <input
              className="form-control"
              placeholder="Search users by name, email or phone…"
              value={query}
              onFocus={() => setOpen(true)}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") setOpen(false);
                if (e.key === "Enter") e.preventDefault();
              }}
            />
            <button type="button" className="btn btn-outline-primary" onClick={startNew}>
              + New user
            </button>
          </div>
          {open && query.trim().length >= 2 && (
            <div className="list-group position-absolute w-100 shadow mt-1" style={{ zIndex: 1050, maxHeight: 300, overflowY: "auto" }}>
              {results
                .filter((r) => !users.some((u) => u.guid === r.guid))
                .map((r) => (
                  <button key={r.guid} type="button" className="list-group-item list-group-item-action" onClick={() => pick(r)}>
                    <div className="fw-semibold">{r.name}</div>
                    <div className="small text-body-secondary">
                      {[r.email, r.company_name, r.type].filter(Boolean).join(" · ")}
                    </div>
                  </button>
                ))}
              <button type="button" className="list-group-item list-group-item-action text-primary" onClick={startNew}>
                + Add “{query.trim()}” as a new user
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="border rounded-3 p-3" style={{ maxWidth: 720 }}>
          <div className="fw-semibold small mb-2">New claim user</div>
          <div className="row g-2">
            <div className="col-md-4">
              <input
                className="form-control"
                placeholder="Full name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="col-md-4">
              <input
                className="form-control"
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="col-md-4">
              <input
                className="form-control"
                type="tel"
                placeholder="Mobile (optional)"
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
              />
            </div>
          </div>
          <div className="d-flex justify-content-end gap-2 mt-2">
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setAdding(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              disabled={busy || !form.name.trim() || !form.email.trim()}
              onClick={create}
            >
              Add user
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClaimUsers;
