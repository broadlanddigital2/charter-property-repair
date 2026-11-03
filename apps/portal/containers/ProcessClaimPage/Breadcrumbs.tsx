import Link from "next/link";
import { UrlObject } from "url";
import { useRouter } from "next/router";

import { TCategoryTree, TProduct } from "@/types/api";
import { findCategoryByGUID } from "@/utils/common";

type Props = {
  categoryTree: TCategoryTree;
  currentProduct?: TProduct;
};

type BreadcrumbItem = {
  label: string;
  isActive: boolean;
  href: string | UrlObject | null;
};

const Breadcrumbs = ({ categoryTree, currentProduct }: Props) => {
  const router = useRouter();
  const { query } = router;

  // Only proceed if we have the necessary data or don't need it
  const needsCategoryData = query.category && categoryTree.length === 0;

  // Don't render breadcrumbs if we're missing required data
  if (needsCategoryData) {
    return null;
  }

  const selectedCategory = query.category
    ? findCategoryByGUID(categoryTree, query.category as string)
    : null;

  const breadcrumbItems: BreadcrumbItem[] = [
    {
      label: "Home",
      href: "/dashboard",
      isActive: false,
    },
  ];

  // Add job/categories level
  if (query.job) {
    breadcrumbItems.push({
      label: "Categories",
      href: query.category
        ? {
            pathname: "/process-claim",
            query: { job: query.job },
          }
        : null,
      isActive: !query.category,
    });
  }

  // Category
  if (selectedCategory) {
    breadcrumbItems.push({
      label: selectedCategory.name,
      href: query.basket
        ? {
            pathname: "/process-claim",
            query: { 
              job: query.job, 
              category: query.category 
            },
          }
        : null,
      isActive: !query.basket && !currentProduct,
    });
  }

  // Product (if on product page)
  if (currentProduct) {
    breadcrumbItems.push({
      label: currentProduct.name,
      href: null,
      isActive: true,
    });
  }

  // Basket
  if (query.basket) {
    breadcrumbItems.push({
      label: "Basket",
      href: null,
      isActive: true,
    });
  }

  return (
    <nav className="flex items-center text-gray-600">
      {breadcrumbItems.map((item, index) => (
        <div key={index} className="flex items-center">
          {index > 0 && <span className="mx-2 text-gray-400">/</span>}
          {item.href ? (
            <Link
              href={item.href}
              className={`hover:text-[#6D20C7] transition-colors ${
                item.isActive ? "text-[#6D20C7] font-semibold" : "text-gray-600"
              }`}
            >
              {item.label}
            </Link>
          ) : (
            <span
              className={`${
                item.isActive ? "text-[#6D20C7] font-semibold" : "text-gray-600"
              }`}
            >
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
};

export default Breadcrumbs;