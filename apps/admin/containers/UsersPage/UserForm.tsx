import { useMemo, useState } from "react";
import {
  FieldErrors,
  UseFormHandleSubmit,
  UseFormRegister,
} from "react-hook-form";

import Input from "@/components/Input";
import Button from "@/components/Button";
import { TUserFormData } from "./UsersPage";
import { Dropdown } from "@/components/Dropdown";
import { TCompany, TCompanyContact } from "@/types/api";

type Props = {
  selectedContact?: TCompanyContact;
  companies: TCompany[];
  isSavedSuccessfully: boolean;
  errors: FieldErrors<TUserFormData>;
  handleSubmit: UseFormHandleSubmit<TUserFormData, undefined>;
  register: UseFormRegister<TUserFormData>;
  onSave?: (
    data: TUserFormData & {
      userData: Pick<TCompanyContact, "is_primary_contact" | "type">;
    } & {
      userData: { contact_guid: string };
    }
  ) => Promise<void>;
  onToggleActivationStatus?: (userGUID: string) => Promise<void>;
  onCreate?: (
    data: TUserFormData & {
      userData: Pick<TCompanyContact, "is_primary_contact" | "type">;
    } & {
      userData: {
        company_guid: string;
        service_mate_uuid: string;
      };
    }
  ) => Promise<void>;
  onCancelAction: () => void;
  /** Pre-select this company when creating a user (e.g. from the Companies screen). */
  defaultCompanyGUID?: string;
};

const IS_PRIMARY_OPTIONS = [
  { label: "Yes", value: 1 },
  { label: "No", value: 0 },
];

const USER_TYPES = [
  // { label: "Admin", value: "ADMIN" },
  // { label: "Billing", value: "BILLING" },
  { label: "Job", value: "JOB" },
];

const UserForm = ({
  selectedContact,
  companies,
  isSavedSuccessfully,
  errors,
  register,
  handleSubmit,
  onSave,
  onToggleActivationStatus,
  onCreate,
  onCancelAction,
  defaultCompanyGUID,
}: Props) => {
  const [selectedIsPrimary, setSelectedIsPrimary] = useState(
    selectedContact?.is_primary_contact || 0
  );
  const [selectedType, setSelectedType] = useState(selectedContact?.type || "JOB");
  const [selectedCompanyGUID, setSelectedCompanyGUID] = useState(defaultCompanyGUID || "");

  const isEditingContact = !!selectedContact;

  const COMPANY_GUID_OPTIONS = useMemo(() => {
    return companies?.length > 0 && !isEditingContact
      ? companies
          .map((company) => ({
            label: company.name,
            value: company.guid,
          }))
          .sort((a, b) => a.label.localeCompare(b.label))
      : [];
  }, [companies]);

  const submit = (data: TUserFormData, event: any) => {
    const buttonClicked = event.nativeEvent.submitter.value as
      | "save"
      | "activationStatus"
      | "create";

    if (buttonClicked === "save") {
      if (onSave && isEditingContact) {
        onSave({
          userData: {
            ...data.userData,
            contact_guid: selectedContact.guid,
            is_primary_contact: selectedIsPrimary,
            type: selectedType,
          },
        });
      }
    } else if (buttonClicked === "activationStatus") {
      if (onToggleActivationStatus && isEditingContact) {
        onToggleActivationStatus(selectedContact.guid);
      }
    } else if (buttonClicked === "create") {
      if (onCreate && !isEditingContact) {
        onCreate({
          userData: {
            ...data.userData,
            is_primary_contact: selectedIsPrimary,
            type: selectedType,
            company_guid: selectedCompanyGUID,
            service_mate_uuid:
              companies.find((company) => company.guid === selectedCompanyGUID)
                ?.service_mate_uuid || "",
          },
        });
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(submit)}>
      <div className="max-w-[640px] grid grid-cols-2 gap-x-6">
        {!isEditingContact && (
          <Dropdown
            label="Contact's Company"
            options={COMPANY_GUID_OPTIONS}
            onSelect={(value) => setSelectedCompanyGUID(value as string)}
            placeholder="Select Contact's Company"
            selectedOption={selectedCompanyGUID}
          />
        )}
        <Input
          id="userData.name"
          label="Full Name"
          register={register}
          placeholder="Full Name"
          errors={errors}
        />
        <Input
          id="userData.email"
          type="email"
          label="Email"
          register={register}
          placeholder="Email"
          errors={errors}
        />
        <Input
          type="number"
          id="userData.phone"
          label="Phone"
          register={register}
          placeholder="Phone"
          errors={errors}
        />
        <Input
          type="number"
          id="userData.mobile"
          label="Mobile"
          register={register}
          placeholder="Mobile"
          errors={errors}
        />
        {/* Show password field only when creating a user */}
        {!isEditingContact && (
          <Input
            type="password"
            id="userData.password"
            label="Password"
            register={register}
            placeholder="Password"
            errors={errors}
          />
        )}
        <Dropdown
          label="Is primary?"
          options={IS_PRIMARY_OPTIONS}
          onSelect={(value) => setSelectedIsPrimary(value as number)}
          placeholder="Is primary?"
          selectedOption={selectedIsPrimary}
        />
        <Dropdown
          label="Type"
          options={USER_TYPES}
          onSelect={(value) => setSelectedType(value as string)}
          placeholder="Select type"
          selectedOption={selectedType}
        />
      </div>

      <div className="flex justify-end gap-x-4 mt-10">
        <Button variant="error" onClick={onCancelAction}>{`Cancel ${
          isEditingContact ? "update" : "creation"
        }`}</Button>
        {isEditingContact ? (
          <div className="flex gap-x-4">
            <Button
              type="submit"
              value="save"
              variant={isSavedSuccessfully ? "primary" : "secondary"}
            >
              Save
            </Button>
            {selectedContact.active ? (
              <Button type="submit" value="activationStatus" variant="error">
                Deactivate
              </Button>
            ) : (
              <Button type="submit" value="activationStatus">
                Activate
              </Button>
            )}
          </div>
        ) : (
          <Button type="submit" value="create">
            Create
          </Button>
        )}
      </div>
    </form>
  );
};

export default UserForm;
