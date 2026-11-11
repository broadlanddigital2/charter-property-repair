import clsx from "clsx";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/router";
import { observer } from "mobx-react-lite";
import {
  CAvatar,
  CContainer,
  CDropdown,
  CDropdownDivider,
  CDropdownHeader,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
  CFooter,
  CHeader,
  CHeaderNav,
  CHeaderToggler,
  CNavTitle,
  CSidebar,
  CSidebarBrand,
  CSidebarHeader,
  CSidebarNav,
  CSidebarToggler,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import {
  cilAccountLogout,
  cilBasket,
  cilClipboard,
  cilBuilding,
  cilHome,
  cilMenu,
  cilPeople,
  cilSitemap,
  cilSpeedometer,
  cilTruck,
} from "@coreui/icons";

import { useStores } from "@/hooks/useStores";

type TNavItem = { href: string; text: string; icon: string[] } | { section: string };

const NAV: TNavItem[] = [
  { href: "/dashboard", text: "Dashboard", icon: cilSpeedometer },
  { section: "Customers" },
  { href: "/companies", text: "Companies", icon: cilBuilding },
  { href: "/users", text: "Users", icon: cilPeople },
  { section: "Catalogue" },
  { href: "/claims", text: "Claims", icon: cilClipboard },
  { href: "/products", text: "Products", icon: cilBasket },
  { href: "/rooms", text: "Rooms", icon: cilHome },
  { href: "/categories", text: "Categories", icon: cilSitemap },
  { href: "/suppliers", text: "Suppliers", icon: cilTruck },
];

const initials = (name?: string) =>
  (name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const { authStore } = useStores();
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [narrow, setNarrow] = useState(false);
  const user = authStore.getUser;

  const current = NAV.find((n) => "href" in n && n.href === router.pathname) as
    | { text: string }
    | undefined;

  return (
    <div>
      <CSidebar
        className="border-end"
        colorScheme="dark"
        position="fixed"
        unfoldable={narrow}
        visible={sidebarVisible}
        onVisibleChange={(visible) => setSidebarVisible(visible)}
      >
        <CSidebarHeader className="border-bottom">
          <CSidebarBrand as={Link} href="/dashboard" className="text-decoration-none text-white">
            <span className="sidebar-brand-full sidebar-brand-text">Charter Property Repair</span>
            <span className="sidebar-brand-narrow sidebar-brand-text">CPR</span>
          </CSidebarBrand>
        </CSidebarHeader>

        <CSidebarNav>
          {NAV.map((item) =>
            "section" in item ? (
              <CNavTitle key={item.section}>{item.section}</CNavTitle>
            ) : (
              <li className="nav-item" key={item.href}>
                <Link href={item.href} className={clsx("nav-link", router.pathname === item.href && "active")}>
                  <CIcon icon={item.icon} customClassName="nav-icon" />
                  {item.text}
                </Link>
              </li>
            )
          )}
        </CSidebarNav>

        <div className="sidebar-footer border-top d-none d-lg-flex">
          <CSidebarToggler onClick={() => setNarrow(!narrow)} />
        </div>
      </CSidebar>

      <div className="wrapper d-flex flex-column min-vh-100 bg-body-tertiary">
        <CHeader position="sticky" className="mb-4 p-0">
          <CContainer fluid className="border-bottom px-4" style={{ minHeight: 64 }}>
            <CHeaderToggler
              onClick={() => setSidebarVisible(!sidebarVisible)}
              style={{ marginInlineStart: "-14px" }}
              aria-label="Toggle navigation"
            >
              <CIcon icon={cilMenu} size="lg" />
            </CHeaderToggler>

            <span className="fw-semibold fs-5 me-auto ms-2">{current?.text ?? "Admin"}</span>

            <CHeaderNav>
              <CDropdown variant="nav-item" placement="bottom-end">
                <CDropdownToggle className="py-0 pe-0 d-flex align-items-center gap-2" caret={false}>
                  <span className="d-none d-md-inline text-body-secondary small">{user?.name}</span>
                  <CAvatar color="primary" textColor="white" size="md">
                    {initials(user?.name)}
                  </CAvatar>
                </CDropdownToggle>
                <CDropdownMenu className="pt-0">
                  <CDropdownHeader className="bg-body-secondary fw-semibold">{user?.email}</CDropdownHeader>
                  <CDropdownDivider className="mt-0" />
                  <CDropdownItem as="button" type="button" onClick={() => authStore.logout()}>
                    <CIcon icon={cilAccountLogout} className="me-2" />
                    Sign out
                  </CDropdownItem>
                </CDropdownMenu>
              </CDropdown>
            </CHeaderNav>
          </CContainer>
        </CHeader>

        <div className="body flex-grow-1">
          <CContainer fluid className="px-4 pb-4">
            {children}
          </CContainer>
        </div>

        <CFooter className="px-4 small text-body-secondary">
          <span>Charter Property Repair · Admin</span>
          <span className="ms-auto">Broadland Digital</span>
        </CFooter>
      </div>
    </div>
  );
};

export default observer(DashboardLayout);
