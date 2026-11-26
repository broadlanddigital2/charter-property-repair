import Head from "next/head";
import Script from "next/script";
import ReviewsBlock from "../components/ReviewsBlock";
import { HEADER, FOOTER } from "../lib/chrome";
import { FONT_URL, withPortalLinks } from "../lib/site";

// Served by the Worker for any path that isn't built yet (Services, About us, …).
const body =
  withPortalLinks(HEADER) +
  `<main id="main"><section class="section"><div class="wrap"><div class="intro"><div>` +
  `<p class="eyebrow">Coming soon</p><h1>This page is on its way</h1></div>` +
  `<p>We're still building this part of our new website. In the meantime, call us on ` +
  `<a href="tel:01603944080">01603 944 080</a> or email ` +
  `<a href="mailto:mail@charterpropertyrepairs.co.uk">mail@charterpropertyrepairs.co.uk</a>.</p></div>` +
  `<div class="actions"><a class="btn" href="/">Back to the homepage</a>` +
  `<a class="btn secondary" href="tel:01603944080">Call 01603 944 080</a></div></div></section></main>` +
  "";
const bottom = withPortalLinks(FOOTER);

export default function NotFound() {
  return (
    <>
      <Head>
        <title>Coming soon | Charter Property Repairs</title>
        <meta name="robots" content="noindex,nofollow" />
        <link href={FONT_URL} rel="stylesheet" />
      </Head>
      <div dangerouslySetInnerHTML={{ __html: body }} />
      <ReviewsBlock />
      <div dangerouslySetInnerHTML={{ __html: bottom }} />
      <Script id="menu" strategy="afterInteractive">
        {"const toggle=document.querySelector('.menu'),nav=document.getElementById('nav');function setMenu(open){toggle.setAttribute('aria-expanded',open);nav.classList.toggle('open',open)}toggle.addEventListener('click',()=>setMenu(toggle.getAttribute('aria-expanded')==='false'));document.addEventListener('keydown',event=>{if(event.key==='Escape'&&toggle.getAttribute('aria-expanded')==='true'){setMenu(false);toggle.focus()}});"}
      </Script>
      <Script src="/assets/header.js" strategy="afterInteractive" />
    </>
  );
}
