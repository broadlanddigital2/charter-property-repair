// Builds a service page's <main> markup from its content, using the same sections
// and classes as the Flood & water damage page.
import { SERVICES, GROUP_LABEL, cardHtml, serviceUrl, type Group } from "./catalog";

export type Icon = "survey" | "dry" | "repair" | "finish" | "shield" | "home" | "calendar" | "search" | "roof" | "wall";

export type ServiceContent = {
  slug: string;
  name: string;
  group: Group;
  title: string; // <title>
  description: string; // meta description
  h1: string; // may contain <br>
  intro: string;
  trust: [string, string, string];
  hero: { src: string; alt: string };
  overview: { eyebrow: string; title: string; text: string }[]; // 4
  problem: { title: string; image: { src: string; alt: string }; paras: string[] };
  plan: { intro: string; stages: { icon: Icon; title: string; items: string[] }[]; note: string };
  process: { intro: string; steps: { label: string; title: string; text: string }[] };
  transformation?: { lede: string; before: string; after: string };
  partner: { title: string; paras: string[]; aside: { eyebrow: string; title: string; text: string; cta: string; href: string } };
  faqs: { q: string; a: string }[];
  related: string[]; // slugs
  finalEyebrow: string;
};

const ICONS: Record<Icon, string> = {
  survey: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3v2h6V3M9 11h6M9 15h4"/>',
  dry: '<path d="M12 3c-3.5 4.6-6 8-6 11a6 6 0 0 0 12 0c0-3-2.5-6.4-6-11z"/><path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5"/>',
  repair: '<path d="M4 20l7-7"/><path d="M14.5 3.5a4 4 0 0 0-4.6 5.4L4 14.8 9.2 20l5.9-5.9a4 4 0 0 0 5.4-4.6l-2.6 2.6-3-.6-.6-3z"/>',
  finish: '<rect x="3" y="3" width="15" height="6" rx="1.5"/><path d="M18 6h2.5v5H11v3"/><rect x="9.5" y="14" width="3" height="7" rx="1"/>',
  shield: '<path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
  home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  search: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
  roof: '<path d="M2 12l10-8 10 8"/><path d="M5 10v10h14V10"/><path d="M9 14h6"/>',
  wall: '<path d="M3 5h18v14H3z"/><path d="M3 10h18M3 15h18M9 5v5M15 10v5M9 15v4"/>',
};

