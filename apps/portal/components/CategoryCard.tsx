import Image from "next/image";
import { useState } from "react";

import { TCategory } from "@/types/api";
import { BASE64_PLACEHOLDER } from "@/utils/const";

type CategoryCardProps = {
  category: TCategory;
  onClick: (category: TCategory) => void;
};

const CategoryCard = ({ category, onClick }: CategoryCardProps) => {
  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
    setImageError(true);
  };

  const imageUrl = imageError ? "/images/placeholder.jpg" : category.image || "/images/placeholder.jpg";

  return (
    <div
      onClick={() => onClick(category)}
      className="rounded-[11px] overflow-hidden cursor-pointer"
    >
      <div className="relative h-[250px]">
        <Image
          src={imageUrl}
          alt={category.name}
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

      <div className="bg-[#6D20C7] text-white font-semibold text-lg text-center py-4 duration-300 hover:bg-[#6D20C7]/80">
        <p>{category.name}</p>
      </div>
    </div>
  );
};

export default CategoryCard;
