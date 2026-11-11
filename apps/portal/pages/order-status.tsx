import Link from "next/link";

import withAuth from "@/hoc/withAuth";
import DashboardLayout from "@/components/DashboardLayout";

/** Shown after an order is placed. */
const OrderStatus = () => (
  <DashboardLayout>
    <div className="max-w-[720px] mx-auto px-4 py-16">
      <div className="rounded-xl bg-white shadow-sm p-8 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#D1FADF] text-2xl text-[#027A48]" aria-hidden>
          ✓
        </div>
        <h1 className="mt-4 text-2xl font-bold">Thank you — your order has been placed</h1>
        <p className="mt-2 text-gray-600">
          We&apos;ve passed your choices to the team handling your claim. They&apos;ll be in touch about the next steps.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/orders" className="rounded-md bg-[#6D21C7] px-5 py-2.5 font-semibold text-white hover:bg-[#5a19a8]">
            View my orders
          </Link>
          <Link href="/dashboard" className="rounded-md border border-gray-300 px-5 py-2.5 font-semibold hover:border-[#6D21C7]">
            Back to my claims
          </Link>
        </div>
      </div>
    </div>
  </DashboardLayout>
);

export default withAuth(OrderStatus);
