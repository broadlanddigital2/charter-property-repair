import { toast } from "react-toastify";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";

import { TSupplier } from "@/types/api";
import Button from "@/components/Button";
import { Icons } from "@/components/Icons";
import { chunkArray } from "@/utils/common";
import { useStores } from "@/hooks/useStores";
import { errorLogger } from "@/services/axiosService";
import DashboardLayout from "@/components/DashboardLayout";
import {
  getSuppliers,
  createSupplier,
  deleteSupplier,
  updateSupplier,
  uploadSupplierImage,
} from "@/services/requestService";
import SupplierForm from "./SuppliersForm";
import Pagination from "@/components/Pagination";
import SearchBar from "@/components/SearchBar";
import withAuth from "@/hoc/withAuth";

export type TSupplierFormData = {
  name: string;
};

const SuppliersPage = () => {
  const { loaderStore } = useStores();

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSupplier, setSelectedSupplier] = useState<TSupplier>();
  const [suppliers, setSuppliers] = useState<TSupplier[]>([]);
  const [isCreatingNewSupplier, setIsCreatingNewSupplier] = useState(false);
  const [searchResults, setSearchResults] = useState<TSupplier[]>([]);
  const [image, setImage] = useState<File>();
  const [imagePreview, setImagePreview] = useState("");
  const [isSavedSuccessfully, setIsSavedSuccessfully] = useState(false);

  const { register, handleSubmit, reset, setValue } =
    useForm<TSupplierFormData>();

  const chunkedSuppliers = chunkArray(suppliers, 10);

  const totalPages =
    suppliers?.length > 0 ? Math.ceil(suppliers.length / 10) : 0;

  useEffect(() => {
    (async () => {
      try {
        loaderStore.setLoading(true);
        await handleGetSuppliers();
      } catch (error) {
        errorLogger(error, "Failed to fetch suppliers");
      } finally {
        loaderStore.setLoading(false);
      }
    })();
  }, []);

  async function handleGetSuppliers() {
    const { suppliers } = await getSuppliers();
    setSuppliers(suppliers);
  }

  const handleStartCreatingSupplier = () => {
    setSelectedSupplier(undefined);
    handleFormReset();
    setIsCreatingNewSupplier(true);
  };

  const handleSelectSupplier = async (supplier: TSupplier) => {
    setIsCreatingNewSupplier(false);
    setIsSavedSuccessfully(false);
    setSelectedSupplier(supplier);
    handleFormReset();
    setValue("name", supplier.name);

    if (supplier.image) {
      setImagePreview(supplier.image);
    } else {
      setImagePreview("");
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
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

  const handleCreateSupplier = async (supplierData: TSupplierFormData) => {
    if (!supplierData.name) {
      toast.error("Supplier name should not be empty");
      return;
    }

    try {
      loaderStore.setLoading(true);

      const { supplier } = await createSupplier(supplierData);

      if (image) {
        const formData = new FormData();

        formData.append("supplier_guid", supplier.guid);
        formData.append("image", image);

        await uploadSupplierImage(formData);
      }

      await handleGetSuppliers();
      handleFormReset();
      toast.success("Successfully created");
    } catch (error) {
      errorLogger(error, "Failed to create supplier");
    } finally {
      loaderStore.setLoading(false);
    }
  };

  const handleSaveSupplier = async (supplierData: TSupplierFormData) => {
    if (!selectedSupplier?.guid) {
      toast.error("Supplier does not exist");
      return;
    }

    try {
      loaderStore.setLoading(true);

      if (image) {
        const formData = new FormData();

        formData.append("supplier_guid", selectedSupplier.guid);
        formData.append("image", image);

        await Promise.all([
          updateSupplier(selectedSupplier.guid, supplierData),
          uploadSupplierImage(formData),
        ]);

        await handleGetSuppliers();
        setIsSavedSuccessfully(true);
        toast.success("Successfully updated");
        return;
      }

      await updateSupplier(selectedSupplier.guid, supplierData);
      await handleGetSuppliers();
      setIsSavedSuccessfully(true);
      toast.success("Successfully updated");
    } catch (error) {
      errorLogger(error, "Failed to update supplier data");
    } finally {
      loaderStore.setLoading(false);
    }
  };

  const handleDeleteSupplier = async (supplierGUID: string) => {
    try {
      loaderStore.setLoading(true);

      await deleteSupplier(supplierGUID);
      await handleGetSuppliers();

      if (selectedSupplier?.guid === supplierGUID) {
        setSelectedSupplier(undefined);
      }

      toast.success("Successfully deleted");
    } catch (error) {
      errorLogger(error, "Failed to delete supplier");
    } finally {
      loaderStore.setLoading(false);
    }
  };

  const handleCancelAction = () => {
    setSelectedSupplier(undefined);
    setIsCreatingNewSupplier(false);
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
    const foundSuppliers = suppliers.filter((supplier) =>
    supplier?.name?.toLowerCase()?.includes(searchValueLowerCase)
    );

    setSearchResults(foundSuppliers);
  };

  return (
    <DashboardLayout>
      <div className="card border-0 shadow-sm p-4 mb-4">
        <div className="flex gap-x-8">
          <div className="flex items-center gap-x-3 h-fit">
            <Icons.Menu stroke="#242424" size="32px" />
            <h1 className="font-semibold">Suppliers</h1>
          </div>

          <SearchBar
            placeholder="Search for suppliers"
            searchKeys={["name"]}
            searchResults={searchResults}
            onItemClick={handleSelectSupplier}
            onSearch={handleSearch}
          />

          {!isCreatingNewSupplier && (
            <div className="flex justify-end">
              <Button onClick={handleStartCreatingSupplier}>
                Add Supplier
              </Button>
            </div>
          )}
        </div>

        {(selectedSupplier || isCreatingNewSupplier) && (
          <SupplierForm
            isCreatingNewSupplier={isCreatingNewSupplier}
            isSavedSuccessfully={isSavedSuccessfully}
            imagePreview={imagePreview}
            onImageChange={handleImageChange}
            register={register}
            handleSubmit={handleSubmit}
            onSave={handleSaveSupplier}
            onCreate={handleCreateSupplier}
            onCancelAction={handleCancelAction}
          />
        )}
      </div>

      {chunkedSuppliers?.length > 0 && (
        <>
          <table className="table table-hover align-middle mb-0 bg-white shadow-sm rounded overflow-hidden mt-4">
            <thead>
              <tr className="table-light">
                <td></td>

                <td className="p-2">
                  <b>Name</b>
                </td>
              </tr>
            </thead>

            <tbody>
              {chunkedSuppliers[currentPage - 1]?.map((supplier, index) => {
                return (
                  <tr
                    key={supplier.guid}
                    
                  >
                    <td className="p-2 pl-8">
                      <Icons.Bin
                        className="cursor-pointer"
                        onClick={() => handleDeleteSupplier(supplier.guid)}
                      />
                    </td>

                    <td className="min-w-[400px] p-2">
                      <div className="flex pr-8 justify-between items-center">
                        <p>{supplier.name}</p>

                        <Button size="sm" onClick={() => handleSelectSupplier(supplier)}>
                          View
                        </Button>
                      </div>
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

export default withAuth(SuppliersPage);
