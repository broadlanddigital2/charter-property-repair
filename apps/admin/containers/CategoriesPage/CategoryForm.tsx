import Image from "next/image";
import { UseFormHandleSubmit, UseFormRegister } from "react-hook-form";

import Input from "@/components/Input";
import Button from "@/components/Button";
import { TCategory } from "@/types/api";
import { TCategoryFormData } from "./CategoriesPage";
import { Dropdown } from "@/components/Dropdown";

type Props = {
  categories: (TCategory & { parentId?: string })[];
  selectedCategory: TCategory | undefined;
  selectedParentCategoryGUID: string | undefined;
  isCreatingNewCategory: boolean;
  isSavedSuccessfully: boolean;
  imagePreview: string;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectParentCategoryGUID: (val: string) => void;
  register: UseFormRegister<TCategoryFormData>;
  handleSubmit: UseFormHandleSubmit<TCategoryFormData, undefined>;
  onSave: (data: TCategoryFormData) => Promise<void>;
  onCreate: (data: TCategoryFormData) => Promise<void>;
  onCancelAction: () => void;
};

const CategoryForm = ({
  categories,
  selectedCategory,
  selectedParentCategoryGUID,
  isCreatingNewCategory,
  isSavedSuccessfully,
  imagePreview,
  onImageChange,
  onSelectParentCategoryGUID,
  register,
  handleSubmit,
  onSave,
  onCreate,
  onCancelAction,
}: Props) => {
  const submit = (data: TCategoryFormData, event: any) => {
    const buttonClicked = event.nativeEvent.submitter.value as
      | "save"
      | "create";

    if (buttonClicked === "save") {
      onSave(data);
    } else if (buttonClicked === "create") {
      onCreate(data);
    }
  };

  const CATEGORY_PARENT_OPTIONS = categories
    .filter((category) => category.guid !== selectedCategory?.guid)
    .map((category) => ({ label: category.name, value: category.guid }));

  return (
    <form onSubmit={handleSubmit(submit)}>
      <div className="max-w-[640px]">
        <div className="grid grid-cols-2 gap-x-4">
          <Input
            id="name"
            register={register}
            label="Category Name"
            placeholder="Category Name"
          />

          <Dropdown
            label="Parent Category"
            options={CATEGORY_PARENT_OPTIONS}
            onSelect={(value) => onSelectParentCategoryGUID(value as string)}
            placeholder="Select Parent Category"
            selectedOption={selectedParentCategoryGUID}
          />
        </div>
      </div>

      <div className="mt-7">
        <label htmlFor="image" className="fw-semibold small mb-1 d-block">
          Category image
        </label>

        <input
          type="file"
          id="image"
          accept="image/*"
          onChange={onImageChange}
          className="form-control mt-1"
        />

        {imagePreview && (
          <div className="relative mt-3">
            <Image src={imagePreview} alt="Preview" width={350} height={270} />
          </div>
        )}
      </div>

      <div className="flex justify-end mt-10">
        <div className="flex gap-x-4">
          <Button
            type="button"
            variant="error"
            onClick={onCancelAction}
          >{`Cancel ${isCreatingNewCategory ? "creation" : "update"}`}</Button>
          {isCreatingNewCategory ? (
            <Button type="submit" value="create">
              Create
            </Button>
          ) : (
            <Button
              type="submit"
              value="save"
              variant={isSavedSuccessfully ? "primary" : "secondary"}
            >
              Save
            </Button>
          )}
        </div>
      </div>
    </form>
  );
};

export default CategoryForm;
