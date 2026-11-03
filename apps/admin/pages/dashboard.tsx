import Link from "next/link";
import { observer } from "mobx-react-lite";

import withAuth from "@/hoc/withAuth";
import { Icons } from "@/components/Icons";
import { useStores } from "@/hooks/useStores";
import DashboardLayout from "@/components/DashboardLayout";

const dashboardLinks = [
  {
    icon: Icons.User,
    text: "Users",
    href: "/users",
  },
  {
    icon: Icons.Customers,
    text: "Companies",
    href: "/companies",
  },
  {
    icon: Icons.Product,
    text: "Products",
    href: "/products",
  },
  {
    icon: Icons.Menu,
    text: "Categories",
    href: "/categories",
  },
  {
    icon: Icons.Boxes,
    text: "Suppliers",
    href: "/suppliers",
  },
];

const Dashboard = () => {
  const { authStore } = useStores();

  return (
    <DashboardLayout>
      <h2>
        Welcome Back <b>{authStore.getUser?.name?.split(" ")?.[0]}</b>
      </h2>

      <h1 className="font-bold text-lg mt-4">Charter Property Portal</h1>

      <nav className="grid grid-cols-4 gap-6 mt-8">
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
    </DashboardLayout>
  );
};

export default observer(withAuth(Dashboard));
