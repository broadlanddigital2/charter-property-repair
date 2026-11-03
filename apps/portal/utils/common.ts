import { TCategory, TCategoryTree } from "@/types/api";

type TCategoryWithParentId = TCategory & { parentId?: string };

export const extractCategories = (
  categoryTree: TCategory[]
): TCategoryWithParentId[] => {
  const categories: TCategory[] = [];

  function traverse(category: TCategory, parentId?: string) {
    const categoryWithParentId: TCategoryWithParentId = {
      ...category,
      parentId,
    };
    categories.push(categoryWithParentId);

    if (category.children) {
      category.children.forEach((child) => traverse(child, category.guid));
    }
  }

  categoryTree.forEach((category) => traverse(category));

  return categories;
};

export const findCategoryByGUID = (
  tree: TCategoryTree | TCategory[],
  guid: string
): TCategory | null => {
  for (const category of tree) {
    if (category.guid === guid) {
      return category;
    }

    if (category.children) {
      const found = findCategoryByGUID(category.children, guid);

      if (found) {
        return found;
      }
    }
  }
  return null;
};

export const isActive = (query: any, param: string) => {
  return Object.keys(query).includes(param);
};