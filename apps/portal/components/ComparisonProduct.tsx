import Image from "next/image";
import { useState } from "react";

import { Icon } from "./Icon";
import { BASE64_PLACEHOLDER } from "@/utils/const";
import { TProduct, TProductDetails } from "@/types/api";

const PRODUCT_SUITABILITY = [
  {
    title: "Kitchens",
    icon: "/icons/Kitchens.svg",
  },
  {
    title: "Bathrooms",
    icon: "/icons/Bathrooms.svg",
  },
  {
    title: "Wet Areas",
    icon: "/icons/Wet Areas.svg",
  },
  {
    title: "Walls",
    icon: "/icons/Walls.svg",
  },
];

type ComparisonProductsProps = {
  isExpanded: boolean;
  hasMoreSpecs: boolean;
  product: TProduct;
  productData: TProductDetails | null;
  specs: string[];
  onRemoveFromComparison: (product: TProduct) => void;
  onAddToBasket: (product: TProduct) => void;
  onToggleExpanded: (productGUID: string) => void;
};

const ComparisonProduct = ({
  isExpanded,
  hasMoreSpecs,
  product,
  productData,
  specs,
  onRemoveFromComparison,
  onAddToBasket,
  onToggleExpanded,
}: ComparisonProductsProps) => {
  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
    setImageError(true);
  };

  const imageUrl = imageError
    ? "/images/placeholder.jpg"
    : product.image || "/images/placeholder.jpg";

  return (
    <div className="bg-[#EDEDED] relative flex-shrink-0">
      <button
        onClick={() => onRemoveFromComparison(product)}
        className="absolute top-0 right-0 h-12 w-12 grid place-content-center bg-[#6D21C7]"
      >
        <Icon src="/icons/x-mark.svg" size={34} alt="x-mark icon" />
      </button>

      <div className="pt-8 h-[100px] grid place-content-center">
        <p className="text-lg font-bold px-6">{product.name}</p>
      </div>

      <div className="relative h-[250px]">
        <Image
          src={imageUrl}
          alt={product?.name || "Product"}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          quality={90}
          placeholder="blur"
          blurDataURL={BASE64_PLACEHOLDER}
          onError={handleImageError}
          priority={false}
          loading="lazy"
        />
      </div>

      <div className="h-[60px] grid place-content-center">
        <p className="text-lg">{product.sku}</p>
      </div>

      {productData?.technicalSpecifications && (
        <div className="p-6">
          <div
            className={`grid gap-y-5 grid-cols-2 overflow-hidden transition-all duration-300 ease-in-out ${
              isExpanded ? "max-h-[2000px]" : "max-h-44"
            }`}
          >
            {specs.map((spec, index) => {
              const [specKey, specValue] = spec.split(":");

              return (
                <div key={index} className="contents">
                  <h3 className="font-bold text-lg">{specKey}:</h3>
                  <p>{specValue}</p>
                </div>
              );
            })}
          </div>

          {hasMoreSpecs && (
            <button
              onClick={() => onToggleExpanded(product.guid)}
              className="mt-4 text-[#6D21C7] hover:text-[#6D21C7]/60 font-medium transition-colors duration-200"
            >
              {isExpanded ? "Show less" : "Show more"}
            </button>
          )}
        </div>
      )}

      <div className="bg-[#6D21C7]/30 h-[170px] text-white grid place-content-center">
        <div className="px-4">
          <h3 className="text-center font-semibold mb-7">
            This product is suitable within
          </h3>

          <div className="flex justify-between gap-x-3">
            {PRODUCT_SUITABILITY.map((suitability) => (
              <div
                key={suitability.title}
                className="flex flex-col justify-center items-center"
              >
                <div className="relative w-14 h-14">
                  <Image
                    src={suitability.icon}
                    alt={suitability.title}
                    loading="lazy"
                    fill
                    onError={handleImageError}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-[#6D21C7] py-4 grid place-content-center">
        <button
          onClick={() => onAddToBasket(product)}
          className="bg-transparent flex justify-center items-center gap-x-3 border-2 text-white border-white rounded-[3px] py-2 px-6"
        >
          <Icon src="/icons/basket.svg" alt="basket" size={26} />

          <span>Add to basket</span>
        </button>
      </div>
    </div>
  );
};

export default ComparisonProduct;
