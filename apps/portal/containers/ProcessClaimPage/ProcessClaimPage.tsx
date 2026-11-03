import Cookies from "js-cookie";
import { toast } from "react-toastify";
import { useRouter } from "next/router";
import { observer } from "mobx-react-lite";
import { useEffect, useState, useCallback } from "react";

import { useStores } from "@/hooks/useStores";
import Breadcrumbs from "./Breadcrumbs";
import DashboardLayout from "@/components/DashboardLayout";
import { errorLogger } from "@/services/axiosService";
import {
  createOrder,
  getBasket,
  getCategoryProducts,
  getCategoryTree,
  removeBasketLine,
} from "@/services/requestService";
import { TBasketLine, TCategoryTree, TJobBudget, TProduct } from "@/types/api";
import CategoryNavigation from "./CategoryNavigation";
import withAuth from "@/hoc/withAuth";
import { CookiesEnum } from "@/enums/cookies";
import { Pagination } from "@/components/Pagination";
import { findCategoryByGUID, isActive } from "@/utils/common";
import Navigation from "./Navigation";
import ProductCard from "@/components/ProductCard";
import BasketLine from "@/components/BasketLine";
import Button from "@/components/Button";
import { Icon } from "@/components/Icon";

const PRODUCTS_PER_PAGE = 20;

