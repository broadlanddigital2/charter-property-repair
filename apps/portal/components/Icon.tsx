import clsx from "clsx";
import Image from "next/image";
import { HTMLAttributes } from "react";

export type IconProps = {
  src: string;
  alt: string;
  customClasses?: string;
  width?: number;
  height?: number;
  size?: number;
  sizes?: string;
  onClick?: (event?: any) => void;
} & HTMLAttributes<HTMLDivElement>;

export const Icon = ({
  src,
  alt = "icon",
  customClasses,
  size = 24,
  height,
  width,
  onClick,
  ...otherProps
}: IconProps) => {
  const iconClasses = clsx(
    "relative inline-flex items-center justify-center flex-shrink-0",
    customClasses,
    onClick && "cursor-pointer"
  );

  return (
    <div
      className={iconClasses}
      onClick={onClick}
      {...otherProps}
    >
      <Image
        src={src}
        alt={alt}
        height={height || size}
        width={width || size}
        loading="lazy"
      />
    </div>
  );
};
