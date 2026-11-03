import Link from "next/link";
import { observer } from "mobx-react-lite";

import withAuth from "@/hoc/withAuth";
import { useStores } from "@/hooks/useStores";
import DashboardLayout from "@/components/DashboardLayout";
import Button from "@/components/Button";
import { Icon } from "@/components/Icon";
import { useRouter } from "next/router";

const ProfilePage = () => {
  const router = useRouter();

  const { authStore } = useStores();
  const user = authStore.getUser;

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] mx-auto px-4 py-3">
        <nav className="flex justify-between gap-x-4 mt-12">
          <Button
            onClick={() => router.back()}
            icon={
              <Icon
                src="/icons/left-arrow.svg"
                alt="left arrow icon"
                size={22}
              />
            }
          >
            Go Back
          </Button>

          <div className="flex gap-x-4 items-center">
            <Link
              href="/dashboard"
              className="bg-[#6D20C7]/20 px-5 py-3 text-white rounded-[4px]"
            >
              Home
            </Link>

            <Link
              href="/process-claim"
              className="bg-[#6D20C7] px-5 py-3 text-white rounded-[4px]"
            >
              Profile
            </Link>
          </div>
        </nav>

        <h1 className="font-bold text-xl mt-8">Profile</h1>

        <div className="mt-4 p-4 bg-[#EAEAEA] grid grid-cols-2 gap-6 max-w-[800px] rounded-[11px]">
          {user?.name && user.name.trim() && (
            <DataEntry title="Name" value={user.name} />
          )}
          {user?.email && <DataEntry title="Email" value={user.email} />}
          {user?.phone && <DataEntry title="Phone" value={user.phone} />}
          {user?.mobile && <DataEntry title="Mobile" value={user?.mobile} />}
          {user?.type && <DataEntry title="Type" value={user?.type} />}
          <DataEntry
            title="Is Primary"
            value={user?.is_primary_contact ? "Yes" : "No"}
          />
          {user?.company && (
            <DataEntry title="Company" value={user?.company?.name} />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

function DataEntry({ title, value }: { title: string; value?: string }) {
  return (
    <div>
      <h3 className="font-semibold text-lg ml-2 mb-2">{title}</h3>
      <p className="bg-white rounded-[11px] px-4 py-3">{value}</p>
    </div>
  );
}

export default observer(withAuth(ProfilePage));
