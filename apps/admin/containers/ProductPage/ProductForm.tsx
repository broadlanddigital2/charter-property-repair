import Image from "next/image";
import { useMemo } from "react";
import {
  UseFormGetValues,
  UseFormHandleSubmit,
  UseFormRegister,
} from "react-hook-form";

import Input from "@/components/Input";
import Button from "@/components/Button";
import { Nullable } from "@/types/utils";
import Checkbox from "@/components/Checkbox";
import { Dropdown } from "@/components/Dropdown";
import {
  Product,
  TCategory,
  TPriceBandsCategory,
  TSupplier,
} from "@/types/api";
import { capitalizeFirstLetter } from "@/utils/common";

const surfaces = ["Wall", "Floor"];

type Props = {
  selectedProduct: Product;
  selectedPriceBand: Nullable<number | string>;
  isSavedSuccessfully: boolean;
  handleSubmit: UseFormHandleSubmit<any, undefined>;
  register?: UseFormRegister<any>;
  getValues: UseFormGetValues<any>;
  priceBands: TPriceBandsCategory[];
  onPriceBandSelect: (val: string) => void;
  selectedSurface: Nullable<string>;
  onSurfaceSelect: (val: string) => void;
  handleSaveProduct: (data: any) => void;
  categories: TCategory[];
  selectedCategory: string;
  onSelectCategory: (categoryGUID: string) => void;
  suppliers: TSupplier[];
  selectedSupplier: string;
  onSelectSupplier: (supplierGUID: string) => void;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  imagePreview: string;
  onCancelAction: () => void;
};

const ProductForm = ({
  selectedProduct,
  register,
  handleSubmit,
  getValues,
  onPriceBandSelect,
  priceBands,
  selectedPriceBand,
  isSavedSuccessfully,
  selectedSurface,
  onSurfaceSelect,
  handleSaveProduct,
  categories,
  selectedCategory,
  onSelectCategory,
  suppliers,
  selectedSupplier,
  onSelectSupplier,
  onImageChange,
  imagePreview,
  onCancelAction,
}: Props) => {
  const submit = (data: any) => {
    const { name, description, ...miscellaneous } = data.productData;

    const newData = {
      name,
      description,
      sku: selectedProduct.sku,
      miscellaneous: JSON.stringify({
        ...miscellaneous,
        wall: selectedSurface === "Wall" ? "✓" : "",
        floor: selectedSurface === "Floor" ? "✓" : "",
      }),
    };

    handleSaveProduct(newData);
  };

  const formValues = getValues()?.productData;

  const formValuesDataArray: any[] = useMemo(
    () =>
      Object.entries(formValues)
        .filter((el) => {
          return (
            el[0] !== "wall" &&
            el[0] !== "floor" &&
            el[0] !== "name" &&
            el[0] !== "description"
          );
        })
        .map((el) => ({ [el[0]]: [el[1]] })),
    [formValues]
  );

  const categoriesDropdownOptions = categories.map((category) => ({
    label: category.name,
    value: category.guid,
  }));

  const manufacturersDropdownOptions = suppliers.map((supplier) => ({
    label: supplier.name,
    value: supplier.guid,
  }));

  return (
    <form onSubmit={handleSubmit(submit)} className="mt-7">
      <Input
        id="productData.name"
        label="Name"
        register={register}
        placeholder="Product name"
        withoutTopMargin
      />

      <Input
        id="productData.description"
        label="Description"
        register={register}
        placeholder="Product description"
      />

      <div className="max-w-[1200px] grid gap-x-6 grid-cols-4 mb-7">
        {formValuesDataArray.map(
          (field: { [key: string]: string | number }) => {
            const key = Object.keys(field)[0];

            return (
              <Input
                key={key}
                type="text"
                id={`productData.${key}`}
                label={capitalizeFirstLetter(key)}
                register={register}
                placeholder={key}
              />
            );
          }
        )}
      </div>

      <div>
        <p className="ml-2 font-semibold">Price band</p>

        <div className="flex gap-x-12 bg-white p-4 mt-2 rounded-[13px]">
          {priceBands?.length > 0 && priceBands.map((priceBand) => (
            <Checkbox
              key={priceBand.guid}
              label={`Grade ${priceBand.band}`}
              name={`grade-${priceBand.guid}`}
              value={priceBand.guid}
              checked={selectedPriceBand === priceBand.guid}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                onPriceBandSelect(event.target.value);
              }}
            />
          ))}
        </div>
      </div>

      <div className="mt-6">
        <p className="ml-2 font-semibold">Surface type</p>

        <div className="flex gap-x-12 bg-white p-4 mt-2 rounded-[13px]">
          {surfaces.map((surface) => (
            <Checkbox
              key={surface}
              label={surface}
              name={surface}
              value={surface}
              checked={selectedSurface === surface}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                onSurfaceSelect(event.target.value);
              }}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-6">
        <Dropdown
          label="Category"
          options={categoriesDropdownOptions}
          onSelect={(val) => onSelectCategory(val as string)}
          placeholder="Select Category"
          selectedOption={selectedCategory}
        />

        <Dropdown
          label="Manufacturer"
          options={manufacturersDropdownOptions}
          onSelect={(val) => onSelectSupplier(val as string)}
          placeholder="Select Manufacturer"
          selectedOption={selectedSupplier}
        />
      </div>

      <div className="mt-7">
        <label htmlFor="image" className="ml-2 font-semibold">
          Product image
        </label>

        <input
          type="file"
          id="image"
          accept="image/*"
          onChange={onImageChange}
          className="block mt-3"
        />

        {imagePreview && (
          <div className="relative mt-3">
            <Image src={imagePreview} alt="Preview" width={350} height={270} />
          </div>
        )}
      </div>

      <div className="flex justify-end mt-10">
        <div className="flex gap-x-4">
          <Button type="button" variant="error" onClick={onCancelAction}>
            Cancel Update
          </Button>

          <Button
            type="submit"
            variant={isSavedSuccessfully ? "primary" : "secondary"}
          >
            Save
          </Button>
        </div>
      </div>
    </form>
  );
};

export default ProductForm;
