import { AuthStore } from "./authStore";
import { LoaderStore } from "./loaderStore";

export type StoresType = {
  authStore: AuthStore;
  loaderStore: LoaderStore;
};

export class MainStore {
  private _stores: StoresType = {
    authStore: new AuthStore(),
    loaderStore: new LoaderStore(),
  };

  get stores() {
    return this._stores;
  }
}

export const mainStore = new MainStore();
