import Link from "next/link";
import { useState } from "react";

import { TItemProduct } from "@/types/api";

type Props = {
  product: TItemProduct;
  busy: boolean;
  disabled?: boolean;
  onChange: (quantity: number) => void;
};

/** Product tile for an item: add it, or change/remove the quantity once added. */
const SelectableProduct = ({ product, busy, disabled, onChange }: Props) => {
  const [imgOk, setImgOk] = useState(true);
  const qty = product.selected_quantity || 0;
  const selected = qty > 0;

  return (
    <div
      className={`relative flex flex-col rounded-xl overflow-hidden bg-white shadow-sm border-2 ${
        selected ? "border-[#6D20C7]" : "border-transparent"
      }`}
    >
      <div className="bg-[#F3ECFB] h-[170px] shrink-0 overflow-hidden flex items-center justify-center p-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgOk && product.image ? product.image : "/images/placeholder.jpg"}
          alt=""
          loading="lazy"
          onError={() => setImgOk(false)}
          className="block h-full w-full object-contain"
        />
      </div>

      <div className="px-3 pt-3 pb-2 flex flex-col gap-1 flex-1">
        <div className="flex flex-wrap gap-1 mb-1">
          <span
            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
              Number(product.in_budget) ? "bg-[#D1FADF] text-[#027A48]" : "bg-[#6D20C7] text-white"
            }`}
          >
            {Number(product.in_budget) ? "Included in budget" : "Extra cost"}
          </span>
          {selected && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#6D20C7] text-white">
              Added × {qty}
            </span>
          )}
        </div>
        <p className="text-sm font-semibold leading-snug break-words">{product.name}</p>
        <p className="text-xs text-gray-500">
          {[product.supplier?.name, product.sku].filter(Boolean).join(" · ")}
        </p>
        <Link
          href={`/product?guid=${product.guid}`}
          target="_blank"
          className="text-xs underline text-gray-600 w-fit mt-auto pt-1"
        >
          View details
        </Link>
      </div>

      <div className="px-3 pb-3">
        {!selected ? (
          <button
            type="button"
            disabled={busy || disabled}
            onClick={() => onChange(1)}
            className="w-full rounded-md bg-[#6D20C7] text-white py-2 font-semibold hover:bg-[#6D20C7]/80 disabled:opacity-50"
          >
            Add
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex items-center border rounded-md overflow-hidden" role="group" aria-label="Quantity">
              <button
                type="button"
                className="px-3 py-2 hover:bg-gray-100 disabled:opacity-50"
                disabled={busy || disabled}
                aria-label="Decrease quantity"
                onClick={() => onChange(qty - 1)}
              >
                −
              </button>
              <span className="px-3 font-semibold min-w-[2.5rem] text-center" aria-live="polite">
                {qty}
              </span>
              <button
                type="button"
                className="px-3 py-2 hover:bg-gray-100 disabled:opacity-50"
                disabled={busy || disabled}
                aria-label="Increase quantity"
                onClick={() => onChange(qty + 1)}
              >
                +
              </button>
            </div>
            <button
              type="button"
              disabled={busy || disabled}
              onClick={() => onChange(0)}
              className="ml-auto text-sm text-red-600 underline disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SelectableProduct;
