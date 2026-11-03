import { AuthStore } from "./authStore";
import { LoaderStore } from "./loaderStore";
import { BasketStore } from "./basketStore";

export type StoresType = {
  authStore: AuthStore;
  loaderStore: LoaderStore;
  basketStore: BasketStore;
};

export class MainStore {
  private _stores: StoresType = {
    authStore: new AuthStore(),
    loaderStore: new LoaderStore(),
    basketStore: new BasketStore()
  };

  get stores() {
    return this._stores;
  }
}

export const mainStore = new MainStore();
