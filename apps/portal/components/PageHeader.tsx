import Link from "next/link";

type Props = {
  title: string;
  /** small chips above the title, e.g. ["Claim TEST-001", "Price band 2"] */
  chips?: React.ReactNode[];
  eyebrow?: React.ReactNode;
  subtitle?: React.ReactNode;
  back?: { href: string; label: string };
  actions?: React.ReactNode;
  /** right-hand panel inside the banner (e.g. a progress ring) */
  aside?: React.ReactNode;
};

/** Purple banner page header, shared by every customer page (matches the room banner). */
const PageHeader = ({ title, chips, eyebrow, subtitle, back, actions, aside }: Props) => (
  <div className="mb-6">
    {back && (
      <Link href={back.href} className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-[#6D21C7] mb-3">
        ← {back.label}
      </Link>
    )}
    <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#6D21C7] to-[#4B1590] text-white shadow-sm">
      <div className="flex flex-wrap items-center gap-6 p-6 md:p-8">
        <div className="min-w-0 flex-1">
          {chips && chips.filter(Boolean).length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2 text-xs">
              {chips.filter(Boolean).map((c, i) => (
                <span key={i} className="rounded-full bg-white/15 px-3 py-1">
                  {c}
                </span>
              ))}
            </div>
          )}
          {eyebrow && <p className="text-sm text-white/75">{eyebrow}</p>}
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-2 max-w-2xl text-white/85">{subtitle}</p>}
          {actions && <div className="mt-5 flex flex-wrap gap-3">{actions}</div>}
        </div>
        {aside}
      </div>
    </section>
  </div>
);

/** Button styles that read well on the purple banner */
export const bannerButton = "rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-[#6D21C7] hover:bg-white/90";
export const bannerButtonGhost =
  "rounded-md border border-white/50 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white hover:text-[#6D21C7]";

export default PageHeader;
