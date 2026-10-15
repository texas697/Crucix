import { CLASSES } from '../classes';
import { A, Br, Details, Em, H2, H3, Li, P, Summary, Ul } from '../components/SiteTags';
import type { PageProps } from '../types';
import { deleteAccountHref, feedbackHref, supportHref } from '../utils';

export function SupportPage({ vars }: PageProps) {
  const { appName, contactEmail } = vars;
  const supportMail = supportHref(vars);
  const feedbackMail = feedbackHref(vars);
  const deleteMail = deleteAccountHref(vars);
  return (
    <>
      <P className={CLASSES.lead}>Need help with {appName}? Email us at <A href={supportMail}>{contactEmail}</A> and we'll get back to you, usually within two business days. For bugs, a screenshot and a short description of what you were doing help us fix problems faster.</P>

      <div className={CLASSES.card}>
        <H3>Contact support</H3>
        <P>Email: <A href={supportMail}>{contactEmail}</A><Br />{' '}To help us help you, include your device model, operating system version, the app version, and what you were doing when the problem happened.</P>
      </div>

      <H2 id="faq">Frequently asked questions</H2>

      <Details open>
        <Summary>How do I sign in?</Summary>
        <P>Create an account with your email address and a password, or continue with Google. Access may be limited to approved email addresses; if you're told your email isn't allowed, contact us.</P>
      </Details>
      <Details>
        <Summary>I forgot my password.</Summary>
        <P>On the sign-in screen, enter your email and tap <Em>Forgot password</Em>. We'll email you a link to set a new one. Check your spam folder if it doesn't arrive within a few minutes.</P>
      </Details>
      <Details>
        <Summary>How do AI summaries and deep-dive research work?</Summary>
        <P>AI features run on your own AI provider account. Add an API key from a supported provider (such as Anthropic, OpenAI, Google Gemini, xAI, Mistral or OpenRouter) in Settings. Your key is encrypted on our servers, is only used for requests you make, and any usage charges are billed to you by that provider. You can remove the key at any time.</P>
      </Details>
      <Details>
        <Summary>How does the feed learn what I like?</Summary>
        <P>Rate pieces with thumbs up or thumbs down. Your ratings help rank similar topics and sources higher in your feed. Rate a piece again to clear your rating.</P>
      </Details>
      <Details>
        <Summary>An article is missing, wrong or won't load.</Summary>
        <P>Articles come from third-party publishers, which occasionally change or remove pages. Email us with the article title and source, and we'll take a look.</P>
      </Details>
      <Details>
        <Summary>How do I send feedback or report a bug?</Summary>
        <P>Email <A href={feedbackMail}>{contactEmail}</A> with a description and, if you can, a screenshot. If your version of the app includes an in-app feedback option, you can use that instead; it lets you choose whether to attach a screenshot and diagnostic information. See our <A href="/privacy">Privacy Policy</A> for what is collected.</P>
      </Details>
      <Details id="delete-account">
        <Summary>How do I delete my account?</Summary>
        <P>In the app, go to <Em>Settings → Account → Delete account</Em>, or email <A href={deleteMail}>{contactEmail}</A> from the address on your account. Deleting your account permanently removes your account and associated data. Uninstalling the app does not delete your account. <A href="/privacy#delete-account">Details</A>.</P>
      </Details>
      <Details>
        <Summary>Is {appName} financial or investment advice?</Summary>
        <P>No. Content in {appName}, including AI-generated summaries, is for general information only. See our <A href="/terms#no-advice">Terms of Service</A>.</P>
      </Details>

      <H2>Policies</H2>
      <Ul>
        <Li><A href="/privacy">Privacy Policy</A></Li>
        <Li><A href="/terms">Terms of Service</A></Li>
      </Ul>
    </>
  );
}
