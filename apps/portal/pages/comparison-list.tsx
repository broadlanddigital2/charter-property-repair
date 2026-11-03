import Cookies from "js-cookie";
import { toast } from "react-toastify";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

import { Icon } from "@/components/Icon";
import { CookiesEnum } from "@/enums/cookies";
import { useStores } from "@/hooks/useStores";
import { errorLogger } from "@/services/axiosService";
import { TProduct, TProductDetails } from "@/types/api";
import DashboardLayout from "@/components/DashboardLayout";
import {
  createBasket,
  createBasketLine,
  getAllProducts,
  getBasket,
} from "@/services/requestService";
import withAuth from "@/hoc/withAuth";
import ComparisonProduct from "@/components/ComparisonProduct";

const ComparisonListPage = () => {
  const router = useRouter();
  const { loaderStore, authStore } = useStores();

  // Changed: Use object to track expanded state for each product
  const [expandedProducts, setExpandedProducts] = useState<
    Record<string, boolean>
  >({});
  const [productsToCompare, setProductsToCompare] = useState<TProduct[]>([]);

  useEffect(() => {
    (async () => {
      try {
        loaderStore.setLoading(true);
        const comparisonProductsGUIDs: string[] = JSON.parse(
          Cookies.get(CookiesEnum.ComparisonItems) || "[]"
        );
        if (!comparisonProductsGUIDs.length) return;

        // only fetch the products being compared (legacy loaded the whole catalogue)
        const { products } = await getAllProducts(comparisonProductsGUIDs);

        const filteredProducts = products.filter((product) =>
          comparisonProductsGUIDs.includes(product.guid)
        );

        if (filteredProducts?.length > 0) {
          setProductsToCompare(filteredProducts);
        }
      } catch (error) {
        errorLogger(error, "Failed to fetch products data");
      } finally {
        loaderStore.setLoading(false);
      }
    })();
  }, []);

  const handleAddToBasket = async (product: TProduct) => {
    try {
      loaderStore.setLoading(true);

      const companyGUID = authStore.getUser?.company?.guid;
      const productGUID = product?.guid;

      if (companyGUID && productGUID) {
        const existingBasket = await getBasket(
          Cookies.get(CookiesEnum.BasketGUID) || ""
        );

        if (existingBasket?.basket?.guid) {
          // create basket line and redirect to basket page
          await createBasketLine({
            basketGUID: existingBasket.basket.guid,
            productGUID: product.guid,
          });
        } else {
          const { basket } = await createBasket(companyGUID);
          Cookies.set(CookiesEnum.BasketGUID, basket.guid);

          await createBasketLine({
            basketGUID: basket.guid,
            productGUID: product.guid,
          });
        }

        toast.success("Successfully added to basket");
      } else {
        toast.error(
          "User is not connected to company or product does not exist"
        );
      }
    } catch (error) {
      errorLogger(error);
    } finally {
      loaderStore.setLoading(false);
    }
  };

  const handleRemoveFromComparison = (product: TProduct) => {
    const comparisonProductsGUIDs: string[] = JSON.parse(
      Cookies.get(CookiesEnum.ComparisonItems) || "[]"
    );

    const filteredComparisonProductsGUIDs = comparisonProductsGUIDs.filter(
      (guid) => guid !== product.guid
    );
    Cookies.set(
      CookiesEnum.ComparisonItems,
      JSON.stringify(filteredComparisonProductsGUIDs)
    );
    setProductsToCompare((prevState) =>
      prevState.filter((compProd) => compProd.guid !== product.guid)
    );

    // Clean up expanded state for removed product
    setExpandedProducts((prev) => {
      const newState = { ...prev };
      delete newState[product.guid];
      return newState;
    });
  };

  // New function to toggle expansion for a specific product
  const toggleProductExpansion = (productGuid: string) => {
    setExpandedProducts((prev) => ({
      ...prev,
      [productGuid]: !prev[productGuid],
    }));
  };

  return (
    <DashboardLayout>
      <div className="max-w-[1370px] mx-auto px-4">
        <div className="mt-24">
          <button
            onClick={() => router.back()}
            className="bg-[#6D20C7] text-white flex items-center justify-center gap-x-3 py-3 px-6 w-fit rounded-[4px]"
          >
            <Icon src="/icons/left-arrow.svg" alt="left arrow icon" size={22} />

            <span>Go Back</span>
          </button>
        </div>

        {productsToCompare?.length > 0 && !loaderStore.getLoading ? (
          <div className="flex gap-x-4 my-10">
            <div className="flex-shrink-0 max-w-xs bg-[#EDEDED] px-6">
              <div className="pt-8 h-[100px] flex items-center">
                <p className="text-lg font-bold">Title</p>
              </div>

              <div className="h-[250px] flex items-center">
                <p className="text-lg font-bold">Image</p>
              </div>

              <div className="h-[60px] flex items-center">
                <p className="text-lg font-bold">Code</p>
              </div>

              <div className="h-[60px] flex items-center">
                <p className="text-lg font-bold">Specs</p>
              </div>
            </div>

            <div className="flex-1 overflow-x-auto flex gap-x-4">
              {productsToCompare.map((product) => {
                const productData: TProductDetails | null =
                  product?.miscellaneous
                    ? JSON.parse(product?.miscellaneous)
                    : null;

                const specs =
                  productData?.technicalSpecifications?.split(" | ") || [];
                const hasMoreSpecs = specs.length > 4;

                // Get the expansion state for this specific product
                const isExpanded = expandedProducts[product.guid] || false;

                return (
                  <ComparisonProduct
                    key={product.guid}
                    isExpanded={isExpanded}
                    hasMoreSpecs={hasMoreSpecs}
                    product={product}
                    productData={productData}
                    specs={specs}
                    onToggleExpanded={toggleProductExpansion}
                    onRemoveFromComparison={handleRemoveFromComparison}
                    onAddToBasket={handleAddToBasket}
                  />
                );
              })}
            </div>
          </div>
        ) : (
          <h1 className="mt-8 text-lg font-semibold">
            No products to compare.
          </h1>
        )}
      </div>
    </DashboardLayout>
  );
};

export default withAuth(ComparisonListPage);
