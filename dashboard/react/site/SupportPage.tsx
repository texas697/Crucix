import type { SiteVars } from './Layout';

/** Support page body from dashboard/site/support.html. */
export function SupportPage({ vars }: { vars: SiteVars }) {
  const { appName, appNameUrl, contactEmail } = vars;
  const supportHref = `mailto:${contactEmail}?subject=${appNameUrl}%20support`;
  const feedbackHref = `mailto:${contactEmail}?subject=${appNameUrl}%20feedback`;
  const deleteHref = `mailto:${contactEmail}?subject=Delete%20my%20${appNameUrl}%20account`;
  return (
    <>
      <p className="lead">Need help with {appName}? Email us at <a href={supportHref}>{contactEmail}</a> and we'll get back to you, usually within two business days. For bugs, a screenshot and a short description of what you were doing help us fix problems faster.</p>

      <div className="card">
        <h3>Contact support</h3>
        <p>Email: <a href={supportHref}>{contactEmail}</a><br />{' '}To help us help you, include your device model, operating system version, the app version, and what you were doing when the problem happened.</p>
      </div>

      <h2 id="faq">Frequently asked questions</h2>

      <details open>
        <summary>How do I sign in?</summary>
        <p>Create an account with your email address and a password, or continue with Google. Access may be limited to approved email addresses; if you're told your email isn't allowed, contact us.</p>
      </details>
      <details>
        <summary>I forgot my password.</summary>
        <p>On the sign-in screen, enter your email and tap <em>Forgot password</em>. We'll email you a link to set a new one. Check your spam folder if it doesn't arrive within a few minutes.</p>
      </details>
      <details>
        <summary>How do AI summaries and deep-dive research work?</summary>
        <p>AI features run on your own AI provider account. Add an API key from a supported provider (such as Anthropic, OpenAI, Google Gemini, xAI, Mistral or OpenRouter) in Settings. Your key is encrypted on our servers, is only used for requests you make, and any usage charges are billed to you by that provider. You can remove the key at any time.</p>
      </details>
      <details>
        <summary>How does the feed learn what I like?</summary>
        <p>Rate pieces with thumbs up or thumbs down. Your ratings help rank similar topics and sources higher in your feed. Rate a piece again to clear your rating.</p>
      </details>
      <details>
        <summary>An article is missing, wrong or won't load.</summary>
        <p>Articles come from third-party publishers, which occasionally change or remove pages. Email us with the article title and source, and we'll take a look.</p>
      </details>
      <details>
        <summary>How do I send feedback or report a bug?</summary>
        <p>Email <a href={feedbackHref}>{contactEmail}</a> with a description and, if you can, a screenshot. If your version of the app includes an in-app feedback option, you can use that instead; it lets you choose whether to attach a screenshot and diagnostic information. See our <a href="/privacy">Privacy Policy</a> for what is collected.</p>
      </details>
      <details id="delete-account">
        <summary>How do I delete my account?</summary>
        <p>In the app, go to <em>Settings → Account → Delete account</em>, or email <a href={deleteHref}>{contactEmail}</a> from the address on your account. Deleting your account permanently removes your account and associated data. Uninstalling the app does not delete your account. <a href="/privacy#delete-account">Details</a>.</p>
      </details>
      <details>
        <summary>Is {appName} financial or investment advice?</summary>
        <p>No. Content in {appName}, including AI-generated summaries, is for general information only. See our <a href="/terms#no-advice">Terms of Service</a>.</p>
      </details>

      <h2>Policies</h2>
      <ul>
        <li><a href="/privacy">Privacy Policy</a></li>
        <li><a href="/terms">Terms of Service</a></li>
      </ul>
    </>
  );
}
