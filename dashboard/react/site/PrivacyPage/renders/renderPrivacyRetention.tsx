import type { ReactNode } from 'react';
import { A, Em, H2, Li, Ol, P, Strong, Ul } from '../../components/SiteTags';
import type { SiteVars } from '../../types';
import { deleteAccountHref, mailtoHref } from '../../utils';

export function renderPrivacyRetention(vars: SiteVars): ReactNode {
  const { appName, contactEmail } = vars;
  const deleteMail = deleteAccountHref(vars);
  const mailto = mailtoHref(vars);
  return (
    <>
      <H2 id="retention">7. Data retention</H2>
      <Ul>
        <Li><Strong>Account data, settings and content you create</Strong> are kept while your account is active and deleted within 30 days after you delete your account.</Li>
        <Li><Strong>Feedback</Strong> (including screenshots and diagnostics) is kept for up to 24 months so we can track recurring issues, then deleted, or sooner if you delete your account.</Li>
        <Li><Strong>Your API key</Strong> is deleted immediately when you remove it or delete your account.</Li>
        <Li><Strong>Server logs</Strong> are kept for a limited period (generally no more than 30 days) unless needed longer to investigate a security incident.</Li>
        <Li><Strong>Backups</Strong> may persist for a short additional period before being overwritten.</Li>
        <Li>We may keep limited information longer where required by law or to resolve disputes and enforce our agreements.</Li>
      </Ul>

      <H2 id="delete-account">8. Deleting your account and data</H2>
      <P>You can request deletion of your {appName} account and all associated data at any time:</P>
      <Ol>
        <Li><Strong>In the app:</Strong> open <Em>Settings → Account → Delete account</Em> and confirm.</Li>
        <Li><Strong>By email:</Strong> send a message from the email address on your account to <A href={deleteMail}>{contactEmail}</A> with the subject "Delete my account". We may ask you to confirm the request to verify that it came from you.</Li>
      </Ol>
      <P>When your account is deleted we remove your sign-in account, email address, AI provider settings and encrypted API key, trade ideas, article ratings, research reports, and any feedback, screenshots and diagnostics you submitted. Deletion is completed within 30 days of your request, except for limited records we must keep for legal, security or fraud-prevention reasons, and short-lived backups and logs as described in <A href="#retention">Section 7</A>. Deleting the app from your device does not delete your account.</P>
      <P>If you only want specific data removed (for example, your API key or your ratings) without deleting your account, you can do so in the app or contact us.</P>

      <H2 id="rights">9. Your privacy rights</H2>
      <P>Depending on where you live, you may have the right to:</P>
      <Ul>
        <Li>access the personal information we hold about you and receive a copy in a portable format;</Li>
        <Li>correct inaccurate information;</Li>
        <Li>delete your information;</Li>
        <Li>restrict or object to certain processing;</Li>
        <Li>withdraw consent where processing is based on consent; and</Li>
        <Li>lodge a complaint with your local data protection authority.</Li>
      </Ul>
      <P><Strong>California and other U.S. state residents:</Strong> you have the right to know what personal information we collect, use and disclose; to request deletion or correction; and to opt out of the "sale" or "sharing" of personal information. We do not sell or share personal information as those terms are defined under the California Consumer Privacy Act (CCPA/CPRA) or similar state laws, and we do not use or disclose sensitive personal information for purposes that would give you a right to limit it. We will not discriminate against you for exercising your rights.</P>
      <P>To exercise any of these rights, email <A href={mailto}>{contactEmail}</A>. We will respond within the time required by applicable law (generally 30 days, or 45 days under U.S. state laws). You may use an authorized agent where the law allows; we may need to verify your identity and the agent's authority before acting on a request.</P>
    </>
  );
}
