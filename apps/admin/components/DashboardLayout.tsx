import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/router";
import { observer } from "mobx-react-lite";

import { Icon } from "./Icon";
import { useStores } from "@/hooks/useStores";

const dashboardLinks = [
  {
    icon: "/icons/home.svg",
    text: "Dashboard",
    href: "/dashboard",
  },
  {
    icon: "/icons/user.svg",
    text: "Users",
    href: "/users",
  },
  {
    icon: "/icons/clients.svg",
    text: "Companies",
    href: "/companies",
  },
  {
    icon: "/icons/product.svg",
    text: "Products",
    href: "/products",
  },
  {
    icon: "/icons/menu.svg",
    text: "Categories",
    href: "/categories",
  },
  {
    icon: "/icons/boxes.svg",
    text: "Suppliers",
    href: "/suppliers",
  },
  {
    icon: "/icons/logout.svg",
    text: "Logout",
    href: "/",
  },
];

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const { authStore } = useStores();

  return (
    <main className="grid grid-cols-[270px_1fr]">
      <aside className="w-full sticky top-0 h-[100dvh] bg-[#333B4E] text-white py-12">
        <nav>
          {dashboardLinks.map((link) => (
            <Link
              key={link.href}
              onClick={() => {
                if (link.text === "Logout") {
                  authStore.logout();
                }
              }}
              href={link.href}
              className={clsx(
                "flex gap-x-3 px-8 py-4 duration-300 hover:bg-[#3F4B63]",
                { ["bg-[#3F4B63]"]: router.pathname === link.href }
              )}
            >
              <Icon src={link.icon} alt={link.text} />
              <span>{link.text}</span>
            </Link>
          ))}
        </nav>
      </aside>

      <section className="bg-[#ECEDEF] w-full min-h-[100dvh] py-12 px-6">
        <div className="bg-white p-10">{children}</div>
      </section>
    </main>
  );
};

export default DashboardLayout;
