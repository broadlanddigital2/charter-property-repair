import { useRouter } from "next/router";
import { useEffect, useState } from "react";

import { TCategory, TCategoryTree } from "@/types/api";
import { findCategoryByGUID } from "@/utils/common";
import CategoryCard from "@/components/CategoryCard";
import Button from "@/components/Button";
import { Icon } from "@/components/Icon";

const CategoryNavigation = ({
  categoryTree,
}: {
  categoryTree: TCategoryTree;
}) => {
  const router = useRouter();
  const { query } = router;

  const [currentCategories, setCurrentCategories] =
    useState<TCategory[]>(categoryTree);

  useEffect(() => {
    if (query.category && categoryTree.length > 0) {
      const selectedCategory = findCategoryByGUID(
        categoryTree,
        query.category as string
      );

      if (
        selectedCategory &&
        selectedCategory.children &&
        selectedCategory.children.length > 0 &&
        !query.subcategory
      ) {
        // Show subcategories if we're at a parent category level
        setCurrentCategories(selectedCategory.children);
      } else {
        // Show top-level categories
        setCurrentCategories(categoryTree);
      }
    } else {
      // Show top-level categories by default
      setCurrentCategories(categoryTree);
    }
  }, [query.category, query.subcategory, categoryTree]);

  const handleCategoryClick = (category: TCategory) => {
    if (category.children && category.children?.length > 0) {
      // This is a parent category with children - navigate to show children
      router.push({
        pathname: "/process-claim",
        query: {
          job: query.job,
          category: category.guid,
        },
      });
      return;
    }

    // This is a final category (leaf node)
    // Check if we're currently viewing subcategories (meaning this is a subcategory selection)
    const currentParentCategory = query.category
      ? findCategoryByGUID(categoryTree, query.category as string)
      : null;

    if (
      currentParentCategory &&
      currentParentCategory.children &&
      currentParentCategory.children.length > 0
    ) {
      // We're selecting a subcategory
      router.push({
        pathname: "/process-claim",
        query: {
          job: query.job,
          category: query.category, // keep parent category
          subcategory: category.guid, // set subcategory
        },
      });
    } else {
      // This is a top-level category selection without children
      // Navigate directly to suppliers
      router.push({
        pathname: "/process-claim",
        query: {
          job: query.job,
          category: category.guid,
        },
      });
    }
  };

  return (
    <div>
      <Button
        onClick={() => router.push('/dashboard')}
        icon={
          <Icon src="/icons/left-arrow.svg" alt="left arrow icon" size={22} />
        }
        className="mt-6"
      >
        Go Back
      </Button>

      <ul className="grid grid-cols-4 gap-6 mt-8">
        {currentCategories.map((category) => (
          <CategoryCard
            key={category.guid}
            category={category}
            onClick={handleCategoryClick}
          />
        ))}
      </ul>
    </div>
  );
};

export default CategoryNavigation;
