import clsx from "clsx";
import { toast } from "react-toastify";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { yupResolver } from "@hookform/resolvers/yup";

import Button from "@/components/Button";
import { Icons } from "@/components/Icons";
import SearchBar from "@/components/SearchBar";
import {
  activateUser,
  createCompanyContact,
  getCompanies,
  updateCompanyContact,
} from "@/services/requestService";
import DashboardLayout from "@/components/DashboardLayout";
import { Icon } from "@/components/Icon";
import { useStores } from "@/hooks/useStores";
import { TCompany, TCompanyContact } from "@/types/api";
import UserForm from "./UserForm";
import { errorLogger } from "@/services/axiosService";
import { chunkArray } from "@/utils/common";
import Pagination from "@/components/Pagination";
import {
  userCreateFormSchema,
  userUpdateFormSchema,
} from "@/validators/schemas";
import withAuth from "@/hoc/withAuth";

export type TUserFormData = {
  userData: Partial<
    Pick<TCompanyContact, "name" | "email" | "mobile" | "phone"> & { password?: string }
  >;
};

const UsersPage = () => {
  const { loaderStore } = useStores();

  const [companies, setCompanies] = useState<TCompany[]>([]);
  const [companiesContacts, setCompaniesContacts] = useState<TCompanyContact[]>(
    []
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [chunkedContacts, setChunkedContacts] = useState<TCompanyContact[][]>(
    []
  );
  const [selectedContact, setSelectedContact] = useState<
    TCompanyContact | undefined
  >();
  const [isCreatingNewUser, setIsCreatingNewUser] = useState(false);
  const [searchResults, setSearchResults] = useState<TCompanyContact[]>([]);
  const [isSavedSuccessfully, setIsSavedSuccessfully] = useState(false);
  const [searchFilterValue, setSearchFilter] = useState("");
  const [totalPages, setTotalPages] = useState(0);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<TUserFormData>({
    mode: "onBlur",
    resolver: yupResolver(
      isCreatingNewUser ? userCreateFormSchema : userUpdateFormSchema
    ),
  });

  useEffect(() => {
    (async () => {
      try {
        loaderStore.setLoading(true);
        await handleGetCompaniesAndContacts();
      } catch (error) {
        errorLogger(error, "Failed to retrieve company data");
      } finally {
        loaderStore.setLoading(false);
      }
    })();
  }, []);

  async function handleGetCompaniesAndContacts() {
    const { companies } = await getCompanies();

    setCompanies(companies);

    const filteredCompaniesWithContacts = companies.filter(
      (company) => company.contacts?.length > 0
    );

    let filteredCompaniesContacts: TCompanyContact[] = [];

    filteredCompaniesWithContacts.forEach((company) => {
      company.contacts.forEach((contact) => {
        filteredCompaniesContacts.push({ ...contact, company_name: company.name });
      });
    });

    setCompaniesContacts(filteredCompaniesContacts);
    setTotalPages(Math.ceil(filteredCompaniesContacts.length / 10));
    const contactsChunks = chunkArray(filteredCompaniesContacts, 10);
    setChunkedContacts(contactsChunks);
  }

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const handleSearch = (value: string) => {
    if (value === "") {
      setSearchResults([]);
      return;
    }

    const searchValueLowerCase = value.toLowerCase();
    const foundUsers = companiesContacts.filter((contact) =>
      [contact?.name, contact?.email, contact?.company_name, contact?.phone, contact?.mobile]
        .some((field) => field?.toLowerCase()?.includes(searchValueLowerCase))
    );

    setSearchResults(foundUsers.slice(0, 50));
  };

  const handleSearchWithFilter = (value: string) => {
    setSearchFilter(value);

    const searchValueLowerCase = value.toLowerCase();
    const foundUsers = companiesContacts.filter(
      (contact) =>
        contact?.email?.toLowerCase()?.includes(searchValueLowerCase) ||
        contact?.name?.toLowerCase()?.includes(searchValueLowerCase)
    );

    const contactsChunks = chunkArray(foundUsers, 10);
    setTotalPages(Math.ceil(foundUsers.length / 10));
    setCurrentPage(1);
    setChunkedContacts(contactsChunks);
  };

  const handleSelectUser = async (contact: TCompanyContact) => {
    setIsCreatingNewUser(false);
    setIsSavedSuccessfully(false);
    setSearchResults([]);
    setSelectedContact(contact);
    setValue(
      "userData",
      {
        email: contact.email,
        name: contact.name,
        mobile: contact.mobile,
        phone: contact.phone,
      },
      { shouldValidate: true }
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleUpdateUser = async (
    data: TUserFormData & {
      userData: Pick<TCompanyContact, "is_primary_contact" | "type">;
    } & {
      userData: { contact_guid: string };
    }
  ) => {
    try {
      loaderStore.setLoading(true);
      await updateCompanyContact(data.userData);
      await handleGetCompaniesAndContacts();
      setIsSavedSuccessfully(true);
      toast.success("Successfully updated");
    } catch (error) {
      errorLogger(error, "Failed to update user data");
    } finally {
      loaderStore.setLoading(false);
    }
  };

  const toggleUserActivationStatus = async (userGUID: string) => {
    try {
      loaderStore.setLoading(true);

      const isActive = selectedContact?.active;

      if (isActive) {
        // deactivate by changing active value
        const { contact } = await updateCompanyContact({
          contact_guid: userGUID,
          active: 0,
        });
        await handleGetCompaniesAndContacts();

        setSelectedContact(contact);

        toast.success("Account was deactivated successfully");
      } else {
        // send activation email
        await activateUser(selectedContact?.email || "");

        setSelectedContact((prevState) => {
          if (prevState) {
            return { ...prevState, active: 1 };
          }
        });

        toast.success("Email with confirmation was sent successfully");
      }
    } catch (error) {
      errorLogger(error);
    } finally {
      loaderStore.setLoading(false);
    }
  };

  const handleStartCreatingNewUser = () => {
    setSelectedContact(undefined);
    reset();
    setIsCreatingNewUser(true);
  };

  const handleCreateUser = async (
    data: TUserFormData & {
      userData: Pick<TCompanyContact, "is_primary_contact" | "type">;
    } & {
      userData: {
        company_guid: string;
        service_mate_uuid: string;
      };
    }
  ) => {
    if (!data.userData.company_guid) {
      toast.error("Contact's Company must be selected");
      return;
    }

    try {
      loaderStore.setLoading(true);
      await createCompanyContact(data);
      await handleGetCompaniesAndContacts();

      toast.success("User was created");
      setIsCreatingNewUser(false);
    } catch (error) {
      errorLogger(error, "Failed to create user");
    } finally {
      loaderStore.setLoading(false);
    }
  };

  const handleCancelAction = () => {
    setSelectedContact(undefined);
    setIsCreatingNewUser(false);
  };

  return (
    <DashboardLayout>
      <div>
        <div className="bg-[#EAEAEA] rounded-[13px] min-h-[250px] py-6 px-8">
          <div className="flex gap-x-8">
            <div className="flex items-center gap-x-3 h-fit">
              <Icons.User fill="#242424" size="32px" />
              <p className="font-semibold">Users</p>
            </div>

            <SearchBar
              searchResults={searchResults}
              searchKeys={["name"]}
              placeholder="Search name, email, company or phone"
              placeholderKey="email"
              onSearch={handleSearch}
              onItemClick={handleSelectUser}
              renderItem={(contact: TCompanyContact) => (
                <div className="flex flex-col gap-y-0.5">
                  <div className="flex items-center justify-between gap-x-3">
                    <span className="font-semibold text-gray-900">{contact.name || "No name"}</span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        Number(contact.active)
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {Number(contact.active) ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <span className="text-xs text-gray-600">{contact.email}</span>
                  <span className="text-xs text-gray-500">
                    {[
                      contact.company_name,
                      contact.type,
                      Number(contact.is_primary_contact) ? "Primary" : null,
                      contact.mobile || contact.phone,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </div>
              )}
            />

            {!isCreatingNewUser && (
              <div className="flex justify-end">
                <Button onClick={handleStartCreatingNewUser}>Create New</Button>
              </div>
            )}
          </div>

          {(selectedContact || isCreatingNewUser) && (
            <UserForm
              key={selectedContact?.guid}
              companies={companies}
              selectedContact={selectedContact}
              isSavedSuccessfully={isSavedSuccessfully}
              errors={errors}
              register={register}
              handleSubmit={handleSubmit}
              onSave={handleUpdateUser}
              onToggleActivationStatus={toggleUserActivationStatus}
              onCreate={handleCreateUser}
              onCancelAction={handleCancelAction}
            />
          )}
        </div>

        <div className="mt-12">
          <div className="relative flex items-center max-w-[350px] ml-auto">
            <input
              className="h-10 pr-4 pl-12 py-2 w-full border border-gray-400 rounded-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Search by name and email"
              value={searchFilterValue}
              onChange={(e) => handleSearchWithFilter(e.target.value)}
            />

            <Icon
              className="absolute transform -translate-y-1/2 left-3 top-1/2"
              src="/icons/search-regular.svg"
              alt="Search"
              size={22}
            />
          </div>

          {chunkedContacts.length > 0 ? (
            <>
              <table className="w-full mt-4">
                <thead>
                  <tr className="border-b-[1.5px] border-b-[#BEBEBE]">
                    <td className="p-2">
                      <b>Full Name</b>
                    </td>
                    <td className="p-2">
                      <b>Email</b>
                    </td>
                    <td className="p-2">
                      <b>Mobile No</b>
                    </td>
                    <td className="p-2">
                      <b>Phone</b>
                    </td>
                    <td className="p-2">
                      <b>Type</b>
                    </td>
                    <td className="p-2" colSpan={3}>
                      <b>Acc. Status</b>
                    </td>
                  </tr>
                </thead>

                <tbody>
                  {chunkedContacts[currentPage - 1]?.map((contact, index) => {
                    return (
                      <tr
                        key={contact.id}
                        className={clsx(
                          "border-b border-b-[#BEBEBE]",
                          index % 3 === 0 ? "bg-[#F2F2F2]" : "bg-white"
                        )}
                      >
                        <td className="p-2 w-[400px]">
                          <p>{contact.name}</p>
                        </td>

                        <td className="p-2 w-[400px]">
                          <p>{contact.email}</p>
                        </td>
                        <td className="p-2 w-[200px]">
                          <p>{contact.mobile}</p>
                        </td>
                        <td className="p-2 w-[200px]">
                          <p>{contact.phone}</p>
                        </td>
                        <td className="p-2 w-[110px]">
                          <p>{contact.type}</p>
                        </td>
                        <td className="min-w-[300px] p-2">
                          <div className="flex pr-8 justify-between items-center">
                            <Icon
                              src={
                                contact.active
                                  ? "/icons/check-green-circle.svg"
                                  : "/icons/cross-red-circle.svg"
                              }
                              alt="status icon"
                            />

                            <Button onClick={() => handleSelectUser(contact)}>
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
          ) : (
            <>
              {!loaderStore.getLoading && (
                <div className="text-center mt-4">No users were found</div>
              )}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default withAuth(UsersPage);
