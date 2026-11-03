import { mainStore } from "@/store";

const stores = {
  ...mainStore.stores,
};

export const useStores = () => stores;
