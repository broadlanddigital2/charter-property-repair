import React from "react";
import { useRouter } from "next/router";

import DashboardLayout from "@/components/DashboardLayout";
import Button from "@/components/Button";

const OrderStatus = () => {
  const router = useRouter();
  const { order } = router.query;

  return (
    <DashboardLayout>
      <div className="max-w-[1370px] mx-auto px-4 py-3">
        <div className="bg-[#6D21C7] p-6 mt-14">
          <h1 className="text-xl text-white pb-6">
            Success! Order with id <b>{order}</b> was created.
          </h1>

          <Button
            onClick={() => router.push('/dashboard')}
            variant="ghost"
          >
            Return to dashboard
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default OrderStatus;
