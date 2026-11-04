import { useEffect, useState } from "react";
import CIcon from "@coreui/icons-react";
import { cilImage } from "@coreui/icons";

type Props = {
  src?: string | null;
  alt?: string;
  /** "cover" for thumbnails, "contain" for the large preview */
  fit?: "cover" | "contain";
  iconSize?: "sm" | "lg" | "xl" | "3xl";
  label?: string;
};

/** Product image that falls back to a placeholder when the supplier's URL is broken. */
const ProductImage = ({ src, alt = "", fit = "cover", iconSize = "lg", label }: Props) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  if (!src || failed) {
    return (
      <div className="w-100 h-100 d-flex flex-column align-items-center justify-content-center text-body-tertiary" title="No image available">
        <CIcon icon={cilImage} size={iconSize} />
        {label && <div className="small mt-2">{label}</div>}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      style={{ width: "100%", height: "100%", objectFit: fit }}
    />
  );
};

export default ProductImage;
