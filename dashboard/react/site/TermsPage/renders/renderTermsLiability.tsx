import type { ReactNode } from 'react';
import { CLASSES } from '../../classes';
import { H2, P } from '../../components/SiteTags';
import type { SiteVars } from '../../types';

export function renderTermsLiability({ operator }: SiteVars): ReactNode {
  return (
    <>
      <H2 id="purchases">10. Purchases</H2>
      <P>The Service is currently offered free of charge. If we offer paid features or subscriptions in the future, prices and terms will be shown before you buy. Purchases made through the Apple App Store or Google Play are processed by Apple or Google and are subject to their terms, including their refund policies; subscriptions renew automatically unless cancelled in your app store account settings at least 24 hours before the end of the current period.</P>

      <H2 id="termination">11. Suspension and termination</H2>
      <P>You may stop using the Service and delete your account at any time. We may suspend or terminate your access, with or without notice, if you violate these Terms, if required by law, if your use creates risk or possible legal exposure for us or others, or if we discontinue the Service. Upon termination, your license to use the Service ends. Sections 6, 7 and 9 through 16 survive termination.</P>

      <H2 id="disclaimers">12. Disclaimers</H2>
      <P className={CLASSES.caps}>To the fullest extent permitted by law, the Service and all content are provided "as is" and "as available", without warranties of any kind, whether express, implied or statutory, including implied warranties of merchantability, fitness for a particular purpose, title, non-infringement, accuracy and quiet enjoyment. We do not warrant that the Service will be uninterrupted, timely, secure or error-free, that any data or AI output will be accurate, complete or reliable, or that defects will be corrected.</P>
      <P>Some jurisdictions do not allow the exclusion of certain warranties, so some of the above exclusions may not apply to you.</P>

      <H2 id="liability">13. Limitation of liability and indemnity</H2>
      <P className={CLASSES.caps}>To the fullest extent permitted by law, {operator} and its officers, directors, employees and agents will not be liable for any indirect, incidental, special, consequential, exemplary or punitive damages, or for any loss of profits, revenue, data, trading or investment losses, or goodwill, arising out of or relating to the Service or these Terms, even if advised of the possibility of such damages. Our total liability for all claims arising out of or relating to the Service or these Terms will not exceed the greater of (a) the amount you paid us for the Service in the twelve months before the claim arose, or (b) one hundred U.S. dollars (US$100).</P>
      <P>Nothing in these Terms excludes or limits liability that cannot be excluded or limited under applicable law, including liability for fraud, gross negligence or death or personal injury caused by negligence, or your statutory rights as a consumer.</P>
      <P>You agree to indemnify and hold us harmless from any claims, losses and expenses (including reasonable attorneys' fees) arising out of your violation of these Terms or applicable law, or your misuse of the Service.</P>
    </>
  );
}
