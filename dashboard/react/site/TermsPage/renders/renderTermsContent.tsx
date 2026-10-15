import type { ReactNode } from 'react';
import { A, H2, Li, P, Strong, Ul } from '../../components/SiteTags';
import type { SiteVars } from '../../types';
import { mailtoHref } from '../../utils';

export function renderTermsContent(vars: SiteVars): ReactNode {
  const { appName, contactEmail } = vars;
  const mailto = mailtoHref(vars);
  return (
    <>
      <H2 id="no-advice">6. No financial or investment advice</H2>
      <P>Market data, risk indicators, AI-generated "trade ideas" and all other content in the Service are provided <Strong>for general informational and educational purposes only</Strong>. They are not, and should not be relied on as, financial, investment, trading, tax, legal or other professional advice, nor a recommendation or solicitation to buy, sell or hold any security, commodity, currency or other instrument. We are not a registered investment adviser, broker-dealer or financial planner. Trading and investing involve substantial risk, including the possible loss of your entire investment, and past performance does not predict future results. You are solely responsible for your own decisions and should consult a qualified professional before making any financial decision.</P>

      <H2 id="information">7. Third-party data, AI output and accuracy</H2>
      <Ul>
        <Li><Strong>Third-party data.</Strong> Much of the content in the Service comes from third-party public sources that we do not control. It may be delayed, incomplete, inaccurate, mislabeled or unavailable, and inclusion of any source or report does not mean we endorse it. Positions of aircraft, vessels and events may be approximate or out of date.</Li>
        <Li><Strong>AI-generated content.</Strong> Summaries, briefs, research reports and trade ideas are generated automatically by AI models and may contain errors, omissions or fabricated information. Always verify important information against original sources.</Li>
        <Li><Strong>Links.</Strong> The Service links to third-party websites and media streams. We are not responsible for their content, availability or practices, and your use of them is governed by their own terms.</Li>
        <Li><Strong>Not for emergencies.</Strong> The Service is not an alerting or emergency notification system. In an emergency, follow guidance from official authorities.</Li>
      </Ul>

      <H2 id="byok">8. Your own AI provider key</H2>
      <P>If you add an API key for a third-party AI provider, you represent that you are authorized to use it, and you authorize us to use it to make requests on your behalf for the features you use (including scheduled features you turn on). Your use of that provider is governed by your agreement with the provider, and you are responsible for all charges the provider bills to your account and for complying with its terms and usage policies. We are not responsible for the provider's availability, output or charges. You can remove your key at any time.</P>

      <H2 id="ip">9. Intellectual property and feedback</H2>
      <P>The Service, including its design, software, text, graphics, logos and the {appName} name, is owned by us or our licensors and protected by intellectual property laws. Third-party content remains the property of its respective owners. You may not use our trademarks without our prior written permission.</P>
      <P>You retain ownership of content you submit. You grant us a limited license to store, process and display that content solely to provide the Service to you. If you send us suggestions or feedback, you agree that we may use them without restriction or obligation to you.</P>
      <P>If you believe content in the Service infringes your copyright, send a notice to <A href={mailto}>{contactEmail}</A> identifying the work, the allegedly infringing material and its location, your contact information, a statement of good-faith belief, and a statement under penalty of perjury that your notice is accurate and that you are authorized to act for the owner, with your physical or electronic signature.</P>
    </>
  );
}
