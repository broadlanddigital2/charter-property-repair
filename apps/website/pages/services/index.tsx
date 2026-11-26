import SitePage from "../../components/SitePage";
import { SERVICES, cardHtml } from "../../lib/services/catalog";

const insurance = SERVICES.filter((s) => s.group === "insurance").map(cardHtml).join("");
const maintenance = SERVICES.filter((s) => s.group === "maintenance").map(cardHtml).join("");

const MAIN =
  `<main id="main">` +
  `<section class="detail-hero"><img src="/assets/norfolk-home.webp" alt=""><div class="wrap">` +
  `<nav aria-label="Breadcrumb" class="crumbs"><a href="/">Home</a> / Services</nav>` +
  `<p class="eyebrow">Our services · Norfolk &amp; Norwich</p><h1>Insurance repairs &amp;<br>property maintenance</h1>` +
  `<p>Reinstatement after insured damage for homeowners and businesses, and maintenance for housing associations across East Anglia, all from one team.</p>` +
  `<div class="actions"><a class="btn" href="tel:01603944080">Call 01603 944 080</a><a class="btn secondary" href="/#enquiry-form">Send an enquiry ↗</a></div>` +
  `<div class="detail-trust">✓ One point of contact <span>✓ Directly employed trades</span><span>✓ Insurance approved</span></div></div></section>` +
  `<section class="repair-overview" aria-label="Who we help"><div class="wrap"><div class="overview-grid hub-overview">` +
  `<a class="overview-item" href="#insurance"><p class="eyebrow">Homeowners &amp; businesses</p><h2>Had damage to your property?</h2><p>Fire, flood, storm, subsidence and impact repairs managed with your insurer.</p></a>` +
  `<a class="overview-item" href="#insurance"><p class="eyebrow">Insurers &amp; loss adjusters</p><h2>Need a reinstatement partner?</h2><p>Surveys, scopes and managed repairs for your policyholders.</p></a>` +
  `<a class="overview-item" href="#maintenance"><p class="eyebrow">Housing associations</p><h2>Looking after your homes?</h2><p>Reactive repairs, planned maintenance and capital works.</p></a>` +
  `<a class="overview-item" href="/customer-portal"><p class="eyebrow">Existing customers</p><h2>Already have a claim?</h2><p>Choose your finishes and products in the customer portal.</p></a>` +
  `</div></div></section>` +
  `<section class="detail-section" id="insurance"><div class="wrap"><div class="plan-head"><div><p class="eyebrow">For homeowners, businesses &amp; insurers</p><h2>Insurance repairs</h2></div>` +
  `<p>From the first survey to handover, we manage the repair of insured damage and work alongside your insurer and loss adjuster.</p></div>` +
  `<div class="service-grid">${insurance}</div></div></section>` +
  `<section class="detail-section paper-section" id="maintenance"><div class="wrap"><div class="plan-head"><div><p class="eyebrow">For housing associations &amp; landlords</p><h2>Property maintenance</h2></div>` +
  `<p>Responsive repairs, programmed works and larger improvement projects, delivered by our own trades with one point of contact.</p></div>` +
  `<div class="service-grid">${maintenance}</div></div></section>` +
  `<section class="detail-final"><div class="wrap"><p class="eyebrow">Not sure which service you need?</p><h2>Tell us what’s happened<br>and we’ll guide you.</h2>` +
  `<div class="actions"><a class="btn" href="tel:01603944080">Call 01603 944 080</a><a class="btn secondary" href="/#enquiry-form">Send an enquiry ↗</a></div>` +
  `<p>Already have a claim? <a href="/customer-portal">Open the customer portal ↗</a></p></div></section>` +
  `</main>`;

export default function Services() {
  return (
    <SitePage
      title="Our services | Insurance repairs & property maintenance in Norfolk | Charter Property Repairs"
      description="Insurance repairs and property maintenance across Norfolk and East Anglia: fire, flood, storm, subsidence and impact damage, plus housing association maintenance."
      main={MAIN}
    />
  );
}
