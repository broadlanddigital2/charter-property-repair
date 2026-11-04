import Image from "next/image";
import { UseFormHandleSubmit, UseFormRegister } from "react-hook-form";

import Input from "@/components/Input";
import Button from "@/components/Button";
import { TSupplierFormData } from "./SuppliersPage";

type Props = {
  isCreatingNewSupplier: boolean;
  isSavedSuccessfully: boolean;
  imagePreview: string;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  register: UseFormRegister<TSupplierFormData>;
  handleSubmit: UseFormHandleSubmit<TSupplierFormData, undefined>;
  onSave: (data: TSupplierFormData) => Promise<void>;
  onCreate: (data: TSupplierFormData) => Promise<void>;
  onCancelAction: () => void;
};

const SupplierForm = ({
  isCreatingNewSupplier,
  isSavedSuccessfully,
  imagePreview,
  onImageChange,
  register,
  handleSubmit,
  onSave,
  onCreate,
  onCancelAction,
}: Props) => {
  const submit = (data: TSupplierFormData, event: any) => {
    const buttonClicked = event.nativeEvent.submitter.value as
      | "save"
      | "create";

    if (buttonClicked === "save") {
      onSave(data);
    } else if (buttonClicked === "create") {
      onCreate(data);
    }
  };

  return (
    <form onSubmit={handleSubmit(submit)}>
      <div className="max-w-[640px]">
        <div className="grid grid-cols-2 gap-x-4">
          <Input
            id="name"
            register={register}
            label="Supplier Name"
            placeholder="Supplier Name"
          />
        </div>
      </div>

      <div className="mt-7">
        <label htmlFor="image" className="fw-semibold small mb-1 d-block">
          Supplier image
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
          <Button type="button" variant="error" onClick={onCancelAction}>
            {`Cancel ${isCreatingNewSupplier ? "creation" : "update"}`}
          </Button>
          {isCreatingNewSupplier ? (
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

export default SupplierForm;
