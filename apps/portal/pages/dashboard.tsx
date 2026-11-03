import Link from "next/link";
import { observer } from "mobx-react-lite";
import Cookies from "js-cookie";

import withAuth from "@/hoc/withAuth";
import { Icons } from "@/components/Icons";
import { useStores } from "@/hooks/useStores";
import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { TJob } from "@/types/api";
import { CookiesEnum } from "@/enums/cookies";

const dashboardLinks = [
  {
    icon: Icons.User,
    text: "Profile",
    href: "/profile",
  },
  {
    icon: Icons.Clipboard,
    text: "Orders",
    href: "/orders",
  },
];

const Dashboard = () => {
  const { authStore } = useStores();
  const [jobsWithoutOrders, setJobsWithoutOrders] = useState<TJob[]>([]);

  // const hasTempOrder = Cookies.get(CookiesEnum.TempOrderId);
  const hasTempOrder = false;

  // Open claims = this company's jobs that have no order yet
  // (legacy build had this hardcoded to a single demo job).
  const user = authStore.getUser;
  useEffect(() => {
    if (!hasTempOrder) {
      setJobsWithoutOrders(
        (user?.company?.jobs || []).filter((job) => !job.orders || job.orders.length === 0)
      );
    }
  }, [user, hasTempOrder]);

  return (
    <DashboardLayout>
      <div className="max-w-[1370px] mx-auto px-4 py-3">
        <h2 className="mt-16">
          Welcome Back <b>{authStore.getUser?.name?.split(" ")?.[0]}</b>
        </h2>

        <h1 className="font-bold text-2xl mt-4">Charter Property Portal</h1>

        {jobsWithoutOrders &&
          jobsWithoutOrders?.length > 0 &&
          jobsWithoutOrders?.map((job) => (
            <div
              key={job.guid}
              className="bg-[#6D20C7] text-white rounded-[11px] flex justify-between mt-10 px-6 py-8"
            >
              <div className="flex items-center gap-x-6">
                <Icons.OnlineShop className="fill-white" size={62} />

                <div>
                  <p>Claim Ref {job.job_number || job.service_mate_uuid}</p>
                  <p>
                    <b>We need you to select your replacement products</b>
                  </p>
                </div>
              </div>

              <Link
                href={`/process-claim?job=${job.guid}`}
                className="bg-transparent border-2 border-white self-end rounded-[3px] py-2 px-4 duration-300 hover:bg-white hover:text-[#6D20C7]"
              >
                Process Claim
              </Link>
            </div>
          ))}

        <nav className="grid grid-cols-4 gap-x-6 mt-8">
          {dashboardLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="grid place-items-center group bg-[#6D20C7]/20 rounded-[11px] h-[250px] duration-300 hover:bg-[#6D20C7]"
            >
              <span className="flex flex-col items-center gap-y-3">
                <link.icon
                  className="fill-black stroke-black group-hover:fill-white group-hover:stroke-white"
                  size={72}
                />
                <span className="font-semibold text-lg group-hover:text-white">
                  {link.text}
                </span>
              </span>
            </Link>
          ))}
        </nav>
      </div>
    </DashboardLayout>
  );
};

export default withAuth(observer(Dashboard));
