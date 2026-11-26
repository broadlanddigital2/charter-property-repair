import Script from "next/script";
import { useEffect, useRef } from "react";

// Trustpilot (Micro Review Count + Review Collector) and the My Local Business review
// carousel, shown on every page above the accreditations / footer.
const TP_BUSINESS = "643e2b596e11ee74b0506a6d";
const TP_URL = "https://www.trustpilot.com/review/www.charterpropertyrepairs.co.uk";

declare global {
  interface Window {
    Trustpilot?: { loadFromElement: (el: Element, forceReload?: boolean) => void };
  }
}

function loadTrustpilot() {
  document.querySelectorAll(".trustpilot-widget").forEach((el) => window.Trustpilot?.loadFromElement(el, true));
}

export default function ReviewsBlock() {
  const carousel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // The carousel script renders where it is placed, so insert it into its container.
    const host = carousel.current;
    if (!host || host.querySelector("script")) return;
    const s = document.createElement("script");
    s.src = "https://embed.mylocalbusiness.io/widgets/production/latest/widgets.js";
    s.async = true;
    s.setAttribute("data-my-widget", "carousel");
    s.setAttribute("data-business-id", "69f9ccc577343c46cec333fe");
    s.setAttribute("data-location-id", "69f9cd0c77343c46cec33401");
    host.appendChild(s);
    // Trustpilot already loaded (client-side navigation): render this page's widgets.
    if (window.Trustpilot) loadTrustpilot();
  }, []);

  return (
    <section className="reviews-block" aria-labelledby="reviews-block-title">
      <div className="wrap">
        <p className="eyebrow">Customer reviews</p>
        <h2 id="reviews-block-title">What our customers say</h2>
        <div
          className="trustpilot-widget reviews-block-count"
          data-locale="en-US"
          data-template-id="5419b6a8b0d04a076446a9ad"
          data-businessunit-id={TP_BUSINESS}
          data-style-height="24px"
          data-style-width="100%"
          data-min-review-count="0"
          data-style-alignment="center"
        >
          <a href={TP_URL} target="_blank" rel="noopener">
            Trustpilot
          </a>
        </div>
        <div className="reviews-block-carousel" ref={carousel} />
        <div className="reviews-block-collector">
          <p>Had work done by Charter? We’d love to hear how it went.</p>
          <div
            className="trustpilot-widget"
            data-locale="en-US"
            data-template-id="56278e9abfbbba0bdcd568bc"
            data-businessunit-id={TP_BUSINESS}
            data-style-height="52px"
            data-style-width="100%"
          >
            <a href={TP_URL} target="_blank" rel="noopener">
              Trustpilot
            </a>
          </div>
        </div>
      </div>
      <Script
        id="trustpilot-bootstrap"
        src="https://widget.trustpilot.com/bootstrap/v5/tp.widget.bootstrap.min.js"
        strategy="afterInteractive"
        onLoad={loadTrustpilot}
      />
    </section>
  );
}
