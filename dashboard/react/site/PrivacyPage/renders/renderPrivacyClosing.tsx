import type { ReactNode } from 'react';
import { A, Br, H2, P, Strong } from '../../components/SiteTags';
import type { SiteVars } from '../../types';
import { mailtoHref } from '../../utils';

export function renderPrivacyClosing(vars: SiteVars): ReactNode {
  const { operator, contactEmail, postalAddressLine } = vars;
  const mailto = mailtoHref(vars);
  return (
    <>
      <H2 id="security">10. Security</H2>
      <P>We use industry-standard safeguards, including encryption in transit (HTTPS/TLS), encryption of API keys at rest, short-lived signed sign-in tokens, server-side verification of every authenticated request, and access controls limiting who can reach production systems. No method of transmission or storage is completely secure, so we cannot guarantee absolute security. If we learn of a security breach affecting your personal information, we will notify you as required by law.</P>

      <H2 id="transfers">11. International transfers</H2>
      <P>We are based in the United States and the Service is hosted on Google Cloud infrastructure in the United States. If you use the Service from outside the United States, your information will be transferred to, stored in and processed in the United States, where data protection laws may differ from those in your country. Where required, we rely on appropriate safeguards such as Standard Contractual Clauses for these transfers.</P>

      <H2 id="children">12. Children</H2>
      <P>The Service is not directed to children and is intended for users aged 18 and older. We do not knowingly collect personal information from children under 13 (or under 16 in the EEA and UK). If you believe a child has provided us personal information, contact us at <A href={mailto}>{contactEmail}</A> and we will delete it.</P>

      <H2 id="changes">13. Changes to this policy</H2>
      <P>We may update this Privacy Policy from time to time. We will post the updated version at this address and change the "Last updated" date above. If changes are material, we will provide additional notice, such as an in-app message or an email, before they take effect. Your continued use of the Service after the effective date means you accept the updated policy.</P>

      <H2 id="contact">14. Contact us</H2>
      <P>If you have questions about this Privacy Policy or our privacy practices, contact:</P>
      <P><Strong>{operator}</Strong><Br />Email: <A href={mailto}>{contactEmail}</A>{postalAddressLine}</P>
    </>
  );
}
