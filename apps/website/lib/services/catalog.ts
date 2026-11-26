// Every service: used for cards (homepage, hub, related services) and page links.
export type Group = "insurance" | "maintenance";

export type ServiceCard = {
  slug: string;
  name: string;
  group: Group;
  summary: string;
  image: string;
};

export const GROUP_LABEL: Record<Group, string> = {
  insurance: "Insurance repairs",
  maintenance: "Property maintenance",
};

export const SERVICES: ServiceCard[] = [
  { slug: "fire-smoke", name: "Fire & smoke damage", group: "insurance", image: "/assets/fire-smoke.webp",
    summary: "Repair and reinstatement for homes and business premises following fire or smoke damage." },
  { slug: "flood-water", name: "Flood & water damage", group: "insurance", image: "/assets/flood-water.webp",
    summary: "Restoring interiors and building fabric affected by flooding, leaks and water ingress." },
  { slug: "track-trace", name: "Track & trace", group: "insurance", image: "/assets/track-trace.svg",
    summary: "Locating hidden leaks and their source with minimal disruption, then making good the damage." },
  { slug: "storm-wind", name: "Storm & wind damage", group: "insurance", image: "/assets/storm-wind.webp",
    summary: "Coordinated building repairs following damage caused by storms and high winds." },
  { slug: "subsidence", name: "Building subsidence", group: "insurance", image: "/assets/subsidence.webp",
    summary: "Managed reinstatement works for properties affected by subsidence, working with your insurer." },
  { slug: "impact", name: "Impact damage", group: "insurance", image: "/assets/impact.webp",
    summary: "Repairing damaged building fabric following an insured impact." },
  { slug: "emergency", name: "Reactive emergency repairs", group: "insurance", image: "/assets/emergency.webp",
    summary: "Responsive repair support for insurance companies and their customers." },
  { slug: "reactive-maintenance", name: "Reactive maintenance", group: "maintenance", image: "/assets/reactive-maintenance.webp",
    summary: "Day-to-day property repairs for housing associations, coordinated through one point of contact." },
  { slug: "planned-maintenance", name: "Planned maintenance", group: "maintenance", image: "/assets/planned-maintenance.webp",
    summary: "Scheduled maintenance works to help housing associations care for their properties." },
  { slug: "capital-works", name: "Capital works", group: "maintenance", image: "/assets/capital-works.webp",
    summary: "Managed property improvement works for housing associations, bringing the required trades together." },
];

export const serviceUrl = (slug: string) => `/services/${slug}/`;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

export function cardHtml(s: ServiceCard): string {
  return (
    `<a class="service-card" data-category="${s.group}" data-service="${s.slug}" href="${serviceUrl(s.slug)}">` +
    `<img class="service-photo" src="${s.image}" alt="" loading="lazy" width="1000" height="667">` +
    `<span class="service-category">${GROUP_LABEL[s.group]}</span><h3>${esc(s.name)}</h3><p>${esc(s.summary)}</p>` +
    `<span class="service-link">Explore service <span aria-hidden="true">↗</span></span></a>`
  );
}
