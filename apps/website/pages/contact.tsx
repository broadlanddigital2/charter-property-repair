import SitePage from "../components/SitePage";
import { CONTACT_MAIN, CONTACT_LD } from "../lib/contact";

export default function Contact() {
  return (
    <SitePage
      title="Contact us | Charter Property Repairs, Norwich"
      description="Contact Charter Property Repairs on 01603 944 080 or mail@charterpropertyrepairs.co.uk. Technova House, Technova Court, Earl Road, Rackheath, Norwich NR13 6NT."
      main={CONTACT_MAIN}
      ld={CONTACT_LD}
      current="/contact"
    />
  );
}
