import Link from "next/link";
import Image from "next/image";

import { useStores } from "@/hooks/useStores";

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const { authStore } = useStores();

  return (
    <>
      <header className="bg-[#6D21C7]">
        <div className="max-w-[1370px] mx-auto px-4 py-2">
          <div className="flex justify-between items-center">
            <Link href="/dashboard" className="text-white font-bold text-2xl">
              <Image
                src="/icons/logo.svg"
                alt="logo"
                width={80}
                height={45}
              />
            </Link>

            <button className="text-white" onClick={() => authStore.logout()}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main>
        <section>{children}</section>
      </main>
    </>
  );
};

export default DashboardLayout;
