import Cookies from "js-cookie";
import Router from "next/router";
import { AxiosError } from "axios";
import { toast } from "react-toastify";
import { makeAutoObservable } from "mobx";

import { TUser } from "@/types/api";
import { CookiesEnum } from "@/enums/cookies";
import { getUser, logoutSession } from "@/services/requestService";
import { useStores } from "@/hooks/useStores";

export class AuthStore {
  private _isLoggedIn: boolean = false;

  public get isLoggedIn() {
    return this._isLoggedIn;
  }

  private _user: TUser | null = null;

  public get getUser() {
    return this._user;
  }

  constructor() {
    makeAutoObservable(this);
  }

  async fetchUser() {
    const { loaderStore } = useStores();

    try {
      loaderStore.setLoading(true);
      const userData = await getUser();
      this._user = userData;
      this._isLoggedIn = true;
    } catch (error) {
      if (error instanceof AxiosError) {
        toast.error(
          error.response?.data?.message || "Failed to fetch user data"
        );
      }

      this._isLoggedIn = false;
      this._user = null;

      console.error({ error });
    } finally {
      loaderStore.setLoading(false);
    }
  }

  initStore() {
    if (Cookies.get(CookiesEnum.AccessToken)) {
      this.fetchUser();
    } else {
      this._isLoggedIn = false;
      this._user = null;
    }
  }

  logout() {
    Cookies.remove(CookiesEnum.AccessToken);
    logoutSession();

    this._isLoggedIn = false;
    this._user = null;

    Router.push("/");
  }
}