const ProcessClaimPage = () => {
  const router = useRouter();
  const { query } = router;

  const { loaderStore, basketStore } = useStores();

  const [categoryTree, setCategoryTree] = useState<TCategoryTree>([]);
  const [products, setProducts] = useState<TProduct[]>([]);
  const [budgetData, setBudgetData] = useState<TJobBudget | null>(null);
  const [basketLines, setBasketLines] = useState<TBasketLine[]>([]);
  const [totalProductPages, setTotalProductPages] = useState(0);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("");

  const currentProductPage = query.page ? +query.page : 1;
  const categoryGUID = query?.category as string | undefined;

  const selectedCategory =
    findCategoryByGUID(categoryTree, router.query.category as string) || null;

  // Navigation states
  const selectingCategory =
    isActive(query, "job") && !isActive(query, "category");
  const selectingProduct =
    isActive(query, "category") && !isActive(query, "basket");
  const onBasketPage = isActive(query, "category") && isActive(query, "basket");

  const fetchProducts = useCallback(
    async (
      categoryGUID: string,
      page: number = currentProductPage,
      isParentCategory: boolean
    ) => {
      try {
        loaderStore.setLoading(true);

        const { products } = await getCategoryProducts({
          categoryGUID: categoryGUID,
          page: page,
          perPage: PRODUCTS_PER_PAGE,
          withChildren: isParentCategory,
        });

        console.log({ products });

        const productsData = products.data;
        setTotalProductPages(Math.ceil(products.total / PRODUCTS_PER_PAGE));
        setProducts(productsData);
      } catch (error) {
        errorLogger(error, "Failed to fetch products");
      } finally {
        loaderStore.setLoading(false);
      }
    },
    [loaderStore]
  );

  useEffect(() => {
    // Always load category tree when we have a job (needed for breadcrumbs)
    if (isActive(query, "job") && categoryTree.length === 0) {
      (async () => {
        try {
          loaderStore.setLoading(true);
          const { category_trees: categoryTreeData } = await getCategoryTree();
          setCategoryTree(categoryTreeData);
        } catch (error) {
          errorLogger(error, "Failed to fetch categories");
        } finally {
          loaderStore.setLoading(false);
        }
      })();
    } else if (isActive(query, "job") && !isActive(query, "category")) {
      setSelectedSubcategory("");
    }
  }, [query, categoryTree.length, loaderStore]);

  useEffect(() => {
    if (selectingProduct && categoryGUID) {
      // Use the selected subcategory if it exists, otherwise use the main category
      const targetCategory = selectedSubcategory || categoryGUID;
      console.log({ selectedSubcategory });

      fetchProducts(targetCategory, currentProductPage, !selectedSubcategory);
    }
  }, [
    selectingProduct,
    categoryGUID,
    selectedSubcategory,
    currentProductPage,
    fetchProducts,
  ]);

  useEffect(() => {
    if (onBasketPage && query.job) {
      (async () => {
        try {
          loaderStore.setLoading(true);
          const basketGUID = Cookies.get(CookiesEnum.BasketGUID);

          if (basketGUID) {
            const { basket, budget } = await getBasket(
              basketGUID,
              query.job as string
            );
            console.log({ basket });

            setBasketLines(basket.basket_lines || []);
            setBudgetData(budget || null);
            basketStore.setBasket(basket);
          }
        } catch (error) {
          errorLogger(error, "Failed to fetch basket data");
        } finally {
          loaderStore.setLoading(false);
        }
      })();
    }
  }, [onBasketPage, query.job, loaderStore, basketStore]);

  const handleRemoveBasketLine = async (basketLineGUID: string) => {
    try {
      loaderStore.setLoading(true);
      await removeBasketLine(basketLineGUID);
      setBasketLines((prevState) => {
        return prevState.filter(
          (basketItem) => basketItem.guid !== basketLineGUID
        );
      });

      toast.success("Product was removed");
    } catch (error) {
      errorLogger(error, "Failed to remove basket item");
    } finally {
      loaderStore.setLoading(false);
    }
  };

  const handleCreateOrder = async () => {
    try {
      loaderStore.setLoading(true);
      const basketLineGUIDs = basketLines.map((line) => line.guid);
      const productsIds = basketLines.map((line) => line.product!.guid);

      const removeFromBasketPromises = basketLineGUIDs.map(async (lineGUID) => {
        removeBasketLine(lineGUID);
      });

      const { order } = await createOrder(query.job as string, productsIds);
      await Promise.all(removeFromBasketPromises);

      Cookies.set(CookiesEnum.TempOrderId, order.guid);

      router.push(`/order-status?order=${order.guid}`);
    } catch (error) {
      errorLogger(error);
    } finally {
      loaderStore.setLoading(false);
    }
  };

  const handleSubcategoryFilter = (subcategoryGUID: string) => {
    setSelectedSubcategory(subcategoryGUID);

    // Reset to first page when filtering subcategories
    router.push(
      {
        pathname: router.pathname,
        query: {
          ...router.query,
          page: 1,
        },
      },
      undefined,
      { shallow: true }
    );
  };

  const handleContinueShopping = () => {
    router.push(
      {
        pathname: router.pathname,
        query: { job: query.job },
      },
      undefined,
      { shallow: true }
    );
  };

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] mx-auto px-4 py-12">
        <div className="mb-12 flex justify-between items-center gap-x-4">
          <Breadcrumbs categoryTree={categoryTree} />
          <Navigation categoryTree={categoryTree} />
        </div>

        {selectedCategory &&
          selectedCategory.children &&
          selectedCategory.children.length > 0 &&
          selectingProduct && (
            <div>
              <Button
                onClick={() =>
                  router.push({
                    pathname: "/process-claim",
                    query: { job: query.job as string },
                  })
                }
                icon={
                  <Icon
                    src="/icons/left-arrow.svg"
                    alt="left arrow icon"
                    size={22}
                  />
                }
                className="mt-6"
              >
                Go Back
              </Button>

              <div className="flex gap-4 overflow-x-auto pb-4 mt-8">
                <button
                  onClick={() => handleSubcategoryFilter("")}
                  className={`px-4 py-2 min-w-fit rounded-md border transition-colors ${
                    selectedSubcategory === ""
                      ? "bg-[#6D20C7] text-white border-[#6D20C7]"
                      : "bg-white text-gray-700 border-gray-300 hover:border-[#6D20C7]"
                  }`}
                >
                  All Products
                </button>

                {selectedCategory.children.map((subcategory) => (
                  <button
                    key={subcategory.guid}
                    onClick={() => handleSubcategoryFilter(subcategory.guid)}
                    className={`px-4 py-2 rounded-md border min-w-fit transition-colors ${
                      selectedSubcategory === subcategory.guid
                        ? "bg-[#6D20C7] text-white border-[#6D20C7]"
                        : "bg-white text-gray-700 border-gray-300 hover:border-[#6D20C7]"
                    }`}
                  >
                    {subcategory.name}
                  </button>
                ))}
              </div>
            </div>
          )}

        {categoryTree?.length > 0 && selectingCategory && (
          <CategoryNavigation categoryTree={categoryTree} />
        )}

        {selectingProduct && (
          <>
            {products?.length > 0 ? (
              <>
                <nav className="grid grid-cols-4 gap-6 mt-4">
                  {products.map((product) => (
                    <ProductCard key={product.guid} product={product} />
                  ))}
                </nav>

                <Pagination
                  currentPage={currentProductPage}
                  totalPages={totalProductPages}
                />
              </>
            ) : (
              <>
                {!loaderStore.getLoading && (
                  <h1 className="mt-8 font-semibold text-lg text-center">
                    {selectedSubcategory
                      ? "No products found for the selected subcategory"
                      : "Products for specified category doesn't exist"}
                  </h1>
                )}
              </>
            )}
          </>
        )}

        {onBasketPage && (
          <>
            {basketLines?.length > 0 ? (
              <>
                <Button onClick={handleContinueShopping}>
                  Continue Shopping
                </Button>

                <div className="flex flex-col gap-y-8 mt-8">
                  {basketLines.map((basketLine) => (
                    <BasketLine
                      key={basketLine.guid}
                      basketLine={basketLine}
                      onRemoveBasketLine={handleRemoveBasketLine}
                    />
                  ))}
                </div>

                {/* {budgetData && budgetData.total_out_of_budget > 0 && (
                  <div className="mt-12 p-6 bg-[#6D21C7] rounded-xl text-white max-w-md ml-auto">
                    <h3 className="text-xl font-bold mb-4">Budget Summary</h3>
                    <ul className="text-base space-y-2">
                      <li>
                        <b className="text-lg">Amount Over Budget:</b>{" "}
                        <span className="text-lg font-semibold">
                          £{budgetData.total_out_of_budget.toFixed(2)}
                        </span>
                      </li>
                    </ul>
                  </div>
                )} */}

                <div className="bg-[#6D21C7] mt-12 p-6 flex justify-between">
                  <Button variant="ghost" onClick={handleContinueShopping}>
                    Continue Shopping
                  </Button>

                  <Button onClick={handleCreateOrder} variant="ghost">
                    Complete Order
                  </Button>
                </div>
              </>
            ) : (
              <h3 className="text-2xl font-semibold mt-8">Basket is empty</h3>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default withAuth(observer(ProcessClaimPage));
