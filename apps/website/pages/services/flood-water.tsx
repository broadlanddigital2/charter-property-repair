import Head from "next/head";
import Script from "next/script";
import { HEADER, FOOTER } from "../../lib/chrome";
import { ACCREDITATIONS } from "../../lib/accreditations";
import { MAIN, FAQ_LD } from "../../lib/services/flood-water";
import { FONT_URL, withPortalLinks } from "../../lib/site";

const header = HEADER.replace('<a href="/services">', '<a href="/services" aria-current="page">');
const body = withPortalLinks(header + MAIN + ACCREDITATIONS + FOOTER);

export default function FloodWater() {
  return (
    <>
      <Head>
        <title>Flood &amp; water damage in Norfolk | Charter Property Repairs</title>
        <meta
          name="description"
          content="Flood and water damage repairs in Norfolk and Norwich. Explore the repair process and contact Charter about your insurance reinstatement."
        />
        <meta name="robots" content="noindex,nofollow" />
        <link href={FONT_URL} rel="stylesheet" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: FAQ_LD }} />
      </Head>
      <div dangerouslySetInnerHTML={{ __html: body }} />
      <Script id="menu" strategy="afterInteractive">
        {"const toggle=document.querySelector('.menu'),nav=document.getElementById('nav');function setMenu(open){toggle.setAttribute('aria-expanded',open);nav.classList.toggle('open',open)}toggle.addEventListener('click',()=>setMenu(toggle.getAttribute('aria-expanded')==='false'));document.addEventListener('keydown',event=>{if(event.key==='Escape'&&toggle.getAttribute('aria-expanded')==='true'){setMenu(false);toggle.focus()}});"}
      </Script>
      <Script src="/assets/header.js" strategy="afterInteractive" />
    </>
  );
}
