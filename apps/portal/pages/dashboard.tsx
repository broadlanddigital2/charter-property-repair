import Link from "next/link";
import { observer } from "mobx-react-lite";

import withAuth from "@/hoc/withAuth";
import { useStores } from "@/hooks/useStores";
import DashboardLayout from "@/components/DashboardLayout";
import PageHeader from "@/components/PageHeader";
import { TJob } from "@/types/api";

const cleanAddress = (a?: string | null) => a?.replace(/\s*\n\s*/g, ", ").replace(/,\s*$/, "") || "";

/** Signed-in home: the user's claims, open ones first. */
const Dashboard = () => {
  const { authStore } = useStores();
  const user = authStore.getUser;
  const jobs = (user?.company?.jobs || []) as TJob[];
  const open = jobs.filter((j) => !j.orders?.length && !["Completed", "Unsuccessful"].includes(j.status ?? ""));
  const ordered = jobs.filter((j) => j.orders?.length);

  return (
    <DashboardLayout>
      <div className="max-w-[1280px] mx-auto px-4 py-8">
        <PageHeader
          eyebrow={`Hello ${user?.name?.split(" ")?.[0] ?? ""}`.trim()}
          title="Your claims"
          subtitle="Choose a claim to pick the replacement products for each room."
        />

        {open.length === 0 ? (
          <div className="rounded-xl bg-white shadow-sm p-8 text-center text-gray-600">
            You have no claims waiting for product choices right now.
          </div>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {open.map((job) => {
              const rooms = job.rooms ?? [];
              return (
                <li key={job.guid}>
                  <Link
                    href={`/claim?job=${job.guid}`}
                    className="group flex h-full flex-col rounded-xl bg-white p-5 shadow-sm ring-1 ring-transparent hover:ring-[#6D21C7] duration-150"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm text-gray-500">Claim</p>
                        <p className="text-lg font-bold">{job.job_number || "—"}</p>
                      </div>
                      <span className="rounded-full bg-[#6D21C7]/10 px-3 py-1 text-xs font-semibold text-[#6D21C7]">
                        Products needed
                      </span>
                    </div>
                    {cleanAddress(job.job_address) && <p className="mt-2 text-gray-700">{cleanAddress(job.job_address)}</p>}
                    {rooms.length > 0 && (
                      <p className="mt-3 text-sm text-gray-600">
                        {rooms.map((r) => (r.quantity > 1 ? `${r.name} × ${r.quantity}` : r.name)).join(" · ")}
                      </p>
                    )}
                    <span className="mt-4 self-start rounded-md bg-[#6D21C7] px-4 py-2 text-sm font-semibold text-white group-hover:bg-[#5a19a8]">
                      Choose products →
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {ordered.length > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-bold mb-3">Ordered</h2>
            <ul className="divide-y rounded-xl bg-white shadow-sm">
              {ordered.map((job) => (
                <li key={job.guid} className="flex flex-wrap items-center gap-3 px-5 py-4">
                  <span className="font-semibold">{job.job_number}</span>
                  <span className="text-gray-600 flex-1 min-w-[12rem]">{cleanAddress(job.job_address)}</span>
                  <Link href="/orders" className="text-sm underline">
                    View order
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
};

export default withAuth(observer(Dashboard));
