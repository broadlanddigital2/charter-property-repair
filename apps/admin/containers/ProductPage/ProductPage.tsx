import { toast } from "react-toastify";
import { useForm } from "react-hook-form";
import { observer } from "mobx-react-lite";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

import {
  getCategories,
  getPriceBands,
  getProduct,
  getProductsPage,
  getRooms,
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
  TRoom,
  TSupplier,
} from "@/types/api";
import { useStores } from "@/hooks/useStores";

import Button from "@/components/Button";
import DashboardLayout from "@/components/DashboardLayout";
import { Icons } from "@/components/Icons";
import ProductForm from "./ProductForm";
import SearchBar from "@/components/SearchBar";
import ProductImage from "@/components/ProductImage";
import Pagination from "@/components/Pagination";
import RoomBadges from "@/components/RoomBadges";
import ProductRooms from "./ProductRooms";
import withAuth from "@/hoc/withAuth";

const Products = () => {
  const { loaderStore } = useStores();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSurface, setSelectedSurface] = useState<Nullable<string>>();
  const [selectedCategoryGUID, setSelectedCategoryGUID] = useState<string>("");
  const [selectedManufacturerGUID, setSelectedManufacturerGUID] =
    useState<string>("");
  const [products, setProducts] = useState<Product[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [categories, setCategories] = useState<TCategory[]>([]);
  const [suppliers, setSuppliers] = useState<TSupplier[]>([]);
  const [priceBands, setPriceBands] = useState<TPriceBandsCategory[]>([]);
  const [selectedPriceBand, setSelectedPriceBand] = useState<string | undefined>();
  const [image, setImage] = useState<File>();
  const [imagePreview, setImagePreview] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSavedSuccessfully, setIsSavedSuccessfully] = useState(false);
  const [rooms, setRooms] = useState<TRoom[]>([]);
  const [roomFilter, setRoomFilter] = useState<string>("");
  const router = useRouter();

  // deep link from the Rooms screen: /products?room=kitchen
  useEffect(() => {
    if (!router.isReady) return;
    const q = router.query.room;
    if (typeof q === "string" && q !== roomFilter) {
      setRoomFilter(q);
      setCurrentPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, router.query.room]);

  const { register, handleSubmit, setValue, getValues, reset } = useForm<any>();

  const [selectedProduct, setSelectedProduct] =
    useState<Nullable<Product>>(null);

  const PER_PAGE = 10;
  const totalPages = Math.ceil(totalProducts / PER_PAGE);

  useEffect(() => {
    (async () => {
      try {
        loaderStore.setLoading(true);
        const [
          { categories },
          { suppliers },
          { price_bands: priceBandCategories },
          roomList,
        ] = await Promise.all([
          getCategories(),
          getSuppliers(),
          getPriceBands(),
          getRooms(),
        ]);
        setRooms(roomList);

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

  // the catalogue is large (30k+), so the list is loaded a page at a time
  const handleGetProducts = async (page = currentPage) => {
    const { products, total } = await getProductsPage({ page, perPage: PER_PAGE, room: roomFilter });
    setProducts(products);
    setTotalProducts(total);
  };

  useEffect(() => {
    (async () => {
      try {
        loaderStore.setLoading(true);
        await handleGetProducts(currentPage);
      } catch (error) {
        errorLogger(error, "Failed to load products");
      } finally {
        loaderStore.setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, roomFilter]);

  const handleRoomFilter = (slug: string) => {
    setRoomFilter(slug);
    setCurrentPage(1);
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
    // miscellaneous is stored as JSON (object); older data may be a JSON string
    const raw = product.miscellaneous as unknown;
    let productOptions: Record<string, any> = {};
    try {
      productOptions = (typeof raw === "string" ? JSON.parse(raw) : raw) || {};
    } catch {
      productOptions = {};
    }
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

  // deep link from the Categories screen: /products?product=<guid>
  useEffect(() => {
    if (!router.isReady) return;
    const guid = router.query.product;
    if (typeof guid !== "string" || selectedProduct?.guid === guid) return;
    (async () => {
      try {
        const product = await getProduct(guid);
        if (product) {
          handleSelectProduct(product);
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          toast.error("Product not found");
        }
      } catch (error) {
        errorLogger(error, "Failed to load product");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, router.query.product]);

  const handleSearch = async (value: string) => {
    if (value === "") {
      setSearchResults([]);
      return;
    }
    try {
      const { products: found } = await getProductsPage({ search: value, page: 1, perPage: 25 });
      setSearchResults(found);
    } catch (error) {
      errorLogger(error, "Search failed");
    }
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
        <div className="card border-0 shadow-sm p-4 mb-4">
          <div className="flex items-center gap-x-8">
            <div className="flex items-center gap-x-3 h-fit">
              <Icons.Product stroke="#242424" size="24px" />
              <p className="font-semibold">Products</p>
            </div>

            <SearchBar
              searchResults={searchResults}
              searchKeys={["sku", "name"]}
              placeholder="Search by product name or SKU"
              renderItem={(p: Product) => (
                <div className="d-flex align-items-center gap-2">
                  <div className="border rounded bg-body-tertiary overflow-hidden flex-shrink-0" style={{ width: 36, height: 36 }}>
                    <ProductImage src={p.image} iconSize="sm" />
                  </div>
                  <div className="text-truncate">
                    <div className="fw-semibold text-truncate">{p.name}</div>
                    <div className="small text-body-secondary">
                      {p.sku}
                      {p.supplier?.name ? ` · ${p.supplier.name}` : ""}
                    </div>
                  </div>
                </div>
              )}
              onSearch={handleSearch}
              onItemClick={handleSelectProduct}
            />
          </div>

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

        {selectedProduct && (
          <ProductRooms
            product={selectedProduct}
            onChange={(newRooms, manual) => {
              const patch = { rooms: newRooms, rooms_manual: manual ? 1 : 0 };
              setSelectedProduct((p) => (p ? { ...p, ...patch } : p));
              setProducts((list) => list.map((p) => (p.guid === selectedProduct.guid ? { ...p, ...patch } : p)));
            }}
          />
        )}

        <div className="d-flex flex-wrap gap-2 mb-3">
          {[{ slug: "", name: "All rooms", products: undefined as number | undefined }, ...rooms].map((r) => (
            <button
              key={r.slug || "all"}
              type="button"
              className={`btn btn-sm rounded-pill ${roomFilter === r.slug ? "btn-primary" : "btn-outline-secondary"}`}
              onClick={() => handleRoomFilter(r.slug)}
            >
              {r.name}
              {r.products !== undefined && (
                <span className="ms-1 opacity-75">{r.products.toLocaleString("en-GB")}</span>
              )}
            </button>
          ))}
          <button
            type="button"
            className={`btn btn-sm rounded-pill ${roomFilter === "none" ? "btn-warning" : "btn-outline-warning"}`}
            onClick={() => handleRoomFilter("none")}
          >
            No room
          </button>
        </div>

        <div className="card border-0 shadow-sm">
          <div className="card-header bg-body d-flex align-items-center">
            <span className="fw-semibold">Catalogue</span>
            <span className="ms-2 text-body-secondary small">
              {totalProducts > 0
                ? `${((currentPage - 1) * PER_PAGE + 1).toLocaleString("en-GB")}–${Math.min(currentPage * PER_PAGE, totalProducts).toLocaleString("en-GB")} of ${totalProducts.toLocaleString("en-GB")} products`
                : "No products"}
            </span>
          </div>
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: 72 }}></th>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Rooms</th>
                  <th>Grade</th>
                  <th className="text-end">Price</th>
                  <th style={{ width: 130 }}></th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr
                    key={product.guid}
                    className={selectedProduct?.guid === product.guid ? "table-active" : undefined}
                    style={{ cursor: "pointer" }}
                    onClick={() => handleSelectProduct(product)}
                  >
                    <td>
                      <div
                        className="border rounded bg-body-tertiary d-flex align-items-center justify-content-center overflow-hidden"
                        style={{ width: 52, height: 52 }}
                      >
                        <ProductImage src={product.image} />
                      </div>
                    </td>
                    <td style={{ maxWidth: 420 }}>
                      <div className="fw-semibold text-truncate" title={product.name}>
                        {product.name}
                      </div>
                      <div className="small text-body-secondary text-truncate">
                        {product.sku}
                        {product.supplier?.name ? ` · ${product.supplier.name}` : ""}
                      </div>
                    </td>
                    <td className="small">{product.category?.name ?? "—"}</td>
                    <td style={{ maxWidth: 220 }}>
                      <RoomBadges rooms={product.rooms} max={3} />
                    </td>
                    <td>
                      {product.price_band ? (
                        <span className="badge text-bg-primary">Grade {product.price_band.band}</span>
                      ) : (
                        <span className="text-body-tertiary small">—</span>
                      )}
                    </td>
                    <td className="text-end text-nowrap">
                      {product.price !== null && product.price !== undefined && product.price !== ""
                        ? `£${Number(product.price).toLocaleString("en-GB")}`
                        : <span className="text-body-tertiary small">—</span>}
                    </td>
                    <td className="text-end text-nowrap" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" type="button" onClick={() => handleSelectProduct(product)}>
                        View
                      </Button>
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost-danger ms-1"
                        title="Delete product"
                        onClick={() => {
                          if (window.confirm(`Delete "${product.name}"? This can't be undone.`)) {
                            handleRemoveProduct(product.guid);
                          }
                        }}
                      >
                        <Icons.Bin />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

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
