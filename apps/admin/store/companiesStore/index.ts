import { AxiosError } from "axios";
import { toast } from "react-toastify";
import { makeAutoObservable } from "mobx";

import { TCompany } from "@/types/api";
import { getCompanies } from "@/services/requestService";
import { useStores } from "@/hooks/useStores";

export class CompaniesStore {
  private _companies: TCompany[] = [];

  public get getCompanies() {
    return this._companies;
  }

  constructor() {
    makeAutoObservable(this);
  }

  async fetchCompanies() {
    if (this._companies.length === 0) {
      const { loaderStore } = useStores();

      try {
        loaderStore.setLoading(true);
        const companiesData = await getCompanies();
        this._companies = companiesData.companies;
      } catch (error) {
        if (error instanceof AxiosError) {
          toast.error(
            error.response?.data?.message || "Failed to retrieve companies data"
          );
        }
        
        console.error({ error });
      } finally {
        loaderStore.setLoading(false);
      }
    }
  }

  initStore() {
    this.fetchCompanies();
  }
}
