import { TCategory } from "@/types/api";
import { TCategoryWithParentId } from "./CategoriesPage";

type TCategoryNodeProps = {
  category: TCategory;
  parentCategory: TCategory | null;
  openedCategories: Set<string>;
  onToggle: (categoryId: string) => void;
  onSelectCategory: (category: TCategoryWithParentId) => void;
};

const CategoryNode = ({
  category,
  parentCategory,
  openedCategories,
  onToggle,
  onSelectCategory,
}: TCategoryNodeProps) => {
  const isOpen = openedCategories.has(category.guid);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-x-2 cursor-pointer">
        <div
          onClick={() => onToggle(category.guid)}
          className="border-2 border-[#777] bg-[#FAFAFA] p-1"
        >
          {isOpen ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 0 0-1.883 2.542l.857 6a2.25 2.25 0 0 0 2.227 1.932H19.05a2.25 2.25 0 0 0 2.227-1.932l.857-6a2.25 2.25 0 0 0-1.883-2.542m-16.5 0V6A2.25 2.25 0 0 1 6 3.75h3.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 0 1.06.44H18A2.25 2.25 0 0 1 20.25 9v.776"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z"
              />
            </svg>
          )}
        </div>

        <span
          onDoubleClick={() =>
            onSelectCategory({ ...category, parentId: parentCategory?.guid })
          }
          className="text-[#333] text-md"
        >
          {category.name}
        </span>
      </div>

      {isOpen && (
        <div className="ml-10 space-y-2">
          {category?.children && category?.children?.length > 0
            ? category.children.map((child) => (
                <CategoryNode
                  key={child.guid}
                  category={child}
                  parentCategory={category}
                  openedCategories={openedCategories}
                  onToggle={onToggle}
                  onSelectCategory={onSelectCategory}
                />
              ))
            : []}
        </div>
      )}
    </div>
  );
};

export default CategoryNode;
