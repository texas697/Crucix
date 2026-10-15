import type { ReactNode } from 'react';
import { A, Br, H2, Li, P, Strong, Ul } from '../../components/SiteTags';
import type { SiteVars } from '../../types';
import { mailtoHref } from '../../utils';

export function renderTermsClosing(vars: SiteVars): ReactNode {
  const { operator, contactEmail, jurisdiction, postalAddressLine } = vars;
  const mailto = mailtoHref(vars);
  return (
    <>
      <H2 id="disputes">14. Governing law and disputes</H2>
      <P>These Terms are governed by the laws of {jurisdiction} and applicable U.S. federal law, without regard to conflict-of-laws rules.</P>
      <P><Strong>Informal resolution.</Strong> Before filing a claim, you agree to contact us at <A href={mailto}>{contactEmail}</A> and try to resolve the dispute informally for at least 30 days.</P>
      <P><Strong>Arbitration.</Strong> If you are located in the United States, any dispute that is not resolved informally will be resolved by binding individual arbitration administered by the American Arbitration Association under its Consumer Arbitration Rules, rather than in court, except that either party may bring an individual claim in small claims court or seek injunctive relief for misuse of intellectual property. <Strong>You and we each waive the right to a jury trial and to participate in a class action or class-wide arbitration.</Strong> You may opt out of this arbitration agreement by emailing us within 30 days of first accepting these Terms.</P>
      <P>If arbitration does not apply, or for users outside the United States, disputes will be resolved in the state or federal courts located in {jurisdiction}, and you consent to their jurisdiction, except where the law of your country of residence gives you the right to bring proceedings in your local courts.</P>

      <H2 id="app-stores">15. App store terms</H2>
      <P>If you downloaded the app from the Apple App Store or Google Play, the following also apply:</P>
      <Ul>
        <Li>These Terms are between you and {operator} only, not Apple Inc. ("Apple") or Google LLC ("Google"). We, not Apple or Google, are solely responsible for the app and its content.</Li>
        <Li>Apple and Google have no obligation to provide maintenance or support for the app.</Li>
        <Li>If the app fails to conform to any applicable warranty, you may notify Apple, and Apple will refund the purchase price (if any) for the app. To the maximum extent permitted by law, Apple has no other warranty obligation with respect to the app.</Li>
        <Li>We, not Apple or Google, are responsible for addressing any claims by you or a third party relating to the app or your possession or use of it, including product liability claims, claims that the app fails to conform to legal or regulatory requirements, and claims under consumer protection, privacy or similar laws.</Li>
        <Li>In the event of any third-party claim that the app or your use of it infringes that third party's intellectual property rights, we, not Apple or Google, are responsible for the investigation, defense, settlement and discharge of that claim.</Li>
        <Li>You represent that you are not located in a country subject to a U.S. Government embargo or designated as a "terrorist supporting" country, and that you are not listed on any U.S. Government list of prohibited or restricted parties.</Li>
        <Li>You must comply with applicable third-party terms (such as your wireless data service agreement) when using the app.</Li>
        <Li>Apple and its subsidiaries are third-party beneficiaries of these Terms, and upon your acceptance, Apple will have the right (and will be deemed to have accepted the right) to enforce these Terms against you as a third-party beneficiary.</Li>
        <Li>Your use of the app must comply with the Apple Media Services Terms and Conditions or the Google Play Terms of Service, as applicable. If these Terms conflict with those store terms regarding your use of the app, the store terms control to the extent of the conflict.</Li>
      </Ul>

      <H2 id="general">16. General</H2>
      <Ul>
        <Li><Strong>Changes.</Strong> We may update these Terms from time to time. We will post the updated Terms at this address and update the date above, and for material changes we will provide additional notice, such as an in-app message or email. Continued use after the effective date means you accept the updated Terms.</Li>
        <Li><Strong>Entire agreement.</Strong> These Terms and our Privacy Policy are the entire agreement between you and us regarding the Service.</Li>
        <Li><Strong>Severability.</Strong> If any provision is found unenforceable, the remaining provisions remain in full effect.</Li>
        <Li><Strong>No waiver.</Strong> Our failure to enforce a provision is not a waiver of our right to do so later.</Li>
        <Li><Strong>Assignment.</Strong> You may not assign these Terms without our consent. We may assign them in connection with a merger, acquisition or sale of assets.</Li>
        <Li><Strong>Force majeure.</Strong> We are not liable for delays or failures caused by events beyond our reasonable control.</Li>
      </Ul>

      <H2 id="contact">17. Contact us</H2>
      <P>Questions about these Terms can be sent to:</P>
      <P><Strong>{operator}</Strong><Br />Email: <A href={mailto}>{contactEmail}</A>{postalAddressLine}</P>
    </>
  );
}
