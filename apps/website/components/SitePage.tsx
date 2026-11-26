import Head from "next/head";
import Script from "next/script";
import ReviewsBlock from "./ReviewsBlock";
import { HEADER, FOOTER } from "../lib/chrome";
import { ACCREDITATIONS } from "../lib/accreditations";
import { FONT_URL, withPortalLinks } from "../lib/site";

type Props = { title: string; description: string; main: string; ld?: string; current?: string };

const MENU_JS =
  "const toggle=document.querySelector('.menu'),nav=document.getElementById('nav');function setMenu(open){toggle.setAttribute('aria-expanded',open);nav.classList.toggle('open',open)}toggle.addEventListener('click',()=>setMenu(toggle.getAttribute('aria-expanded')==='false'));document.addEventListener('keydown',event=>{if(event.key==='Escape'&&toggle.getAttribute('aria-expanded')==='true'){setMenu(false);toggle.focus()}});";

const ENQUIRY_JS = "const enquiry=document.getElementById('enquiry-form');if(enquiry){enquiry.addEventListener('submit',function(event){event.preventDefault();const data=new FormData(enquiry);const body=['Name: '+data.get('name'),'Email: '+data.get('email'),'Phone: '+data.get('phone'),'Postcode: '+data.get('postcode'),'Reference: '+data.get('reference'),'','Message:',data.get('message')].join('\\n');window.location.href='mailto:mail@charterpropertyrepairs.co.uk?subject='+encodeURIComponent('Website enquiry - '+data.get('type'))+'&body='+encodeURIComponent(body);document.getElementById('form-status').textContent='Please send the prepared message from your email app. If it did not open, email mail@charterpropertyrepairs.co.uk or call 01603 944 080.';});}";

/** Standard page: shared header, page <main>, reviews block, accreditations and footer. */
export default function SitePage({ title, description, main, ld, current = "/services" }: Props) {
  const header = HEADER.replace(`href="${current}">`, `href="${current}" aria-current="page">`);
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="robots" content="noindex,nofollow" />
        <link href={FONT_URL} rel="stylesheet" />
        {ld && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld }} />}
      </Head>
      <div dangerouslySetInnerHTML={{ __html: withPortalLinks(header + main) }} />
      <ReviewsBlock />
      <div dangerouslySetInnerHTML={{ __html: withPortalLinks(ACCREDITATIONS + FOOTER) }} />
      <Script id="menu" strategy="afterInteractive">
        {MENU_JS}
      </Script>
      <Script id="enquiry" strategy="afterInteractive">
        {ENQUIRY_JS}
      </Script>
      <Script src="/assets/header.js" strategy="afterInteractive" />
    </>
  );
}
