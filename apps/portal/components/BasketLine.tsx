import Image from "next/image";
import { useState } from "react";

import { Icon } from "./Icon";
import { TBasketLine } from "@/types/api";
import { BASE64_PLACEHOLDER } from "@/utils/const";

type BasketLineProps = {
  basketLine: TBasketLine;
  onRemoveBasketLine: (guid: string) => void;
};

const BasketLine = ({ basketLine, onRemoveBasketLine }: BasketLineProps) => {
  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
    setImageError(true);
  };

  const imageUrl = imageError
    ? "/images/placeholder.jpg"
    : basketLine?.product?.image || "/images/placeholder.jpg";

  return (
    <div className="bg-[#EDEDED] flex w-full relative">
      <div className="relative h-[250px] w-[250px]">
        <Image
          src={imageUrl}
          alt={basketLine?.product?.name || "Product"}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          quality={90}
          placeholder="blur"
          blurDataURL={BASE64_PLACEHOLDER}
          onError={handleImageError}
          priority={false}
          loading="lazy"
        />

        <div className="absolute top-3 left-3 z-10">
          <span
            className={`text-sm font-semibold px-3 py-1 rounded-full shadow ${
              basketLine?.product?.in_budget
                ? "bg-[#D1FADF] text-[#027A48]" // Included
                : "bg-[#E5D1FA] text-[#6941C6]" // Extra Cost
            }`}
          >
            {basketLine?.product?.in_budget
              ? "Included in Budget"
              : "Extra Cost"}
          </span>
        </div>
      </div>

      <div className="py-8 px-10">
        <h2 className="text-2xl font-bold">
          {basketLine?.product?.name || "Basket product"}
        </h2>

        <p className="mt-5 text-lg">
          <b>Code</b> {basketLine?.product?.sku}
        </p>
      </div>

      <button
        onClick={() => onRemoveBasketLine(basketLine.guid)}
        className="absolute top-0 right-0 h-12 w-12 grid place-content-center bg-[#6D21C7]"
      >
        <Icon src="/icons/x-mark.svg" size={34} alt="x-mark icon" />
      </button>
    </div>
  );
};

export default BasketLine;
