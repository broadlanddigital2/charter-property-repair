import { makeAutoObservable } from "mobx";

import { TBasket } from "@/types/api";

export class BasketStore {
  private _basket: TBasket | null = null;

  public get getBasket() {
    return this._basket;
  }

  public get getBasketLines() {
    return this._basket?.basket_lines || [];
  }

  constructor() {
    makeAutoObservable(this);
  }

  setBasket(basketData: TBasket | null) {
    this._basket = basketData;
  }
}
