import Link from "next/link";
import { useEffect, useState } from "react";

import useCompare, { COMPARE_MAX } from "@/hooks/useCompare";
import { getAllProducts } from "@/services/requestService";
import { TProduct } from "@/types/api";

/** Sticky bar listing the products picked for comparison, with a link to compare them. */
const CompareBar = ({ compareHref }: { compareHref: string }) => {
  const { ids, remove, clear } = useCompare();
  const [products, setProducts] = useState<TProduct[]>([]);

  useEffect(() => {
    if (!ids.length) {
      setProducts([]);
      return;
    }
    let live = true;
    getAllProducts(ids)
      .then(({ products: p }) => live && setProducts(ids.map((id) => p.find((x) => x.guid === id)).filter(Boolean) as TProduct[]))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [ids]);

  if (!ids.length) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 backdrop-blur shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
      <div className="max-w-[1280px] mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold">
          Compare ({ids.length}/{COMPARE_MAX})
        </span>
        <div className="flex gap-3 overflow-x-auto py-1">
          {products.map((p) => (
            <div
              key={p.guid}
              className="flex shrink-0 items-center gap-2 rounded-lg border border-gray-200 bg-white py-1 pl-1 pr-1.5"
              title={p.name}
            >
              <div className="h-10 w-10 rounded-md bg-[#F3ECFB] p-0.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image || "/images/placeholder.jpg"} alt="" className="block h-full w-full object-contain" />
              </div>
              <span className="hidden md:block max-w-[9rem] truncate text-xs">{p.name}</span>
              <button
                type="button"
                onClick={() => remove(p.guid)}
                className="grid h-7 w-7 place-items-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                aria-label={`Remove ${p.name} from comparison`}
              >
                <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden>
                  <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={clear} className="text-sm underline text-gray-600">
          Clear
        </button>
        <Link
          href={compareHref}
          aria-disabled={ids.length < 2}
          className={`ml-auto rounded-md px-5 py-2.5 text-sm font-semibold text-white ${
            ids.length < 2 ? "bg-gray-400 pointer-events-none" : "bg-[#6D21C7] hover:bg-[#5a19a8]"
          }`}
        >
          {ids.length < 2 ? "Pick at least 2 to compare" : "Compare products →"}
        </Link>
      </div>
    </div>
  );
};

export default CompareBar;
