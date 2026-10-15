import { CLASSES } from '../classes';
import { A } from '../components/SiteTags';
import siteCss from '../site.css?raw';
import type { LayoutProps } from '../types';

export function Layout({ vars, children }: LayoutProps) {
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
      <body className={CLASSES.page}>
        <main className={CLASSES.main}>
          <a className={CLASSES.brand} href="/mfb-think-tank">{appName}</a>
          <h1 className={CLASSES.title}>{title}</h1>
          {meta}
          {children}
          <footer className={CLASSES.footer}>
            <A className={CLASSES.footerLink} href="/mfb-think-tank">{appName}</A><A className={CLASSES.footerLink} href="/support">Support</A><A className={CLASSES.footerLink} href="/privacy">Privacy Policy</A><A className={CLASSES.footerLink} href="/terms">Terms of Service</A><A className={CLASSES.footerLink} href="/privacy#delete-account">Delete your account</A>
            <div className={CLASSES.footerCopy}>© {year} {operator}</div>
          </footer>
        </main>
      </body>
    </html>
  );
}
