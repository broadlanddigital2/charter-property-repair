import { observer } from "mobx-react-lite";

import withAuth from "@/hoc/withAuth";
import DashboardLayout from "@/components/DashboardLayout";
import PageHeader from "@/components/PageHeader";
import { useStores } from "@/hooks/useStores";

/** The signed-in user's details. */
const ProfilePage = () => {
  const { authStore } = useStores();
  const user = authStore.getUser;
  const rows: [string, string | undefined | null][] = [
    ["Name", user?.name],
    ["Email", user?.email],
    ["Mobile", user?.mobile],
    ["Phone", user?.phone],
    ["Company", user?.company?.name],
  ];

  return (
    <DashboardLayout>
      <div className="max-w-[1280px] mx-auto px-4 py-8">
        <PageHeader title="Profile" subtitle="To change any of these details, contact your claims handler." />
        <dl className="max-w-[640px] divide-y rounded-xl bg-white shadow-sm">
          {rows
            .filter(([, v]) => v && String(v).trim())
            .map(([k, v]) => (
              <div key={k} className="grid grid-cols-[140px_1fr] gap-4 px-5 py-4">
                <dt className="text-sm text-gray-500">{k}</dt>
                <dd className="font-medium break-words">{v}</dd>
              </div>
            ))}
        </dl>
      </div>
    </DashboardLayout>
  );
};

export default withAuth(observer(ProfilePage));
