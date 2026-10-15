import type { ReactNode } from 'react';
import { A, H2, Li, P, Ul } from '../../components/SiteTags';
import type { SiteVars } from '../../types';
import { mailtoHref } from '../../utils';

export function renderTermsAccess(vars: SiteVars): ReactNode {
  const { appName, contactEmail } = vars;
  const mailto = mailtoHref(vars);
  return (
    <>
      <H2 id="eligibility">1. Eligibility</H2>
      <P>You must be at least 18 years old, or the age of legal majority where you live, and able to form a binding contract to use the Service. You may not use the Service if you are barred from doing so under applicable law, including U.S. export control and sanctions laws. If you use the Service on behalf of an organization, you represent that you are authorized to bind that organization to these Terms.</P>

      <H2 id="account">2. Your account</H2>
      <Ul>
        <Li>You must provide accurate information when you create an account and keep it up to date.</Li>
        <Li>You are responsible for keeping your sign-in credentials confidential and for all activity under your account. Notify us immediately at <A href={mailto}>{contactEmail}</A> if you suspect unauthorized access.</Li>
        <Li>Accounts are personal and may not be shared, sold or transferred.</Li>
        <Li>Access may be limited to approved email addresses or domains at our discretion.</Li>
        <Li>You can delete your account at any time as described in our <A href="/privacy#delete-account">Privacy Policy</A>.</Li>
      </Ul>

      <H2 id="service">3. The Service</H2>
      <P>{appName} aggregates and displays publicly available open-source information, including news, geopolitical and conflict reporting, satellite and environmental data, flight and maritime positions, health and disaster alerts, economic indicators and market data, and offers optional AI-generated summaries, regional briefs and trade ideas. We may add, change, suspend or remove features at any time, and some features may be subject to usage limits. We do not guarantee that the Service or any particular data source will always be available.</P>

      <H2 id="license">4. License to use the Service</H2>
      <P>Subject to these Terms, we grant you a limited, personal, non-exclusive, non-transferable, non-sublicensable, revocable license to download and use the {appName} app on devices you own or control, and to access the Service, for your own personal or internal business use. Your use of the app must also comply with the usage rules of the app store you obtained it from. All rights not expressly granted are reserved.</P>
      <P>Portions of the Service are built on open-source software, which is licensed to you under its own license terms. Nothing in these Terms limits your rights under those open-source licenses.</P>

      <H2 id="acceptable-use">5. Acceptable use</H2>
      <P>You agree not to:</P>
      <Ul>
        <Li>use the Service for any unlawful purpose, or in violation of any applicable law or regulation, including export control and sanctions laws;</Li>
        <Li>use the Service to harass, stalk, threaten, surveil or harm any person, or to plan or facilitate violence, terrorism or other illegal activity;</Li>
        <Li>use the Service as the basis for emergency response, navigation, aviation, maritime, military or other safety-critical decisions;</Li>
        <Li>access or attempt to access accounts, systems or data you are not authorized to access, or probe, scan or test the vulnerability of the Service without our written permission;</Li>
        <Li>interfere with or disrupt the Service, including by overloading it, introducing malware, or circumventing rate limits, usage limits or access controls;</Li>
        <Li>scrape, crawl or bulk-download data from the Service by automated means, or resell, redistribute or commercially exploit the Service or its content without our written permission;</Li>
        <Li>reverse engineer, decompile or disassemble the app except to the extent permitted by law or by an applicable open-source license;</Li>
        <Li>use the Service to build a competing product or to train machine learning models; or</Li>
        <Li>misrepresent your identity or impersonate any person or entity.</Li>
      </Ul>
    </>
  );
}