const icon = (i: Icon) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[i]}</svg>`;
const esc = (s: string) => s.replace(/&(?!amp;|lt;|gt;|#)/g, "&amp;");

export function buildServiceMain(c: ServiceContent): string {
  const group = GROUP_LABEL[c.group];
  const enquiry = "/#enquiry-form";

  const hero =
    `<section class="detail-hero"><img src="${c.hero.src}" alt="${c.hero.alt}"><div class="wrap">` +
    `<nav aria-label="Breadcrumb" class="crumbs"><a href="/">Home</a> / <a href="/services">Services</a> / ${esc(c.name)}</nav>` +
    `<p class="eyebrow">${group} · Norfolk &amp; Norwich</p><h1>${c.h1}</h1><p>${c.intro}</p>` +
    `<div class="actions"><a class="btn" href="tel:01603944080">Call 01603 944 080</a><a class="btn secondary" href="${enquiry}">Send an enquiry ↗</a></div>` +
    `<div class="detail-trust">✓ ${c.trust[0]} <span>✓ ${c.trust[1]}</span><span>✓ ${c.trust[2]}</span></div></div></section>`;

  const overview =
    `<section class="repair-overview" aria-label="At a glance"><div class="wrap"><div class="overview-grid">` +
    c.overview.map((o) => `<article class="overview-item"><p class="eyebrow">${o.eyebrow}</p><h2>${o.title}</h2><p>${o.text}</p></article>`).join("") +
    `</div></div></section>`;

  const problem =
    `<section class="detail-section "><div class="wrap"><h2>${c.problem.title}</h2><div class="detail-split">` +
    `<figure><img src="${c.problem.image.src}" alt="${c.problem.image.alt}" loading="lazy"></figure>` +
    `<div>${c.problem.paras.map((p) => `<p>${p}</p>`).join("")}</div></div></div></section>`;

  const plan =
    `<section class="detail-section paper-section repair-plan"><div class="wrap">` +
    `<div class="plan-head"><div><p class="eyebrow">What’s included</p><h2>${c.group === "insurance" ? "A repair plan from start to finish" : "What the service covers"}</h2></div><p>${c.plan.intro}</p></div>` +
    `<div class="plan-grid">` +
    c.plan.stages
      .map(
        (s, i) =>
          `<article class="plan-card"><span class="plan-icon">${icon(s.icon)}</span><p class="plan-stage">Stage ${i + 1}</p><h3>${s.title}</h3><ul>` +
          s.items.map((it) => `<li>${it}</li>`).join("") +
          `</ul></article>`,
      )
      .join("") +
    `</div><div class="plan-note"><p>${c.plan.note}</p>` +
    (c.group === "insurance"
      ? `<a href="/customer-portal">Choose your finishes in the customer portal <span aria-hidden="true">↗</span></a>`
      : `<a href="${enquiry}">Talk to us about your programme <span aria-hidden="true">↗</span></a>`) +
    `</div></div></section>`;

  const id = `${c.slug}-process-title`;
  const process =
    `<section class="detail-section repair-process" aria-labelledby="${id}"><div class="wrap"><div class="process-panel">` +
    `<div class="process-intro"><p class="eyebrow">${c.group === "insurance" ? "Your repair, step by step" : "How we work, step by step"}</p><h2 id="${id}">${c.group === "insurance" ? "How your repair moves forward" : "How the work moves forward"}</h2>` +
    `<p>${c.process.intro}</p><a class="process-contact" href="${enquiry}">Talk to our team <span aria-hidden="true">↗</span></a></div>` +
    `<ol class="process-steps">` +
    c.process.steps
      .map(
        (s, i) =>
          `<li><div class="process-marker" aria-hidden="true">${String(i + 1).padStart(2, "0")}</div><div class="process-step-copy"><p class="process-label">${s.label}</p><h3>${s.title}</h3><p>${s.text}</p></div></li>`,
      )
      .join("") +
    `</ol><div class="process-base"><div><span class="process-check" aria-hidden="true">✓</span><p><strong>Questions about the next step?</strong> ${
      c.group === "insurance" ? "Call the team and quote your claim reference." : "Call the team about your properties or a job."
    }</p></div><a href="tel:01603944080">01603 944 080 <span aria-hidden="true">↗</span></a></div></div></div></section>`;

  const transformation = c.transformation
    ? `<section class="detail-section paper-section"><div class="wrap"><h2>See the transformation</h2><p class="section-lede">${c.transformation.lede}</p>` +
      `<div class="before-after">` +
      `<figure><img src="/assets/ba/${c.slug}-before.webp" alt="${c.transformation.before}" loading="lazy" width="1000" height="1000"><figcaption>Before</figcaption></figure>` +
      `<figure><img src="/assets/ba/${c.slug}-after.webp" alt="${c.transformation.after}" loading="lazy" width="1000" height="1000"><figcaption>After</figcaption></figure>` +
      `</div></div></section>`
    : "";

  const partner =
    `<section class="detail-section "><div class="wrap"><h2>${c.partner.title}</h2><div class="detail-split"><div>` +
    c.partner.paras.map((p) => `<p>${p}</p>`).join("") +
    `</div><aside class="detail-advice"><p class="eyebrow">${c.partner.aside.eyebrow}</p><h3>${c.partner.aside.title}</h3><p>${c.partner.aside.text}</p>` +
    `<a class="btn" href="${c.partner.aside.href}">${c.partner.aside.cta}</a></aside></div></div></section>`;

  const faq =
    `<section class="detail-section paper-section"><div class="wrap"><h2>Your questions, answered</h2><div class="detail-faq">` +
    c.faqs.map((f) => `<details><summary>${f.q}</summary><p>${f.a}</p></details>`).join("") +
    `</div></div></section>`;

  const groupList = SERVICES.filter((s) => s.group === c.group);
  const idx = groupList.findIndex((s) => s.slug === c.slug);
  const prev = groupList[(idx - 1 + groupList.length) % groupList.length];
  const next = groupList[(idx + 1) % groupList.length];
  const related =
    `<section class="detail-section "><div class="wrap"><h2>Related services</h2><div class="service-grid">` +
    c.related.map((slug) => cardHtml(SERVICES.find((s) => s.slug === slug)!)).join("") +
    `</div><nav class="service-pagination" aria-label="Other ${group.toLowerCase()} services">` +
    `<a href="${serviceUrl(prev.slug)}">← ${esc(prev.name)}</a><a href="${serviceUrl(next.slug)}">${esc(next.name)} →</a></nav></div></section>`;

  const final =
    `<section class="detail-final"><div class="wrap"><p class="eyebrow">${c.finalEyebrow}</p><h2>A clear next step<br>starts with a conversation.</h2>` +
    `<div class="actions"><a class="btn" href="tel:01603944080">Call 01603 944 080</a><a class="btn secondary" href="${enquiry}">Send an enquiry ↗</a></div>` +
    (c.group === "insurance"
      ? `<p>Already have a claim? <a href="/customer-portal">Open the customer portal ↗</a></p>`
      : `<p>Prefer email? <a href="mailto:mail@charterpropertyrepairs.co.uk">mail@charterpropertyrepairs.co.uk</a></p>`) +
    `</div></section>`;

  return `<main id="main">${hero}${overview}${problem}${plan}${process}${transformation}${partner}${faq}${related}${final}</main>`;
}

export function faqLd(c: ServiceContent): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: c.faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  });
}
