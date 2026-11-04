import clsx from "clsx";
import { toast } from "react-toastify";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { useEffect, useState } from "react";

import {
  TCompany,
  TCompanyAddressData,
  TPriceBandsCategory,
} from "@/types/api";
import Button from "@/components/Button";
import { Icons } from "@/components/Icons";
import { useStores } from "@/hooks/useStores";
import SearchBar from "@/components/SearchBar";
import { errorLogger } from "@/services/axiosService";
import DashboardLayout from "@/components/DashboardLayout";
import {
  deleteCompany,
  getCompanies,
  getPriceBands,
  updateCompany,
} from "@/services/requestService";
import { chunkArray } from "@/utils/common";
import Pagination from "@/components/Pagination";
import withAuth from "@/hoc/withAuth";
import CompanyForm from "./CompanyForm";

export type TCompanyFormData = {
  companyData: Pick<
    TCompany,
    | "name"
    | "website"
    | "address"
    | "address_country"
    | "address_city"
    | "address_postcode"
    | "address_street"
    | "address_state"
  >;
};

const CompaniesPage = () => {
  const { loaderStore } = useStores();
  const [companies, setCompanies] = useState<TCompany[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [chunkedCompanies, setChunkedCompanies] = useState<TCompany[][]>([]);
  const [selectedCompany, setSelectedCompany] = useState<TCompany | null>(
    null
  );
  const [searchResults, setSearchResults] = useState<TCompany[]>([]);
  const [priceBands, setPriceBands] = useState<TPriceBandsCategory[]>([]);
  const [selectedPriceBand, setSelectedPriceBand] = useState<string | undefined>();
  const [isSavedSuccessfully, setIsSavedSuccessfully] = useState(false);

  const { register, handleSubmit, setValue, getValues, reset } =
    useForm<TCompanyFormData>();

  const totalPages =
    companies.length > 0 ? Math.ceil(companies.length / 10) : 0;

  useEffect(() => {
    (async () => {
      try {
        loaderStore.setLoading(true);
        const [priceBandsRes] = await Promise.all([
          getPriceBands(),
          handleGetCompanies(),
        ]);
        
        setPriceBands(priceBandsRes.price_bands);
      } catch (error) {
        errorLogger(error, "Failed to retrieve company data");
      } finally {
        loaderStore.setLoading(false);
      }
    })();
  }, []);

  async function handleGetCompanies() {
    const { companies } = await getCompanies();

    setCompanies(companies);
    setChunkedCompanies(chunkArray(companies, 10));
  }

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const handleSelectCompany = async (company: TCompany) => {
    setSelectedCompany(company);
    setIsSavedSuccessfully(false);
    reset();
    setValue("companyData", {
      name: company.name,
      website: company.website,
      address: company.address,
      address_city: company.address_city,
      address_country: company.address_country,
      address_postcode: company.address_postcode,
      address_street: company.address_street,
      address_state: company.address_state,
    });
    setSelectedPriceBand(company.price_bands?.guid);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleSearch = (value: string) => {
    if (value === "") {
      setSearchResults([]);
      return;
    }

    const searchValueLowerCase = value.toLowerCase();
    const foundCompanies = companies.filter((company) =>
      company?.name?.toLowerCase()?.includes(searchValueLowerCase)
    );

    setSearchResults(foundCompanies);
  };

  const handleSaveCompany = async (companyData: TCompanyFormData) => {
    try {
      loaderStore.setLoading(true);
      await updateCompany(selectedCompany!.guid, {
        ...companyData.companyData,
        price_band_guid: selectedPriceBand,
      });
      await handleGetCompanies();
      setIsSavedSuccessfully(true);
      toast.success("Successfully updated");
    } catch (error) {
      errorLogger(error, "Failed to update company data");
    } finally {
      loaderStore.setLoading(false);
    }
  };

  const handleRemoveCompany = async (companyGUID: string) => {
    try {
      loaderStore.setLoading(true);
      await deleteCompany(companyGUID);
      await handleGetCompanies();

      if (selectedCompany?.guid === companyGUID) {
        setSelectedCompany(null);
      }

      toast.success("Company was deleted");
    } catch (error) {
      errorLogger(error, "Failed to delete company");
    } finally {
      loaderStore.setLoading(false);
    }
  };

  // keep the selected company's details (incl. contacts) in step after a reload
  const selectedCompanyFresh = selectedCompany
    ? companies.find((c) => c.guid === selectedCompany.guid) || selectedCompany
    : null;
  const selectedContacts = [...(selectedCompanyFresh?.contacts || [])].sort(
    (a, b) =>
      Number(b.is_primary_contact) - Number(a.is_primary_contact) ||
      Number(b.active) - Number(a.active) ||
      (a.name || "").localeCompare(b.name || "")
  );

  const handleSelectPriceBand = (value: string) => {
    setSelectedPriceBand(value);
  };

  return (
    <DashboardLayout>
      <div>
        <div className="bg-[#EAEAEA] rounded-[13px] min-h-[250px] py-6 px-8">
          <div className="flex gap-x-8">
            <div className="flex items-center gap-x-3 h-fit">
              <Icons.Customers fill="#242424" size="32px" />
              <p className="font-semibold">Companies</p>
            </div>

            <SearchBar
              placeholder="Search for your company"
              searchKeys={["name"]}
              searchResults={searchResults}
              onItemClick={handleSelectCompany}
              onSearch={handleSearch}
            />
          </div>

          {selectedCompany && (
            <CompanyForm
              priceBands={priceBands}
              selectedPriceBand={selectedPriceBand}
              isSavedSuccessfully={isSavedSuccessfully}
              setAddress={(addressData: TCompanyAddressData) => {
                setValue("companyData", {
                  ...getValues("companyData"),
                  ...addressData,
                });
              }}
              onPriceBandSelect={handleSelectPriceBand}
              register={register}
              handleSubmit={handleSubmit}
              onSave={handleSaveCompany}
            />
          )}

          {selectedCompanyFresh && (
            <div className="mt-8 bg-white rounded-[13px] p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-x-3">
                  <Icons.User fill="#242424" size="24px" />
                  <p className="font-semibold">
                    Users at {selectedCompanyFresh.name}{" "}
                    <span className="font-normal text-gray-500">({selectedContacts.length})</span>
                  </p>
                </div>
                <Link
                  href={{ pathname: "/users", query: { new: 1, company: selectedCompanyFresh.guid } }}
                  className="text-sm font-medium text-[#6D20C7] hover:underline"
                >
                  + Add user
                </Link>
              </div>

              {selectedContacts.length === 0 ? (
                <p className="text-sm text-gray-500">No users are linked to this company yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-b-[#BEBEBE] text-left">
                      <th className="p-2">Name</th>
                      <th className="p-2">Email</th>
                      <th className="p-2">Type</th>
                      <th className="p-2">Phone</th>
                      <th className="p-2">Status</th>
                      <th className="p-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedContacts.map((contact) => (
                      <tr key={contact.guid} className="border-b border-b-[#EAEAEA]">
                        <td className="p-2">
                          {contact.name}
                          {Number(contact.is_primary_contact) ? (
                            <span className="ml-2 rounded-full bg-purple-100 px-2 py-0.5 text-[11px] text-purple-800">Primary</span>
                          ) : null}
                        </td>
                        <td className="p-2">{contact.email}</td>
                        <td className="p-2">{contact.type}</td>
                        <td className="p-2">{contact.mobile || contact.phone || "—"}</td>
                        <td className="p-2">
                          <span
                            className={clsx(
                              "rounded-full px-2 py-0.5 text-[11px] font-medium",
                              Number(contact.active) ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-600"
                            )}
                          >
                            {Number(contact.active) ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="p-2 text-right">
                          <Link
                            href={{ pathname: "/users", query: { contact: contact.guid } }}
                            className="text-[#6D20C7] hover:underline"
                          >
                            Manage
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {chunkedCompanies.length > 0 && (
          <>
            <table className="w-full mt-12">
              <thead>
                <tr className="border-b-[1.5px] border-b-[#BEBEBE]">
                  <td></td>

                  <td className="p-2">
                    <b>Name</b>
                  </td>
                  <td className="p-2">
                    <b>Address</b>
                  </td>
                  <td className="p-2">
                    <b>Users</b>
                  </td>
                  <td className="p-2" colSpan={3}>
                    <b>Website</b>
                  </td>
                </tr>
              </thead>

              <tbody>
                {chunkedCompanies[currentPage - 1]?.map((company, index) => {
                  return (
                    <tr
                      key={company.guid}
                      className={clsx(
                        "border-b border-b-[#BEBEBE]",
                        index % 3 === 0 ? "bg-[#F2F2F2]" : "bg-white"
                      )}
                    >
                      <td className="p-2 pl-8">
                        <Icons.Bin
                          className="cursor-pointer"
                          onClick={() => handleRemoveCompany(company.guid)}
                        />
                      </td>

                      <td className="p-2">
                        <p>{company.name}</p>
                      </td>
                      <td className="p-2 text-sm min-w-[200px] max-w-[350px]">
                        {[
                          company.address,
                          company.address_country,
                          company.address_city,
                          company.address_postcode,
                          company.address_street,
                          company.address_state,
                        ]
                          .filter((item) => !!item?.trim())
                          .join(", ")}
                      </td>
                      <td className="p-2 text-sm whitespace-nowrap">
                        {company.contacts?.length ? (
                          <span>
                            {company.contacts.length}
                            {company.contacts.some((c) => Number(c.active)) && (
                              <span className="ml-1 text-green-700">
                                ({company.contacts.filter((c) => Number(c.active)).length} active)
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="min-w-[400px] p-2">
                        <div className="flex pr-8 justify-between items-center">
                          <p>{company?.website}</p>

                          <Button onClick={() => handleSelectCompany(company)}>
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
      </div>
    </DashboardLayout>
  );
};

export default withAuth(CompaniesPage);
