import { ChangeEvent, useEffect, useRef, useState } from "react";
import { UseFormHandleSubmit, UseFormRegister } from "react-hook-form";

import Input from "@/components/Input";
import Button from "@/components/Button";
import { Icon } from "@/components/Icon";
import Checkbox from "@/components/Checkbox";
import { TCompanyFormData } from "./CompaniesPage";
import { getAddresses } from "@/services/requestService";
import {
  TApiAddress,
  TCompanyAddressData,
  TPriceBandsCategory,
} from "@/types/api";

type Props = {
  priceBands: TPriceBandsCategory[];
  isSavedSuccessfully: boolean;
  selectedPriceBand: string | undefined;
  onPriceBandSelect: (val: string) => void;
  setAddress: (addressData: TCompanyAddressData) => void;
  register: UseFormRegister<TCompanyFormData>;
  handleSubmit: UseFormHandleSubmit<TCompanyFormData, undefined>;
  onSave: (data: TCompanyFormData) => Promise<void>;
};

const CompanyForm = ({
  priceBands,
  isSavedSuccessfully,
  selectedPriceBand,
  onPriceBandSelect,
  setAddress,
  register,
  handleSubmit,
  onSave,
}: Props) => {
  const [addressList, setAddressList] = useState<TApiAddress[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isFetchingAddresses, setIsFetchingAddresses] = useState(false);
  const [postcodeTimeout, setPostcodeTimeout] = useState<NodeJS.Timeout | null>(
    null
  );
  const [postcode, setPostcode] = useState("");

  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const closeDropdown = (event: MouseEvent) => {
    if (
      dropdownRef.current &&
      !dropdownRef.current.contains(event.target as Node)
    ) {
      setShowDropdown(false);
    }
  };

  useEffect(() => {
    document.addEventListener("click", closeDropdown);

    return () => {
      document.removeEventListener("click", closeDropdown);
    };
  }, []);

  const submit = (data: TCompanyFormData, event: any) => {
    const buttonClicked = event.nativeEvent.submitter.value as "save";

    if (buttonClicked === "save") {
      onSave(data);
    }
  };

  const fetchAddressList = async (postcode: string) => {
    try {
      setIsFetchingAddresses(true);

      const addresses = await getAddresses(postcode);

      setAddressList(addresses.result);
      setShowDropdown(true);
    } catch (error) {
      console.error({ error });
    } finally {
      setIsFetchingAddresses(false);
    }
  };

  const handlePostcodeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    setPostcode(value);

    if (postcodeTimeout) {
      clearTimeout(postcodeTimeout);
    }

    if (value === "") {
      setAddressList([]);
      setIsFetchingAddresses(false);
      setShowDropdown(false);
      return;
    }

    setPostcodeTimeout(
      setTimeout(() => {
        fetchAddressList(value);
      }, 1000)
    );
  };

  const addressDropdownOptions =
    addressList?.length > 0
      ? addressList.map((address) => ({
          label: [
            address.country,
            address.county,
            address.district, // city/town
            address.line_1,
            address.line_2,
            address.line_3,
          ]
            .filter((val) => val && !!val.trim())
            .join(", "),
          value: address,
        }))
      : [];

  const handleAddressSelect = (address: TApiAddress) => {
    setAddress({
      address_street: `${address.line_1} ${address.line_2} ${address.line_3}`,
      address_city: address.district || "",
      address_country: address.country || "",
      address_state: address.county || "",
      address_postcode: postcode,
    });

    setShowDropdown(false);
  };

  const renderAddressList = () => {
    return (
      !isFetchingAddresses &&
      showDropdown && (
        <div className="absolute z-20 max-h-[300px] overflow-y-auto overflow-x-hidden w-full py-2 mt-2 bg-gray-100 border rounded-[13px] border-gray-700">
          {addressDropdownOptions.map((option) => (
            <button
              type="button"
              key={JSON.stringify(option.value)}
              className="block w-full text-left py-2 px-4 text-black text-sm border-none outline-none cursor-pointer transition duration-200 ease-in-out hover:bg-gray-300"
              onClick={() => {
                handleAddressSelect(option.value);
                setShowDropdown(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )
    );
  };

  return (
    <form onSubmit={handleSubmit(submit)}>
      <div className="max-w-[640px]">
        <div className="grid grid-cols-2 gap-x-4">
          <Input
            id="companyData.name"
            register={register}
            label="Company Name"
            placeholder="Company Name"
          />
          <Input
            id="companyData.website"
            register={register}
            label="Website"
            placeholder="Website"
          />
          <Input
            id="companyData.address"
            register={register}
            label="Address"
            placeholder="Address"
          />
          <div style={{ position: "relative" }} ref={dropdownRef}>
            <Input
              id="companyData.address_postcode"
              value={postcode}
              label="Postcode"
              placeholder="Postcode"
              onChange={handlePostcodeChange}
              onFocus={() => {
                if (postcode.length > 0 && addressList.length > 0) {
                  setShowDropdown(true);
                }
              }}
            />

            {isFetchingAddresses && (
              <div
                style={{
                  position: "absolute",
                  right: "22px",
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              >
                <Icon src="/icons/spinner.svg" alt="spinner icon" size={28} />
              </div>
            )}

            {renderAddressList()}
          </div>
          <Input
            id="companyData.address_country"
            register={register}
            label="Country"
            placeholder="Country"
          />
          <Input
            id="companyData.address_city"
            register={register}
            label="City"
            placeholder="City"
          />
          <Input
            id="companyData.address_street"
            register={register}
            label="Street"
            placeholder="Street"
          />
          <Input
            id="companyData.address_state"
            register={register}
            label="State"
            placeholder="State"
          />
        </div>

        <div className="mt-6">
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
      </div>

      <div className="flex justify-end mt-10">
        <div className="flex gap-x-4">
          <Button type="submit" value="save" variant={isSavedSuccessfully ? "primary" : "secondary"}>
            Save
          </Button>
        </div>
      </div>
    </form>
  );
};

export default CompanyForm;
