# Charter Property Repairs — public website

Marketing site for the main domain. The customer portal (`apps/portal`) lives on its own
subdomain (e.g. `portal.`); "Customer portal" links go to `NEXT_PUBLIC_PORTAL_URL`
(defaults to the staging portal).

Static export (`next build` → `out/`) served by the `cpr-website-staging` Worker at
`charter-staging.broadlanddigital.co.uk`.

**Only the homepage is live.** Services, About us, Testimonials, Customer forms and Contact
exist in the original design but are not built yet; their links land on `404.html`, which
shows a "coming soon" page. To add one, create `pages/<name>.tsx` — no link changes needed.

Pages keep a `noindex,nofollow` robots tag until launch.

```sh
npm install
npm run dev
```
