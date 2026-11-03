import clsx from "clsx";
import { useRouter } from "next/router";
import { observer } from "mobx-react-lite";

import { isActive } from "@/utils/common";
import { TCategoryTree } from "@/types/api";

type Props = {
  categoryTree?: TCategoryTree;
};

const Navigation = ({ categoryTree = [] }: Props) => {
  const router = useRouter();
  const { query } = router;

  const isOnHome = router.pathname === "/dashboard" || !query.job;
  const isSelectingCategory = isActive(query, "job") && !isActive(query, "category");
  const isSelectingProduct = isActive(query, "category") && !isActive(query, "basket");
  const isOnBasketPage = isActive(query, "category") && isActive(query, "basket");

  return (
    <nav className="flex gap-x-4 cursor-default">
      <div
        className={clsx("bg-[#6D20C7]/20 px-5 py-3 text-white rounded-[4px]", {
          ["!bg-[#6D20C7]"]: isOnHome,
        })}
      >
        Home
      </div>

      <div
        className={clsx("bg-[#6D20C7]/20 px-5 py-3 text-white rounded-[4px]", {
          ["!bg-[#6D20C7]"]: isSelectingCategory,
        })}
      >
        Category
      </div>

      <div
        className={clsx("bg-[#6D20C7]/20 px-5 py-3 text-white rounded-[4px]", {
          ["!bg-[#6D20C7]"]: isSelectingProduct,
        })}
      >
        Product
      </div>

      <div
        className={clsx("bg-[#6D20C7]/20 px-5 py-3 text-white rounded-[4px]", {
          ["!bg-[#6D20C7]"]: isOnBasketPage,
        })}
      >
        Basket
      </div>
    </nav>
  );
};

export default observer(Navigation);