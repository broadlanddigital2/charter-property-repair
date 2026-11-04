import { KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { CFormLabel } from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilSearch, cilX } from "@coreui/icons";

export type TSearchOption = { label: string; value: string; hint?: string };

type Props = {
  label?: string;
  options: TSearchOption[];
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  /** Max results shown while typing (long lists stay fast). */
  limit?: number;
};

/** Type-to-search select for long lists (e.g. 5,000+ companies). */
const SearchSelect = ({ label, options, value, placeholder = "Search…", onChange, limit = 50 }: Props) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? options.filter((o) => o.label.toLowerCase().includes(q) || o.hint?.toLowerCase().includes(q))
      : options;
    // names starting with the query first
    if (q) list.sort((a, b) => Number(!a.label.toLowerCase().startsWith(q)) - Number(!b.label.toLowerCase().startsWith(q)));
    return list.slice(0, limit);
  }, [options, query, limit]);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  useEffect(() => {
    listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const pick = (o: TSearchOption) => {
    onChange(o.value);
    setOpen(false);
    setQuery("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      // don't submit the surrounding form
      e.preventDefault();
      if (open && matches[active]) pick(matches[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  };

  return (
    <div ref={wrapRef} className="mt-3 position-relative">
      {label && <CFormLabel className="fw-semibold small mb-1">{label}</CFormLabel>}
      <div className="input-group">
        <span className="input-group-text bg-body">
          <CIcon icon={cilSearch} />
        </span>
        <input
          className="form-control"
          role="combobox"
          aria-expanded={open}
          placeholder={selected ? selected.label : placeholder}
          value={open ? query : selected?.label ?? ""}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
        />
        {selected && (
          <button
            type="button"
            className="btn btn-outline-secondary"
            title="Clear"
            onClick={() => {
              onChange("");
              setQuery("");
            }}
          >
            <CIcon icon={cilX} />
          </button>
        )}
      </div>

      {open && (
        <div
          ref={listRef}
          className="list-group position-absolute w-100 shadow mt-1"
          style={{ zIndex: 1050, maxHeight: 300, overflowY: "auto" }}
          role="listbox"
        >
          {matches.length === 0 ? (
            <div className="list-group-item small text-body-secondary">No matches</div>
          ) : (
            matches.map((o, i) => (
              <button
                type="button"
                key={o.value}
                role="option"
                aria-selected={o.value === value}
                className={`list-group-item list-group-item-action py-2 ${i === active ? "active" : ""}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(o)}
              >
                <div className="fw-semibold">{o.label}</div>
                {o.hint && <div className={`small ${i === active ? "" : "text-body-secondary"}`}>{o.hint}</div>}
              </button>
            ))
          )}
          {!query && options.length > limit && (
            <div className="list-group-item small text-body-secondary">
              Showing {limit} of {options.length.toLocaleString("en-GB")} — type to search
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchSelect;
