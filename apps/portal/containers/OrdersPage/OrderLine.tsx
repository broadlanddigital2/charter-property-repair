import Image from "next/image";
import { useState } from "react";

import { TBasketLine } from "@/types/api";
import { BASE64_PLACEHOLDER } from "@/utils/const";

type OrderLineProps = {
  orderLine: TBasketLine;
};

const OrderLine = ({ orderLine }: OrderLineProps) => {
  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
    setImageError(true);
  };

  const imageUrl = imageError
    ? "/images/placeholder.jpg"
    : orderLine?.product?.image || "/images/placeholder.jpg";

  return (
    <div className="bg-[#EDEDED] flex w-full relative">
      <div className="relative h-[250px] w-[250px]">
        <Image
          src={imageUrl}
          alt={orderLine?.product?.name || "Product"}
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

      <div className="py-8 px-10">
        <h2 className="text-2xl font-bold">
          {orderLine?.product?.name || "Basket product"}
        </h2>

        <p className="mt-5 text-lg">
          <b>Code</b> {orderLine?.product?.sku}
        </p>
      </div>
    </div>
  );
};

export default OrderLine;
