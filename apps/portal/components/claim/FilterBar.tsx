import { useEffect, useRef, useState } from "react";

import { TFilterSelection, TItemFilter } from "@/types/api";

type Props = {
  filters: TItemFilter[];
  selected: TFilterSelection;
  onChange: (next: TFilterSelection) => void;
};

/** Filters for the current item (e.g. Colour, Finish, Style) — each opens a tick list. */
const FilterBar = ({ filters, selected, onChange }: Props) => {
  const [open, setOpen] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!filters.length) return null;

  const toggle = (key: string, value: string) => {
    const cur = selected[key] ?? [];
    const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
    onChange({ ...selected, [key]: next });
  };

  const chips = Object.entries(selected).flatMap(([k, vs]) => vs.map((v) => ({ k, v })));

  return (
    <div ref={wrapRef} className="mt-3">
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => {
          const count = selected[f.key]?.length ?? 0;
          const isOpen = open === f.key;
          return (
            <div key={f.key} className="relative">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : f.key)}
                className={`rounded-full border px-4 py-1.5 text-sm ${
                  count ? "border-[#6D20C7] bg-[#6D20C7] text-white" : "border-gray-300 bg-white hover:border-[#6D20C7]"
                }`}
              >
                {f.key}
                {count > 0 && ` (${count})`} <span aria-hidden>▾</span>
              </button>
              {isOpen && (
                <div className="absolute z-30 mt-1 w-64 max-h-80 overflow-auto rounded-md border bg-white shadow-lg p-2">
                  {f.values.map((v) => {
                    const on = selected[f.key]?.includes(v.value) ?? false;
                    return (
                      <label key={v.value} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#6D20C7]/10 cursor-pointer text-sm">
                        <input type="checkbox" checked={on} onChange={() => toggle(f.key, v.value)} />
                        <span className="flex-1">{v.value}</span>
                        <span className="text-xs text-gray-500">{v.count}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mt-2">
          {chips.map(({ k, v }) => (
            <button
              key={`${k}:${v}`}
              type="button"
              onClick={() => toggle(k, v)}
              className="rounded-full bg-[#6D20C7]/10 text-[#6D20C7] px-3 py-1 text-xs"
              aria-label={`Remove filter ${k}: ${v}`}
            >
              {k}: {v} ✕
            </button>
          ))}
          <button type="button" onClick={() => onChange({})} className="text-xs underline text-gray-600">
            Clear all
          </button>
        </div>
      )}
    </div>
  );
};

export default FilterBar;
