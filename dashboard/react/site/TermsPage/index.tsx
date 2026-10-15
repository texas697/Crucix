import { CLASSES } from '../classes';
import { A, P, Strong } from '../components/SiteTags';
import type { PageProps } from '../types';
import { renderTermsAccess } from './renders/renderTermsAccess';
import { renderTermsClosing } from './renders/renderTermsClosing';
import { renderTermsContent } from './renders/renderTermsContent';
import { renderTermsLiability } from './renders/renderTermsLiability';
import { renderTermsToc } from './renders/renderTermsToc';

export function TermsPage({ vars }: PageProps) {
  const { appName, operator } = vars;
  return (
    <>
      <P>These Terms of Service (the "<Strong>Terms</Strong>") are a legal agreement between you and {operator} ("<Strong>we</Strong>", "<Strong>us</Strong>", "<Strong>our</Strong>") governing your use of the {appName} mobile application for iOS and Android and the online services it connects to (together, the "<Strong>Service</Strong>"). By creating an account, downloading the app or otherwise using the Service, you agree to these Terms and to our <A href="/privacy">Privacy Policy</A>. If you do not agree, do not use the Service.</P>

      <P className={CLASSES.caps}><Strong>Important: {appName} provides information for general informational purposes only. It is not financial, investment, legal or safety advice. Please read Sections 6 and 7 carefully. Section 14 contains an arbitration agreement and class action waiver that affect how disputes are resolved.</Strong></P>

      {renderTermsToc()}
      {renderTermsAccess(vars)}
      {renderTermsContent(vars)}
      {renderTermsLiability(vars)}
      {renderTermsClosing(vars)}
    </>
  );
}
