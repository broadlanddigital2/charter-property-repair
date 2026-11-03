// ProductCard.tsx
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";

import { TProduct } from "@/types/api";
import { BASE64_PLACEHOLDER } from "@/utils/const";

type ProductCardProps = {
  product: TProduct;
};

const ProductCard = ({ product }: ProductCardProps) => {
  const { query } = useRouter();
  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
    setImageError(true);
  };

  const imageUrl = imageError ? "/images/placeholder.jpg" : product.image || "/images/placeholder.jpg";

  return (
    <div className="relative rounded-[11px] overflow-hidden h-full">
      <div className="absolute top-5 left-5 z-10">
        <span
          className={`text-xs font-semibold px-3 py-1 rounded-full shadow ${
            product.in_budget
              ? "bg-[#D1FADF] text-[#027A48]" // Included
              : "bg-[#6D20C7] text-white" // Extra Cost
          }`}
        >
          {product.in_budget ? "Included in Budget" : "Extra Cost"}
        </span>
      </div>

      <div className="p-4 bg-[#E1D2F2] h-full pb-[72px]">
        <div className="relative h-[250px]">
          <Image
            src={imageUrl}
            alt={product.name}
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

        <h2 className="text-center font-bold text-2xl mt-4 mb-6">
          {product.name}
        </h2>
      </div>

      <div className="absolute bottom-0 w-full bg-[#6D20C7] text-white text-center py-6">
        <Link
          href={{
            pathname: "/product",
            query: {
              guid: product.guid,
              job: query.job,
              category: query.category,
            },
          }}
          className="bg-transparent border-2 border-white rounded-[3px] py-2 px-8 duration-300 hover:bg-white hover:text-[#6D20C7]"
        >
          View Details
        </Link>
      </div>
    </div>
  );
};

export default ProductCard;