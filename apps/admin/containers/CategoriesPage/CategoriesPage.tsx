import { toast } from "react-toastify";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";

import CategoryForm from "./CategoryForm";
import { TCategory } from "@/types/api";
import Button from "@/components/Button";
import { Icons } from "@/components/Icons";
import { chunkArray } from "@/utils/common";
import { useStores } from "@/hooks/useStores";
import { errorLogger } from "@/services/axiosService";
import DashboardLayout from "@/components/DashboardLayout";
import {
  createCategory,
  deleteCategory,
  getCategoryCounts,
  getCategoryTree,
  type TCategoryCounts,
  updateCategory,
  uploadCategoryImage,
} from "@/services/requestService";
import CategoryTree from "./CategoryTree";
import CategoryProducts from "./CategoryProducts";
import Pagination from "@/components/Pagination";
import SearchBar from "@/components/SearchBar";
import withAuth from "@/hoc/withAuth";

export type TCategoryFormData = {
  name: string;
};

export type TCategoryWithParentId = TCategory & { parentId?: string };

const CategoriesPage = () => {
  const { loaderStore } = useStores();

  const [currentPage, setCurrentPage] = useState(1);
  const [categoryTree, setCategoryTree] = useState<
    (TCategory & { children: TCategory[] })[]
  >([]);
  const [selectedCategory, setSelectedCategory] =
    useState<TCategoryWithParentId>();
  const [selectedParentCategoryGUID, setSelectedParentCategoryGUID] = useState<
    string | undefined
  >();
  const [isCreatingNewCategory, setIsCreatingNewCategory] = useState(false);
  const [searchResults, setSearchResults] = useState<TCategory[]>([]);
  const [image, setImage] = useState<File>();
  const [imagePreview, setImagePreview] = useState("");
  const [isSavedSuccessfully, setIsSavedSuccessfully] = useState(false);
  const [counts, setCounts] = useState<TCategoryCounts>({});

  const { register, handleSubmit, reset, setValue } =
    useForm<TCategoryFormData>();

  const categories: TCategoryWithParentId[] =
    categoryTree?.length > 0 ? extractCategories(categoryTree) : [];

  const chunkedCategories = chunkArray(categories, 10);

  const totalPages =
    categories?.length > 0 ? Math.ceil(categories.length / 10) : 0;

  useEffect(() => {
    (async () => {
      try {
        loaderStore.setLoading(true);
        await handleGetCategories();
      } catch (error) {
        errorLogger(error, "Failed to fetch categories");
      } finally {
        loaderStore.setLoading(false);
      }
    })();
  }, []);

  async function handleGetCategories() {
    const [{ category_trees }, c] = await Promise.all([getCategoryTree(), getCategoryCounts()]);
    setCategoryTree(category_trees);
    setCounts(c);
  }

  const handleStartCreatingCategory = () => {
    setSelectedCategory(undefined);
    handleFormReset();
    setIsCreatingNewCategory(true);
  };

  const handleSelectCategory = async (category: TCategoryWithParentId) => {
    setIsCreatingNewCategory(false);
    setIsSavedSuccessfully(false);
    setSelectedCategory(category);
    handleFormReset();
    setValue("name", category.name);

    if (category.image) {
      setImagePreview(category.image);
    } else {
      setImagePreview("");
    }

    if (category.parentId) {
      setSelectedParentCategoryGUID(category.parentId);
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleSelectParentCategoryGUID = (value: string) => {
    setSelectedParentCategoryGUID(value);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedImage = e.target.files[0];
      setImage(selectedImage);
      setImagePreview(URL.createObjectURL(selectedImage));
    }
  };

  const handleFormReset = () => {
    reset();
    setImage(undefined);
    setImagePreview("");
  }

  const handleCreateCategory = async (categoryData: TCategoryFormData) => {
    if (!categoryData.name) {
      toast.error("Category name should not be empty");
      return;
    }

    try {
      loaderStore.setLoading(true);

      const newCategoryData = selectedParentCategoryGUID
        ? { ...categoryData, parent_guid: selectedParentCategoryGUID }
        : categoryData;

      const { category } = await createCategory(newCategoryData);

      if (image) {
        const formData = new FormData();

        formData.append("category_guid", category.guid);
        formData.append("image", image);

        await uploadCategoryImage(formData);
      }

      await handleGetCategories();
      handleFormReset();
      toast.success("Successfully created");
    } catch (error) {
      errorLogger(error, "Failed to create category");
    } finally {
      loaderStore.setLoading(false);
    }
  };

  const handleSaveCategory = async (categoryData: TCategoryFormData) => {
    if (!selectedCategory?.guid) {
      toast.error("Category does not exist");
      return;
    }

    try {
      loaderStore.setLoading(true);

      const updatedCategoryData = selectedParentCategoryGUID
        ? { ...categoryData, parent_guid: selectedParentCategoryGUID }
        : categoryData;

      if (image) {
        const formData = new FormData();

        formData.append("category_guid", selectedCategory.guid);
        formData.append("image", image);

        await Promise.all([
          updateCategory(selectedCategory.guid, updatedCategoryData),
          uploadCategoryImage(formData),
        ]);

        await handleGetCategories();
        setIsSavedSuccessfully(true);
        toast.success("Successfully updated");
        return;
      }

      await updateCategory(selectedCategory.guid, updatedCategoryData);
      await handleGetCategories();
      setIsSavedSuccessfully(true);
      toast.success("Successfully updated");
    } catch (error) {
      errorLogger(error, "Failed to update category data");
    } finally {
      loaderStore.setLoading(false);
    }
  };

  const handleDeleteCategory = async (categoryGUID: string) => {
    try {
      loaderStore.setLoading(true);

      await deleteCategory(categoryGUID);
      await handleGetCategories();

      if (selectedCategory?.guid === categoryGUID) {
        setSelectedCategory(undefined);
      }

      toast.success("Successfully deleted");
    } catch (error) {
      errorLogger(error, "Failed to delete category");
    } finally {
      loaderStore.setLoading(false);
    }
  };

  const handleCancelAction = () => {
    setSelectedCategory(undefined);
    setSelectedParentCategoryGUID(undefined);
    setIsCreatingNewCategory(false);
  };

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const handleSearch = (value: string) => {
    if (value === "") {
      setSearchResults([]);
      return;
    }

    const searchValueLowerCase = value.toLowerCase();
    const foundCategories = categories.filter((category) =>
      category?.name?.toLowerCase()?.includes(searchValueLowerCase)
    );

    setSearchResults(foundCategories);
  };

  return (
    <DashboardLayout>
      <div className="card border-0 shadow-sm p-4 mb-4">
        <div className="flex items-center gap-x-8">
          <div className="flex items-center gap-x-3 h-fit">
            <Icons.Menu stroke="#242424" size="32px" />
            <h1 className="font-semibold">Categories</h1>
          </div>

          <SearchBar
            placeholder="Search for categories"
            searchKeys={["name"]}
            searchResults={searchResults}
            onItemClick={handleSelectCategory}
            onSearch={handleSearch}
          />

          {!isCreatingNewCategory && (
            <div className="flex justify-end">
              <Button onClick={handleStartCreatingCategory}>Create New</Button>
            </div>
          )}
        </div>

        {!selectedCategory &&
          !isCreatingNewCategory &&
          !loaderStore.getLoading && (
            <CategoryTree
              categoryTree={categoryTree}
              onSelectCategory={handleSelectCategory}
            />
          )}

        {(selectedCategory || isCreatingNewCategory) && (
          <CategoryForm
            categories={categories}
            selectedCategory={selectedCategory}
            selectedParentCategoryGUID={selectedParentCategoryGUID}
            isCreatingNewCategory={isCreatingNewCategory}
            isSavedSuccessfully={isSavedSuccessfully}
            imagePreview={imagePreview}
            onImageChange={handleImageChange}
            onSelectParentCategoryGUID={handleSelectParentCategoryGUID}
            register={register}
            handleSubmit={handleSubmit}
            onSave={handleSaveCategory}
            onCreate={handleCreateCategory}
            onCancelAction={handleCancelAction}
          />
        )}
      </div>

      {selectedCategory && !isCreatingNewCategory && (
        <CategoryProducts categoryGUID={selectedCategory.guid} categoryName={selectedCategory.name} />
      )}

      {!selectedCategory && chunkedCategories?.length > 0 && (
        <>
          <table className="table table-hover align-middle mb-0 bg-white shadow-sm rounded overflow-hidden mt-4">
            <thead>
              <tr className="table-light">
                <td></td>

                <td className="p-2">
                  <b>Name</b>
                </td>
                <td className="p-2">
                  <b>Parent Category</b>
                </td>
                <td className="p-2 text-end">
                  <b>Products</b>
                </td>
                <td></td>
              </tr>
            </thead>

            <tbody>
              {chunkedCategories[currentPage - 1]?.map((category, index) => {
                return (
                  <tr
                    key={category.guid}
                    style={{ cursor: "pointer" }}
                    onClick={() => handleSelectCategory(category)}
                  >
                    <td className="p-2 pl-8" onClick={(e) => e.stopPropagation()}>
                      <Icons.Bin
                        className="cursor-pointer"
                        onClick={() => {
                          if (window.confirm(`Delete "${category.name}"? This can't be undone.`)) {
                            handleDeleteCategory(category.guid);
                          }
                        }}
                      />
                    </td>

                    <td className="p-2">
                      <p>{category.name}</p>
                    </td>
                    <td className="p-2">
                      {categories.find((c) => c.guid === category.parentId)?.name || (
                        <span className="text-body-tertiary small">—</span>
                      )}
                    </td>
                    <td className="p-2 text-end">
                      <span className="badge text-bg-light">
                        {(counts[category.guid]?.total ?? 0).toLocaleString("en-GB")}
                      </span>
                      {counts[category.guid]?.suppliers?.length ? (
                        <div className="small text-body-secondary text-truncate" style={{ maxWidth: 220, marginLeft: "auto" }}>
                          {counts[category.guid].suppliers.join(", ")}
                        </div>
                      ) : null}
                    </td>
                    <td className="p-2 pr-4 text-end" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" type="button" onClick={() => handleSelectCategory(category)}>
                        View
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </DashboardLayout>
  );
};

function extractCategories(categoryTree: TCategory[]): TCategoryWithParentId[] {
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
}

export default withAuth(CategoriesPage);
