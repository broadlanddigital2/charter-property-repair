import Image from "next/image";
import Cookies from "js-cookie";
import { toast } from "react-toastify";
import { observer } from "mobx-react-lite";
import { useEffect, useState } from "react";
import { NextRouter, useRouter } from "next/router";

import { Icon } from "@/components/Icon";
import { CookiesEnum } from "@/enums/cookies";
import { useStores } from "@/hooks/useStores";
import { errorLogger } from "@/services/axiosService";
import { TProduct, TProductDetails } from "@/types/api";
import DashboardLayout from "@/components/DashboardLayout";
import {
  createBasket,
  createBasketLine,
  getBasket,
  getProductByGUID,
} from "@/services/requestService";
import { BasketStore } from "@/store/basketStore";
import Button from "@/components/Button";
import { BASE64_PLACEHOLDER } from "@/utils/const";

const PRODUCT_SUITABILITY = [
  {
    title: "Kitchens",
    icon: "/icons/Kitchens.svg",
  },
  {
    title: "Bathrooms",
    icon: "/icons/Bathrooms.svg",
  },
  {
    title: "Wet Areas",
    icon: "/icons/Wet Areas.svg",
  },
  {
    title: "Walls",
    icon: "/icons/Walls.svg",
  },
];

const ProductPage = () => {
  const { query } = useRouter();
  const router = useRouter();
  const { guid, job, category, subcategory, supplier } = query;

  const { loaderStore, authStore, basketStore } = useStores();

  const [product, setProduct] = useState<TProduct | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
    setImageError(true);
  };

  const imageUrl = imageError
    ? "/images/placeholder.jpg"
    : product?.image || "/images/placeholder.jpg";

  const selectedCategory = subcategory || category;

  const productData: TProductDetails | null = product?.miscellaneous
    ? JSON.parse(product?.miscellaneous)
    : null;

  // Currently only tiles have
  const specs = productData?.technicalSpecifications?.split(" | ") || [];
  const hasMoreSpecs = specs.length > 1;

  useEffect(() => {
    if (guid) {
      (async () => {
        try {
          loaderStore.setLoading(true);
          const { product } = await getProductByGUID(guid as string);
          setProduct(product);
        } catch (error) {
          errorLogger(error, "Failed to fetch the product data");
        } finally {
          loaderStore.setLoading(false);
        }
      })();
    }
  }, [guid]);

  const handleAddToComparison = async () => {
    const comparisonItems = Cookies.get(CookiesEnum.ComparisonItems);

    if (product) {
      if (!comparisonItems) {
        Cookies.set(
          CookiesEnum.ComparisonItems,
          JSON.stringify([product.guid])
        );
        toast.success("Product was added to comparison list");
      } else {
        const parsedComparisonItems: string[] = JSON.parse(comparisonItems);

        if (parsedComparisonItems.includes(product.guid)) {
          toast.error("Product is already in comparison list");
        } else {
          Cookies.set(
            CookiesEnum.ComparisonItems,
            JSON.stringify([...parsedComparisonItems, product.guid])
          );
          toast.success("Product was added to comparison list");
        }
      }
    }
  };

  const handleAddToBasket = async () => {
    try {
      loaderStore.setLoading(true);

      const companyGUID = authStore.getUser?.company?.guid;
      const productGUID = product?.guid;

      if (companyGUID && productGUID) {
        const basketGUID = Cookies.get(CookiesEnum.BasketGUID);

        if (basketGUID && job) {
          const existingBasket = await getBasket(basketGUID, job as string);

          if (existingBasket?.basket) {
            basketStore.setBasket(existingBasket.basket);

            // create basket line and redirect to basket page
            await createBasketLine({
              basketGUID: existingBasket.basket.guid,
              productGUID: product.guid,
            });

            const query: {
              job: string;
              category: string;
              supplier: string;
              basket: string;
              subcategory?: string;
            } = {
              job: job as string,
              category: category as string,
              supplier: supplier as string,
              basket: existingBasket.basket.guid,
            };

            if (subcategory) {
              query.subcategory = subcategory as string;
            }

            await router.push({
              pathname: "/process-claim",
              query,
            });
          } else {
            await handleCreateNewBasket({
              companyGUID,
              product,
              basketStore,
              router,
              job: job as string,
              type: selectedCategory as string,
              supplier: supplier as string,
            });
          }
        } else {
          await handleCreateNewBasket({
            companyGUID,
            product,
            basketStore,
            router,
            job: job as string,
            type: selectedCategory as string,
            supplier: supplier as string,
          });
        }
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

  return (
    <DashboardLayout>
      <div className="max-w-[1370px] mx-auto px-4">
        <div className="mt-24 flex gap-x-3 items-center justify-between">
          <Button
            onClick={() => router.back()}
            icon={
              <Icon
                src="/icons/left-arrow.svg"
                alt="left arrow icon"
                size={22}
              />
            }
          >
            Go Back
          </Button>

          <Button
            href="/comparison-list"
            icon={
              <Icon src="/icons/compare.svg" alt="comparison icon" size={22} />
            }
          >
            Comparison List
          </Button>
        </div>

        {product && (
          <div className="my-8 flex gap-x-5">
            <div className="flex-1 flex flex-col">
              <div className="relative h-[500px]">
                <Image
                  src={imageUrl}
                  alt={product.name}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  quality={90}
                  placeholder="blur"
                  blurDataURL={BASE64_PLACEHOLDER}
                  onError={handleImageError}
                  priority={true}
                />

                <div className="absolute top-3 left-3 z-10">
                  <span
                    className={`text-sm font-semibold px-3 py-1 rounded-full shadow ${
                      product.in_budget
                        ? "bg-[#D1FADF] text-[#027A48]" // Included
                        : "bg-[#E5D1FA] text-[#6941C6]" // Extra Cost
                    }`}
                  >
                    {product.in_budget ? "Included in Budget" : "Extra Cost"}
                  </span>
                </div>
              </div>

              <div className="mt-4 bg-[#6D21C7] text-white flex justify-between items-center p-4">
                <div className="flex items-center gap-x-4">
                  <Icon src="/icons/ar-view.svg" alt="ar-view icon" size={54} />

                  <p className="max-w-[160px] text-xl">
                    View this product in my room
                  </p>
                </div>

                <button className="bg-transparent border-2 border-white rounded-[3px] py-2 px-8 duration-300 hover:bg-white hover:text-[#6D20C7]">
                  View
                </button>
              </div>
            </div>

            <div className="flex-1">
              <div className="bg-[#EDEDED] py-6 px-8 min-h-[345px]">
                <h1 className="font-bold text-2xl mb-6">{product.name}</h1>

                <hr className="border-black" />

                {productData?.technicalSpecifications && (
                  <>
                    <div
                      className={`mt-6 overflow-hidden transition-all duration-300 ease-in-out ${
                        isExpanded
                          ? "max-h-[1000px] opacity-100"
                          : "max-h-0 opacity-0"
                      }`}
                    >
                      <div className="grid gap-y-5 grid-cols-2">
                        {specs.map((spec, index) => {
                          const [specKey, specValue] = spec.split(":");

                          return (
                            <div key={index} className="contents">
                              <h3 className="font-bold text-lg">{specKey}:</h3>
                              <p>{specValue}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* {hasMoreSpecs && (
                        <button
                          onClick={() => setIsExpanded(!isExpanded)}
                          className="mt-4 text-[#6D21C7] hover:text-[#6D21C7]/60 font-medium transition-colors duration-200"
                        >
                          {isExpanded ? "Show less" : "Show more"}
                        </button>
                      )} */}
                  </>
                )}

                <div className="mt-6">
                  <div className="grid gap-y-5 grid-cols-2">
                    {product?.supplier && (
                      <div className="contents">
                        <h3 className="font-bold text-lg">Supplier:</h3>

                        <div className="flex items-center gap-x-4">
                          {product.supplier.image && (
                            <Image
                              src={product.supplier.image}
                              alt={product.supplier.name}
                              width={32}
                              height={32}
                            />
                          )}
                          <p>{product.supplier.name}</p>
                        </div>
                      </div>
                    )}

                    {product?.sku && (
                      <div className="contents">
                        <h3 className="font-bold text-lg">SKU:</h3>
                        <p>{product.sku}</p>
                      </div>
                    )}

                    {product?.description && (
                      <div className="col-span-2">
                        <h3 className="font-bold text-lg mb-2">Description:</h3>
                        <p>{product.description}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-[#6D21C7]/30 p-4 text-white">
                <h3 className="text-center font-semibold mb-7">
                  This product is suitable within
                </h3>

                <div className="flex justify-evenly">
                  {PRODUCT_SUITABILITY.map((suitability) => (
                    <div
                      key={suitability.title}
                      className="flex flex-col justify-center items-center"
                    >
                      <Icon
                        src={suitability.icon}
                        alt={suitability.title}
                        size={69}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#6D21C7] text-white flex justify-between items-center gap-x-8 px-4 py-5 h-[88px]">
                <button
                  onClick={handleAddToComparison}
                  className="bg-[#6D20C7] text-white flex items-center justify-center gap-x-3 border-2 border-white py-2 px-6 rounded-[3px]"
                >
                  <Icon
                    src="/icons/compare.svg"
                    alt="comparison icon"
                    size={22}
                  />

                  <span>Add to comparison</span>
                </button>

                <button
                  onClick={handleAddToBasket}
                  className="bg-transparent flex justify-center items-center gap-x-3 border-2 border-white rounded-[3px] py-2 px-6"
                >
                  <Icon src="/icons/basket.svg" alt="basket" size={26} />

                  <span>Add to basket</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

async function handleCreateNewBasket({
  companyGUID,
  product,
  basketStore,
  router,
  job,
  type,
  supplier,
}: {
  companyGUID: string;
  product: TProduct;
  basketStore: BasketStore;
  router: NextRouter;
  job: string;
  type: string;
  supplier: string;
}) {
  const { basket } = await createBasket(companyGUID);
  Cookies.set(CookiesEnum.BasketGUID, basket.guid);

  basketStore.setBasket(basket);

  await createBasketLine({
    basketGUID: basket.guid,
    productGUID: product.guid,
  });

  await router.push({
    pathname: "/process-claim",
    query: { job, type, supplier, basket: basket.guid },
  });
}

export default observer(ProductPage);
