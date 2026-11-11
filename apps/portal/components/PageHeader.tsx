import Link from "next/link";

type Props = {
  title: string;
  eyebrow?: React.ReactNode;
  subtitle?: React.ReactNode;
  back?: { href: string; label: string };
  actions?: React.ReactNode;
};

/** Consistent page title block: optional back link, small label, title, subtitle and actions. */
const PageHeader = ({ title, eyebrow, subtitle, back, actions }: Props) => (
  <div className="mb-6">
    {back && (
      <Link href={back.href} className="inline-block text-sm text-gray-600 hover:text-[#6D21C7] mb-3">
        ← {back.label}
      </Link>
    )}
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="text-sm text-gray-500">{eyebrow}</p>}
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-gray-600 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </div>
  </div>
);

export default PageHeader;
