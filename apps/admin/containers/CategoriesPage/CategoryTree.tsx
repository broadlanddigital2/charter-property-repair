import { useState } from "react";

import { TCategoryTree } from "@/types/api";
import { TCategoryWithParentId } from "./CategoriesPage";
import CategoryNode from "./CategoryNode";

type Props = {
  categoryTree: TCategoryTree;
  onSelectCategory: (category: TCategoryWithParentId) => void;
};

const CategoryTree = ({ categoryTree, onSelectCategory }: Props) => {
  const [openedCategories, setOpenedCategories] = useState<Set<string>>(
    new Set()
  );

  const toggleCategory = (categoryId: string) => {
    const newOpenedCategories = new Set(openedCategories);
    if (openedCategories.has(categoryId)) {
      newOpenedCategories.delete(categoryId);
    } else {
      newOpenedCategories.add(categoryId);
    }
    setOpenedCategories(newOpenedCategories);
  };

  return (
    <div className="bg-white mt-7 rounded-[13px] p-6">
      <p className="text-[#333] text-md mb-4">
        Note: Edit a category data by double clicking on it's text
      </p>

      {categoryTree.map((category) => (
        <CategoryNode
          key={category.guid}
          category={category}
          parentCategory={null}
          openedCategories={openedCategories}
          onToggle={toggleCategory}
          onSelectCategory={onSelectCategory}
        />
      ))}
    </div>
  );
};

export default CategoryTree;
