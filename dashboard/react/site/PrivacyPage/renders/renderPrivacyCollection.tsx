import type { ReactNode } from 'react';
import { A, H2, H3, Li, P, Strong, Table, Td, Th, Tr, Ul } from '../../components/SiteTags';
import type { SiteVars } from '../../types';

export function renderPrivacyCollection({ appName }: SiteVars): ReactNode {
  return (
    <>
      <H2 id="summary">1. Summary</H2>
      <Ul>
        <Li>We collect only what is needed to run your account and the features you use: your email address, sign-in identifiers, your app settings, and the feedback and research you create.</Li>
        <Li>We do <Strong>not</Strong> sell your personal information, share it for cross-context behavioral advertising, show third-party ads, or track you across other companies' apps and websites.</Li>
        <Li>We do <Strong>not</Strong> access your device location, contacts, photos, camera, microphone or health data.</Li>
        <Li>If you add your own AI provider API key, it is encrypted at rest and used only to run the AI features you request.</Li>
        <Li>You can delete your account and associated data at any time (see <A href="#delete-account">Section 8</A>).</Li>
      </Ul>

      <H2 id="collect">2. Information we collect</H2>
      <H3>2.1 Information you provide</H3>
      <Table>
        <Tr><Th>Category</Th><Th>Details</Th><Th>Purpose</Th></Tr>
        <Tr><Td>Account information</Td><Td>Email address and, if you sign in with email, a password. Passwords are handled by Google Firebase Authentication and are never visible to us. If you sign in with Google, we receive your email address and the account identifier Google provides.</Td><Td>Creating and securing your account, signing you in, password resets, service communications.</Td></Tr>
        <Tr><Td>AI provider settings (optional)</Td><Td>The AI provider you choose, model name, optional custom endpoint URL, your API key (stored encrypted), and a short masked hint of the key (for example, the last four characters) so you can recognize it.</Td><Td>Running AI features on your behalf using your own provider account.</Td></Tr>
        <Tr><Td>Content you create</Td><Td>Depending on the features you use: thumbs-up/down ratings on articles, article summaries and research reports you request, AI-generated trade ideas, and map areas you select for a regional brief.</Td><Td>Providing those features, personalizing article ranking, and showing your history back to you.</Td></Tr>
        <Tr><Td>Feedback you submit</Td><Td>If you use an in-app feedback option (where available in your version of the app): your description and the feedback type; if you leave them selected, a screenshot of the screen you were viewing and diagnostic information about the app's state (app version, the screen and settings you were using, device model, operating system version, screen size, language, time zone, network status, recent error messages, and a list of recent requests the app made to our servers, without their contents). You can choose not to include the screenshot or diagnostics before sending.</Td><Td>Investigating and fixing problems, responding to you, and improving the Service.</Td></Tr>
        <Tr><Td>Support communications</Td><Td>Anything you send us by email, such as questions or bug reports.</Td><Td>Responding to you and improving the Service.</Td></Tr>
      </Table>
      <H3>2.2 Information collected automatically</H3>
      <Table>
        <Tr><Th>Category</Th><Th>Details</Th><Th>Purpose</Th></Tr>
        <Tr><Td>Authentication tokens</Td><Td>A secure sign-in token, stored on your device, that keeps you signed in. We do not use advertising identifiers or tracking cookies.</Td><Td>Keeping you signed in and protecting your account.</Td></Tr>
        <Tr><Td>Account activity</Td><Td>Account creation time, last sign-in time, and per-account usage counts for rate-limited features.</Td><Td>Security, abuse prevention, and fair use of shared resources.</Td></Tr>
        <Tr><Td>Server and diagnostic logs</Td><Td>IP address, device and app type (user agent), requested pages and API endpoints, timestamps, and error details, recorded by our hosting provider.</Td><Td>Operating, securing, debugging and maintaining the Service.</Td></Tr>
      </Table>
      <H3>2.3 Public data shown in the app</H3>
      <P>{appName} aggregates publicly available open-source information such as news feeds, satellite and environmental data, flight and vessel positions, and economic indicators. This data concerns world events, not you, and we do not combine it with your personal information.</P>

      <H2 id="not-collect">3. Information we do not collect</H2>
      <P>We do not collect your precise or approximate device location (other than the time zone reported by your device in feedback diagnostics), contacts, photos or media files, camera or microphone input, health or fitness data, financial account or payment card information, browsing history from other apps or websites, or advertising identifiers (IDFA / Google Advertising ID). We do not use third-party advertising or analytics SDKs to track you.</P>
      <P>If you make a purchase through the Apple App Store or Google Play, payment is processed by Apple or Google under their own privacy policies; we receive only the information needed to confirm your purchase and do not receive your payment card details.</P>
    </>
  );
}
