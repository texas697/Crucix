import type { ReactNode } from 'react';
import { A, H2, Li, P, Strong, Ul } from '../../components/SiteTags';

export function renderPrivacyProcessing(): ReactNode {
  return (
    <>
      <H2 id="use">4. How we use information</H2>
      <P>We use the information described above to:</P>
      <Ul>
        <Li>provide, operate and maintain the Service and the features you request;</Li>
        <Li>create and authenticate your account and keep it secure;</Li>
        <Li>personalize the articles and content you see based on your ratings;</Li>
        <Li>run AI features you request, using your own API key or, where offered, a shared key subject to usage limits;</Li>
        <Li>detect, investigate and prevent fraud, abuse, security incidents and violations of our <A href="/terms">Terms of Service</A>;</Li>
        <Li>diagnose problems and improve the reliability and performance of the Service;</Li>
        <Li>communicate with you about your account, security, and changes to the Service or these policies; and</Li>
        <Li>comply with legal obligations and enforce our rights.</Li>
      </Ul>
      <P>Where the EU or UK General Data Protection Regulation applies, our legal bases are: performance of our contract with you (providing the Service), our legitimate interests (security, abuse prevention, improving the Service), compliance with legal obligations, and your consent where we ask for it (you may withdraw consent at any time).</P>
      <P>We do not use your personal information for automated decision-making that produces legal or similarly significant effects on you.</P>

      <H2 id="share">5. How we share information</H2>
      <P>We do not sell or rent your personal information. We share it only as follows:</P>
      <Ul>
        <Li><Strong>Service providers.</Strong> Google Cloud and Google Firebase (hosting, authentication, database and logging) process data on our behalf under contractual confidentiality and security obligations. See <A href="https://policies.google.com/privacy" rel="noopener">Google's Privacy Policy</A> and <A href="https://firebase.google.com/support/privacy" rel="noopener">Firebase privacy information</A>.</Li>
        <Li><Strong>AI providers you choose.</Strong> When you use an AI feature, the relevant content (for example, article text, headlines and map-area context) is sent to the AI provider you configured (such as Anthropic, OpenAI, Google, xAI, Mistral, OpenRouter, MiniMax, or a custom endpoint you specify), or to our provider when a shared key is used. We do not send your email address or account details with these requests. See <A href="#ai">Section 6</A>.</Li>
        <Li><Strong>Search providers.</Strong> When you request a research report on an article, search queries derived from the article's topic (not from your personal information) are sent to news and web search services such as GDELT, Tavily, DuckDuckGo or Bing.</Li>
        <Li><Strong>Legal and safety.</Strong> We may disclose information if required by law, subpoena or other legal process, or if we believe in good faith that disclosure is necessary to protect the rights, property or safety of us, our users or the public.</Li>
        <Li><Strong>Business transfers.</Strong> If we are involved in a merger, acquisition, financing or sale of assets, information may be transferred as part of that transaction, subject to this Privacy Policy.</Li>
        <Li><Strong>With your consent.</Strong> In any other case, only with your direction or consent.</Li>
      </Ul>

      <H2 id="ai">6. AI features and your own API key</H2>
      <Ul>
        <Li>If you add your own API key, it is encrypted at rest with AES-256-GCM, decrypted only in server memory at the moment a request is made, and never displayed back to you or anyone else in full.</Li>
        <Li>Requests made with your key are subject to your agreement with, and the privacy policy of, that AI provider, and any usage charges are billed to you by that provider.</Li>
        <Li>You can remove your key at any time in Settings; removing it also deletes your stored AI settings and saved trade ideas.</Li>
        <Li>AI-generated content may be inaccurate. See our <A href="/terms">Terms of Service</A>.</Li>
      </Ul>
    </>
  );
}
