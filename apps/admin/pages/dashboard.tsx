import Link from "next/link";
import { useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import {
  CBadge,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CListGroup,
  CListGroupItem,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CWidgetStatsF,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import {
  cilBasket,
  cilBuilding,
  cilCart,
  cilPeople,
  cilPlus,
  cilSitemap,
  cilSync,
  cilTruck,
  cilWarning,
} from "@coreui/icons";

import withAuth from "@/hoc/withAuth";
import { useStores } from "@/hooks/useStores";
import DashboardLayout from "@/components/DashboardLayout";
import { errorLogger } from "@/services/axiosService";
import { getDashboardStats } from "@/services/requestService";

type TStats = Awaited<ReturnType<typeof getDashboardStats>>;

const fmt = (n: number) => n.toLocaleString("en-GB");

const timeAgo = (iso?: string | null) => {
  if (!iso) return "—";
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
};

const duration = (a: string, b: string | null) => {
  if (!b) return "running…";
  const s = Math.round((new Date(b).getTime() - new Date(a).getTime()) / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
};

const QUICK_LINKS = [
  { href: "/companies", text: "Find a company & set its price band", icon: cilBuilding },
  { href: "/users", text: "Activate or add a user", icon: cilPeople },
  { href: "/products", text: "Edit products & price bands", icon: cilBasket },
  { href: "/categories", text: "Organise categories", icon: cilSitemap },
  { href: "/suppliers", text: "Manage suppliers", icon: cilTruck },
];

const Dashboard = () => {
  const { authStore } = useStores();
  const [stats, setStats] = useState<TStats | null>(null);

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .catch((e) => errorLogger(e, "Failed to load dashboard"));
  }, []);

  const firstName = authStore.getUser?.name?.split(" ")?.[0];
  const lastCustomers = stats?.syncRuns.find((r) => r.kind === "customers");
  const lastReporting = stats?.syncRuns.find((r) => r.kind === "reporting");

  const widgets = [
    { href: "/companies", title: "Companies", value: stats && fmt(stats.companies), icon: cilBuilding, color: "primary" },
    {
      href: "/users",
      title: "Users",
      value: stats && `${fmt(stats.activeContacts)} / ${fmt(stats.contacts)}`,
      sub: "active / total",
      icon: cilPeople,
      color: "info",
    },
    { href: "/products", title: "Products", value: stats && fmt(stats.products), icon: cilBasket, color: "warning" },
    { href: "/dashboard", title: "Orders", value: stats && fmt(stats.orders), sub: stats ? `${fmt(stats.openJobs)} open jobs` : undefined, icon: cilCart, color: "success" },
  ];

  return (
    <DashboardLayout>
      <div className="mb-4">
        <h2 className="h4 mb-1">Welcome back{firstName ? `, ${firstName}` : ""}</h2>
        <p className="text-body-secondary mb-0">Here&apos;s what&apos;s happening on the Charter Property portal.</p>
      </div>

      <CRow className="g-3 mb-4">
        {widgets.map((w) => (
          <CCol sm={6} xl={3} key={w.title}>
            <Link href={w.href} className="stat-link">
              <CWidgetStatsF
                className="shadow-sm border-0"
                color={w.color}
                icon={<CIcon icon={w.icon} height={24} />}
                title={w.sub ? `${w.title} · ${w.sub}` : w.title}
                value={w.value ?? "…"}
              />
            </Link>
          </CCol>
        ))}
      </CRow>

      <CRow className="g-3">
        <CCol lg={4}>
          <CCard className="border-0 shadow-sm h-100">
            <CCardHeader className="bg-body fw-semibold">Quick actions</CCardHeader>
            <CListGroup flush>
              {QUICK_LINKS.map((l) => (
                <CListGroupItem as={Link} href={l.href} key={l.href} className="d-flex align-items-center gap-2 py-3">
                  <CIcon icon={l.icon} className="text-primary" />
                  {l.text}
                  <CIcon icon={cilPlus} className="ms-auto text-body-tertiary" size="sm" />
                </CListGroupItem>
              ))}
            </CListGroup>
          </CCard>
        </CCol>

        <CCol lg={4}>
          <CCard className="border-0 shadow-sm h-100">
            <CCardHeader className="bg-body fw-semibold">Recent orders</CCardHeader>
            <CCardBody className="p-0">
              {stats && stats.recentOrders.length === 0 && (
                <p className="text-body-secondary p-3 mb-0">No orders yet.</p>
              )}
              <CListGroup flush>
                {stats?.recentOrders.map((o) => (
                  <CListGroupItem key={o.id} className="d-flex align-items-center py-3">
                    <div>
                      <div className="fw-semibold">{o.job?.company?.name ?? "Unknown company"}</div>
                      <div className="small text-body-secondary">
                        Job {o.job?.job_number ?? o.job?.service_mate_uuid?.slice(0, 8)} · {o.order_lines?.[0]?.count ?? 0} item(s)
                      </div>
                    </div>
                    <span className="ms-auto small text-body-secondary">{timeAgo(o.created_at)}</span>
                  </CListGroupItem>
                ))}
              </CListGroup>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol lg={4}>
          <CCard className="border-0 shadow-sm h-100">
            <CCardHeader className="bg-body fw-semibold d-flex align-items-center">
              <CIcon icon={cilSync} className="me-2 text-primary" />
              ServiceM8 sync
            </CCardHeader>
            <CCardBody>
              {[
                { label: "Customers & jobs", run: lastCustomers, every: "hourly" },
                { label: "Reporting feed", run: lastReporting, every: "nightly" },
              ].map(({ label, run, every }) => (
                <div key={label} className="d-flex align-items-center mb-3">
                  <div>
                    <div className="fw-semibold">{label}</div>
                    <div className="small text-body-secondary">
                      {run ? `${timeAgo(run.started_at)} · ${duration(run.started_at, run.finished_at)}` : "No runs yet"} · {every}
                    </div>
                  </div>
                  <CBadge
                    className="ms-auto"
                    color={!run ? "secondary" : run.ok === null ? "info" : run.ok ? "success" : "danger"}
                  >
                    {!run ? "—" : run.ok === null ? "Running" : run.ok ? "OK" : "Failed"}
                  </CBadge>
                </div>
              ))}

              {stats?.syncRuns.some((r) => r.ok === false) && (
                <div className="small text-danger d-flex gap-2">
                  <CIcon icon={cilWarning} />
                  <span>{stats.syncRuns.find((r) => r.ok === false)?.error?.slice(0, 140)}</span>
                </div>
              )}

              <CTable small className="mt-3 mb-0" responsive>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell className="small text-body-secondary">Run</CTableHeaderCell>
                    <CTableHeaderCell className="small text-body-secondary">When</CTableHeaderCell>
                    <CTableHeaderCell className="small text-body-secondary text-end">Status</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {stats?.syncRuns.map((r) => (
                    <CTableRow key={r.id}>
                      <CTableDataCell className="small text-capitalize">{r.kind}</CTableDataCell>
                      <CTableDataCell className="small">{timeAgo(r.started_at)}</CTableDataCell>
                      <CTableDataCell className="small text-end">
                        <CBadge color={r.ok === null ? "info" : r.ok ? "success" : "danger"} shape="rounded-pill">
                          {r.ok === null ? "running" : r.ok ? "ok" : "failed"}
                        </CBadge>
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </DashboardLayout>
  );
};

export default observer(withAuth(Dashboard));
