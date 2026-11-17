// The customer portal lives on its own subdomain (e.g. portal.charterpropertyrepairs.co.uk).
// Until that's live, default to the staging portal.
export const PORTAL_URL = (
  process.env.NEXT_PUBLIC_PORTAL_URL || "https://insurance-staging.broadlanddigital.co.uk"
).replace(/\/$/, "");

// Point "Customer portal" links at the portal subdomain instead of the
// placeholder /customer-portal page.
export function withPortalLinks(html: string): string {
  return html.split('href="/customer-portal"').join(`href="${PORTAL_URL}/"`);
}

export const FONT_URL =
  "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap";
