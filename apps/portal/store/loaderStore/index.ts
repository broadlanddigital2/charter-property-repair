import { makeAutoObservable } from "mobx";

export class LoaderStore {
  private _isLoading: boolean = false;

  public get getLoading() {
    return this._isLoading
  }

  constructor() {
    makeAutoObservable(this);
  }

  setLoading(value: boolean) {
    this._isLoading = value;
  }
}
