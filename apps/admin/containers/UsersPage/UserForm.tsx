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
      userData: { contact_guid: string; company_guid?: string };
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
  { label: "Job", value: "JOB" },
  { label: "Billing", value: "BILLING" },
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
  const [selectedCompanyGUID, setSelectedCompanyGUID] = useState(
    selectedContact?.company_guid || defaultCompanyGUID || ""
  );

  const isEditingContact = !!selectedContact;

  const COMPANY_GUID_OPTIONS = useMemo(() => {
    return companies?.length > 0
      ? companies
          .map((company) => ({
            label: company.name,
            value: company.guid,
          }))
          .sort((a, b) => a.label.localeCompare(b.label))
      : [];
  }, [companies]);

  const company = companies.find((c) => c.guid === selectedCompanyGUID);
  const companyAddress = company
    ? [company.address_street || company.address, company.address_city, company.address_postcode]
        .filter(Boolean)
        .join(", ")
        .replace(/\s*\n\s*/g, ", ")
    : "";

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
            ...(selectedCompanyGUID && selectedCompanyGUID !== selectedContact.company_guid
              ? { company_guid: selectedCompanyGUID }
              : {}),
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
    <form onSubmit={handleSubmit(submit)} className="mt-4">
      {isEditingContact && (
        <div className="border rounded-3 bg-body-tertiary p-3 mb-4">
          <div className="d-flex flex-wrap align-items-center gap-2">
            <span className="fs-5 fw-semibold">{selectedContact.name || "No name"}</span>
            <span className={`badge ${Number(selectedContact.active) ? "text-bg-success" : "text-bg-secondary"}`}>
              {Number(selectedContact.active) ? "Active login" : "No active login"}
            </span>
            <span className="badge text-bg-light">{selectedContact.type}</span>
            {Number(selectedContact.is_primary_contact) ? (
              <span className="badge text-bg-info">Primary contact</span>
            ) : null}
          </div>
          <div className="row g-3 mt-1 small">
            <div className="col-sm-6 col-lg-4">
              <div className="text-body-secondary">Business</div>
              <div className="fw-semibold">{company?.name || selectedContact.company_name || "—"}</div>
              {companyAddress && <div className="text-body-secondary">{companyAddress}</div>}
            </div>
            <div className="col-sm-6 col-lg-4">
              <div className="text-body-secondary">Budget grade</div>
              <div className="fw-semibold">
                {company?.price_bands ? `Grade ${company.price_bands.band}` : "Not set"}
              </div>
              <div className="text-body-secondary">
                {company?.is_individual ? "Individual" : "Business"}
                {company ? ` · ${Number(company.active) ? "active" : "inactive"} customer` : ""}
              </div>
            </div>
            <div className="col-sm-6 col-lg-4">
              <div className="text-body-secondary">Contact</div>
              <div>{selectedContact.email || "—"}</div>
              <div>{[selectedContact.mobile, selectedContact.phone].filter(Boolean).join(" · ") || "—"}</div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-[640px] grid grid-cols-2 gap-x-6">
        <div className="col-span-2">
          <Dropdown
            label={isEditingContact ? "Company (change to move this user)" : "Contact's Company"}
            options={COMPANY_GUID_OPTIONS}
            onSelect={(value) => setSelectedCompanyGUID(value as string)}
            placeholder="Select Contact's Company"
            selectedOption={selectedCompanyGUID}
          />
        </div>
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
          type="tel"
          id="userData.phone"
          label="Phone"
          register={register}
          placeholder="Phone"
          errors={errors}
        />
        <Input
          type="tel"
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
          options={
            selectedContact?.type && !USER_TYPES.some((t) => t.value === selectedContact.type)
              ? [...USER_TYPES, { label: selectedContact.type, value: selectedContact.type }]
              : USER_TYPES
          }
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
