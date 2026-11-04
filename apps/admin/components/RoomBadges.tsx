import { TProductRoom } from "@/types/api";

// Ordered list of rooms (mirrors public.rooms) with a short label for badges.
export const ROOMS: { slug: string; name: string; short: string }[] = [
  { slug: "kitchen", name: "Kitchen", short: "Kitchen" },
  { slug: "utility", name: "Utility", short: "Utility" },
  { slug: "lounge", name: "Lounge", short: "Lounge" },
  { slug: "dining", name: "Dining", short: "Dining" },
  { slug: "study", name: "Study", short: "Study" },
  { slug: "bedroom", name: "Bedroom", short: "Bedroom" },
  { slug: "bathroom", name: "Bathroom", short: "Bath" },
  { slug: "ensuite", name: "Ensuite", short: "Ensuite" },
  { slug: "wc", name: "WC", short: "WC" },
  { slug: "other-reception", name: "Other reception room", short: "Reception" },
  { slug: "external", name: "External", short: "External" },
  { slug: "roof", name: "Roof", short: "Roof" },
];

const INTERNAL = ROOMS.slice(0, 10).map((r) => r.slug);

/** Compact room badges; "All internal rooms" collapses the common 10-room case. */
const RoomBadges = ({ rooms, max = 4 }: { rooms?: TProductRoom[]; max?: number }) => {
  if (!rooms || rooms.length === 0) {
    return <span className="badge text-bg-light text-body-tertiary fw-normal">No room</span>;
  }
  const slugs = rooms.map((r) => r.slug);
  const allInternal = INTERNAL.every((s) => slugs.includes(s));
  const items: string[] = allInternal
    ? ["All internal", ...ROOMS.filter((r) => !INTERNAL.includes(r.slug) && slugs.includes(r.slug)).map((r) => r.short)]
    : ROOMS.filter((r) => slugs.includes(r.slug)).map((r) => r.short);
  const shown = items.slice(0, max);
  const rest = items.length - shown.length;
  return (
    <span className="d-inline-flex flex-wrap gap-1" title={rooms.map((r) => r.name).join(", ")}>
      {shown.map((label) => (
        <span key={label} className="badge rounded-pill bg-info-subtle text-info-emphasis border border-info-subtle fw-medium">
          {label}
        </span>
      ))}
      {rest > 0 && <span className="badge rounded-pill text-bg-light fw-normal">+{rest}</span>}
    </span>
  );
};

export default RoomBadges;
