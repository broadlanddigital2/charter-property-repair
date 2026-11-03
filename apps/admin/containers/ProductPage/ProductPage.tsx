import { toast } from "react-toastify";
import { useForm } from "react-hook-form";
import { observer } from "mobx-react-lite";
import { useEffect, useState } from "react";

import {
  getCategories,
  getPriceBands,
  getProducts,
  getSuppliers,
  removeProduct,
  updateProduct,
  uploadProductImage,
} from "@/services/requestService";
import { errorLogger } from "@/services/axiosService";
import { Nullable } from "@/types/utils";
import {
  Product,
  TCategory,
  TPriceBandsCategory,
  TSupplier,
} from "@/types/api";
import { useStores } from "@/hooks/useStores";

import Button from "@/components/Button";
import DashboardLayout from "@/components/DashboardLayout";
import { Icons } from "@/components/Icons";
import ProductForm from "./ProductForm";
import SearchBar from "@/components/SearchBar";
import { chunkArray } from "@/utils/common";
import Pagination from "@/components/Pagination";
import withAuth from "@/hoc/withAuth";

const Products = () => {
  const { loaderStore } = useStores();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSurface, setSelectedSurface] = useState<Nullable<string>>();
  const [selectedCategoryGUID, setSelectedCategoryGUID] = useState<string>("");
  const [selectedManufacturerGUID, setSelectedManufacturerGUID] =
    useState<string>("");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<TCategory[]>([]);
  const [suppliers, setSuppliers] = useState<TSupplier[]>([]);
  const [priceBands, setPriceBands] = useState<TPriceBandsCategory[]>([]);
  const [selectedPriceBand, setSelectedPriceBand] = useState<string | undefined>();
  const [image, setImage] = useState<File>();
  const [imagePreview, setImagePreview] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSavedSuccessfully, setIsSavedSuccessfully] = useState(false);

  const { register, handleSubmit, setValue, getValues, reset } = useForm<any>();

  const [selectedProduct, setSelectedProduct] =
    useState<Nullable<Product>>(null);

  const chunkedProducts = chunkArray(products, 10);

  const totalPages = products.length > 0 ? Math.ceil(products.length / 10) : 0;

  useEffect(() => {
    (async () => {
      try {
        loaderStore.setLoading(true);
        const [
          { products },
          { categories },
          { suppliers },
          { price_bands: priceBandCategories },
        ] = await Promise.all([
          getProducts(),
          getCategories(),
          getSuppliers(),
          getPriceBands(),
        ]);

        setProducts(products);
        setCategories(categories);
        setSuppliers(suppliers);
        setPriceBands(priceBandCategories);
      } catch (error) {
        errorLogger(error);
      } finally {
        loaderStore.setLoading(false);
      }
    })();
  }, []);

  const handleGetProducts = async () => {
    const { products } = await getProducts();
    setProducts(products);
  };

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const handleRemoveProduct = async (guid: string) => {
    try {
      loaderStore.setLoading(true);
      await removeProduct(guid);
      await handleGetProducts();

      if (selectedProduct?.guid === guid) {
        setSelectedProduct(null);
      }

      toast.success("Product was deleted");
    } catch (error) {
      errorLogger(error, "Failed to remove product");
    } finally {
      loaderStore.setLoading(false);
    }
  };

  const handleSelectProduct = (product: Product) => {
    const productOptions = JSON.parse(product.miscellaneous);
    const miscellaneousData = Object.entries(productOptions).reduce(
      (finalData, currentData) => {
        return { ...finalData, [currentData[0]]: currentData[1] };
      },
      []
    );

    reset();
    setImage(undefined);
    setIsSavedSuccessfully(false);
    setSelectedProduct(product);
    setSelectedCategoryGUID(product.category?.guid || "");
    setSelectedManufacturerGUID(product.supplier?.guid || "");
    setSelectedPriceBand(product?.price_band?.guid || "");
    setSelectedSurface(!!productOptions.wall ? "Wall" : "Floor");

    setValue("productData", {
      ...miscellaneousData,
      name: product.name,
      description: product.description,
    });

    if (product.image) {
      setImagePreview(product.image);
    } else {
      setImagePreview('');
    }
  };

  const handleSearch = (value: string) => {
    if (value === "") {
      setSearchResults([]);
      return;
    }

    const searchValueLowerCase = value.toLowerCase();
    const foundProducts = products.filter(
      (product) =>
        product?.sku?.includes(searchValueLowerCase) ||
        product?.name?.toLowerCase()?.includes(searchValueLowerCase)
    );

    setSearchResults(foundProducts);
  };

  const handleSelectPriceBand = (value: string) => {
    setSelectedPriceBand(value);
  };

  const handleSelectSurface = (value: string) => {
    setSelectedSurface(value);
  };

  const handleSelectCategory = (value: string) => {
    setSelectedCategoryGUID(value);
  };

  const handleSelectManufacturer = (value: string) => {
    setSelectedManufacturerGUID(value);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedImage = e.target.files[0];
      setImage(selectedImage);
      setImagePreview(URL.createObjectURL(selectedImage));
    }
  };

  const handleSaveProduct = async (data: Product) => {
    if (!selectedProduct?.guid) {
      toast.error("Product does not exist");
      return;
    }

    // check for required fields
    if (
      !selectedManufacturerGUID ||
      !selectedCategoryGUID ||
      !data.sku ||
      !data.name
    ) {
      toast.error(
        "Please ensure that product name, sku, category and manufacturers are defined"
      );
      return;
    }

    try {
      loaderStore.setLoading(true);

      const updateBody: Partial<Product> & {
        supplier_guid: string;
        category_guid: string;
        price_band_guid?: string;
      } = {
        supplier_guid: selectedManufacturerGUID,
        category_guid: selectedCategoryGUID,
        ...data,
      };

      if (selectedPriceBand) {
        updateBody.price_band_guid = selectedPriceBand;
      }

      if (image) {
        const formData = new FormData();

        formData.append("product_guid", selectedProduct.guid);
        formData.append("image", image);

        await Promise.all([
          updateProduct(selectedProduct!.guid, updateBody),
          uploadProductImage(formData),
        ]);
        await handleGetProducts();

        setIsSavedSuccessfully(true);
        toast.success("Successfully updated");
        return;
      }

      await updateProduct(selectedProduct.guid, updateBody);
      await handleGetProducts();
      setIsSavedSuccessfully(true);
      toast.success("Successfully updated");
    } catch (error) {
      errorLogger(error, "Failed to update product data");
    } finally {
      loaderStore.setLoading(false);
    }
  };

  const handleCancelAction = () => {
    setSelectedProduct(null);
  };

  return (
    <DashboardLayout>
      <>
        <div className="bg-[#EAEAEA] rounded-[13px] min-h-[250px] py-6 px-8">
          <div className="flex items-center gap-x-8">
            <div className="flex items-center gap-x-3 h-fit">
              <Icons.Product stroke="#242424" size="24px" />
              <p className="font-semibold">Products</p>
            </div>

            <SearchBar
              searchResults={searchResults}
              searchKeys={["sku", "name"]}
              placeholder="Search for products"
              onSearch={handleSearch}
              onItemClick={handleSelectProduct}
            />
          </div>

          {selectedProduct && (
            <ProductForm
              selectedProduct={selectedProduct}
              handleSubmit={handleSubmit}
              getValues={getValues}
              register={register}
              onPriceBandSelect={handleSelectPriceBand}
              priceBands={priceBands}
              selectedPriceBand={selectedPriceBand}
              isSavedSuccessfully={isSavedSuccessfully}
              onSurfaceSelect={handleSelectSurface}
              selectedSurface={selectedSurface}
              handleSaveProduct={handleSaveProduct}
              categories={categories}
              selectedCategory={selectedCategoryGUID}
              onSelectCategory={handleSelectCategory}
              suppliers={suppliers}
              selectedSupplier={selectedManufacturerGUID}
              onSelectSupplier={handleSelectManufacturer}
              onImageChange={handleImageChange}
              imagePreview={imagePreview}
              onCancelAction={handleCancelAction}
            />
          )}
        </div>

        <table className="w-full mt-12">
          <thead>
            <tr className="border-b-[1.5px] border-b-[#BEBEBE]">
              <td></td>

              <td className="p-2">
                <b>SKU</b>
              </td>
              <td className="p-2">
                <b>Supplier</b>
              </td>
              <td className="p-2">
                <b>Category</b>
              </td>
              <td className="p-2">
                <b>Product Name</b>
              </td>
              <td className="p-2">
                <b>Description</b>
              </td>
              <td className="p-2">
                <b>Grade</b>
              </td>
            </tr>
          </thead>

          <tbody>
            {chunkedProducts[currentPage - 1]?.map((product, index) => (
              <tr
                key={product.sku}
                className={`border-b border-b-[#BEBEBE] ${
                  index % 2 === 0 ? "bg-[#F2F2F2]" : ""
                }`}
              >
                <td
                  className="pl-8 pr-2 py-2 cursor-pointer"
                  onClick={() => handleRemoveProduct(product.guid)}
                >
                  <Icons.Bin />
                </td>

                <td className="p-2 w-[115px]">
                  <p>{product.sku}</p>
                </td>
                <td className="p-2 w-[255px]">
                  <p>{product?.supplier?.name}</p>
                </td>
                <td className="p-2 w-[135px]">
                  <p>{product?.category?.name}</p>
                </td>
                <td className="p-2 w-[140px]">
                  <p>{product.name}</p>
                </td>
                <td className="p-2 w-[300px]">
                  <p>{product.description}</p>
                </td>
                <td className="p-2 min-w-[300px]">
                  <div className="flex my-2 pr-8 justify-between items-center">
                    <span>
                      {product.price_band
                        ? `Grade ${product.price_band?.band}`
                        : ""}
                    </span>

                    <Button onClick={() => handleSelectProduct(product)}>
                      View
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      </>
    </DashboardLayout>
  );
};

export default withAuth(observer(Products));
