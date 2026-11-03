import Cookies from "js-cookie";
import Router from "next/router";
import { makeAutoObservable } from "mobx";

import { TUser } from "@/types/api";
import { CookiesEnum } from "@/enums/cookies";
import { getUser, logoutSession } from "@/services/requestService";
import { useStores } from "@/hooks/useStores";
import { errorLogger } from "@/services/axiosService";

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
    const { loaderStore, basketStore } = useStores();

    try {
      loaderStore.setLoading(true);
      const userData = await getUser();
      this._user = userData;
      this._isLoggedIn = true;
    } catch (error) {
      errorLogger(error, "Failed to fetch user");

      this._isLoggedIn = false;
      this._user = null;
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
    const { loaderStore, basketStore } = useStores();
    Cookies.remove(CookiesEnum.AccessToken);
    Cookies.remove(CookiesEnum.BasketGUID);
    logoutSession();

    this._isLoggedIn = false;
    this._user = null;
    basketStore.setBasket(null);

    Router.push("/");
  }
}
