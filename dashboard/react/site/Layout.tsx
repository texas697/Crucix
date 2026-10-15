import type { PropsWithChildren, ReactNode } from 'react';
import siteCss from './site.css?raw';

/**
 * The substitution contract shared by every public site page. These are the same values
 * server.mjs builds into its `siteVars` object, but typed: React escapes the plain strings, the
 * URL is pre-encoded for `mailto:` subjects, and the fragments that were raw HTML in the legacy
 * templates arrive as React nodes.
 */
export interface SiteVars {
  /** `APP_NAME` — plain text; React escapes it. */
  appName: string;
  /** `APP_NAME_URL` — `encodeURIComponent(appName)`, used inside `mailto:` subjects. */
  appNameUrl: string;
  /** `OPERATOR` — plain text; React escapes it. */
  operator: string;
  /** `CONTACT_EMAIL` — plain text used in `mailto:` links and as link text. */
  contactEmail: string;
  /** `JURISDICTION` — plain text; React escapes it. */
  jurisdiction: string;
  /** `POSTAL_ADDRESS_LINE` — leading `<br>` plus the operator's mailing address, or `null`. */
  postalAddressLine: ReactNode;
  /** `STORE_LINKS` — store buttons or the coming-soon fallback. */
  storeLinks: ReactNode;
  /** `YEAR` — four-digit year for the footer copyright. */
  year: string;
  /** `TITLE` — the `<h1>`. */
  title: string;
  /** `DOC_TITLE` — the `<title>`. */
  docTitle: string;
  /** `DESCRIPTION` — the meta description. */
  description: string;
  /** `META` — the legal effective/last-updated block, or `null` for non-legal pages. */
  meta: ReactNode;
}

/** The shared document shell from dashboard/site/layout.html. */
export function Layout({ vars, children }: PropsWithChildren<{ vars: SiteVars }>) {
  const { appName, operator, docTitle, description, title, meta, year } = vars;
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{docTitle}</title>
        <meta name="description" content={description} />
        <link rel="icon" href="/brand/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/brand/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/brand/favicon-16.png" />
        <link rel="apple-touch-icon" href="/brand/apple-touch-icon-180.png" />
        <style>{siteCss}</style>
      </head>
      <body className="site-page">
        <main>
          <a className="brand" href="/mfb-think-tank">{appName}</a>
          <h1>{title}</h1>
          {meta}
          {children}
          <footer>
            <a href="/mfb-think-tank">{appName}</a><a href="/support">Support</a><a href="/privacy">Privacy Policy</a><a href="/terms">Terms of Service</a><a href="/privacy#delete-account">Delete your account</a>
            <div style={{ marginTop: '8px' }}>© {year} {operator}</div>
          </footer>
        </main>
      </body>
    </html>
  );
}
