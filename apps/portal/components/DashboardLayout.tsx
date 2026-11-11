import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { observer } from "mobx-react-lite";

import { useStores } from "@/hooks/useStores";

const NAV = [
  { href: "/dashboard", label: "My claims", match: ["/dashboard", "/claim", "/claim-room"] },
  { href: "/orders", label: "Orders", match: ["/orders", "/order-status"] },
  { href: "/profile", label: "Profile", match: ["/profile"] },
];

/** Shared shell for signed-in customer pages: header with navigation, light page background. */
const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const { authStore } = useStores();
  const { pathname } = useRouter();
  const user = authStore.getUser;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#F7F5FB] text-[#1F1A2B]">
      <header className="bg-[#6D21C7] text-white">
        <div className="max-w-[1280px] mx-auto px-4 h-16 flex items-center gap-6">
          <Link href="/dashboard" className="shrink-0" aria-label="Charter Property Repair – my claims">
            <Image src="/icons/logo.svg" alt="Charter Property Repair" width={72} height={40} />
          </Link>

          <nav aria-label="Main" className="flex items-center gap-1 overflow-x-auto">
            {NAV.map((n) => {
              const active = n.match.includes(pathname);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={active ? "page" : undefined}
                  className={`px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
                    active ? "bg-white/15" : "text-white/85 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-4 text-sm">
            {user?.name && <span className="hidden sm:inline text-white/85">{user.name}</span>}
            <button
              type="button"
              className="rounded-md border border-white/40 px-3 py-1.5 hover:bg-white hover:text-[#6D21C7] duration-150"
              onClick={() => authStore.logout()}
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t bg-white">
        <div className="max-w-[1280px] mx-auto px-4 py-4 text-xs text-gray-500">
          Charter Property Repair · Need help with your claim? Contact your claims handler.
        </div>
      </footer>
    </div>
  );
};

export default observer(DashboardLayout);
