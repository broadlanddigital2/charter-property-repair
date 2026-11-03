import withAuth from "@/hoc/withAuth";
import DashboardLayout from "@/components/DashboardLayout";
import Cookies from "js-cookie";

import { useStores } from "@/hooks/useStores";
import { observer } from "mobx-react-lite";
import { useEffect, useState } from "react";
import { TOrder } from "@/types/api";
import { CookiesEnum } from "@/enums/cookies";
import { getOrderData } from "@/services/requestService";
import { errorLogger } from "@/services/axiosService";
import OrderLine from "./OrderLine";
import Button from "@/components/Button";
import { Icon } from "@/components/Icon";
import { useRouter } from "next/router";

const OrdersPage = () => {
  const router = useRouter();

  const { authStore, loaderStore } = useStores();

  const [order, setOrder] = useState<TOrder | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      // const tempOrderGUID = Cookies.get(CookiesEnum.TempOrderId);
      const testOrderGUID = "b7f03eb3-a647-413f-b2a4-7e804792bdb9";

      if (testOrderGUID) {
        (async () => {
          try {
            loaderStore.setLoading(true);
            const { order: orderData } = await getOrderData(testOrderGUID);
            setOrder(orderData);
            console.log({ orderData });
          } catch (error) {
            errorLogger(error);
          } finally {
            loaderStore.setLoading(false);
          }
        })();
      }
    }
  }, []);

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] mx-auto px-4 py-3">
        <Button
          onClick={() => router.back()}
          icon={
            <Icon src="/icons/left-arrow.svg" alt="left arrow icon" size={22} />
          }
          className="mt-12"
        >
          Go Back
        </Button>

        <h2 className="mt-8">
          Welcome Back <b>{authStore.getUser?.name?.split(" ")?.[0]}</b>
        </h2>

        <h1 className="font-bold text-2xl mt-4">Charter Property Portal</h1>

        {order && (
          <>
            <div className="bg-[#EDEDED] p-6 mt-6">
              <h3 className="font-bold text-2xl">Order number: {order.guid}</h3>
              <h3 className="font-bold text-2xl mt-4">Claim number: 1234567</h3>
            </div>

            <div className="flex flex-col gap-y-8 mt-8">
              {order.order_lines &&
                order.order_lines.map((orderLine) => (
                  <OrderLine key={orderLine.guid} orderLine={orderLine} />
                ))}
            </div>
          </>
        )}

        <div className="bg-[#6D21C7] mt-12 p-6 flex justify-between items-center">
          <p className="text-white font-semibold text-lg">
            If you have any queries regarding your claim please open a support
            ticket
          </p>

          <button className="bg-transparent border-2 text-white border-white rounded-[3px] py-2 px-8 duration-300 hover:bg-white hover:text-[#6D20C7]">
            Contact Support
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default observer(withAuth(OrdersPage));
