import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Layout, type SiteVars } from './Layout';
import { MarketingPage } from './MarketingPage';
import { SupportPage } from './SupportPage';
import { PrivacyPage } from './PrivacyPage';
import { TermsPage } from './TermsPage';

export type { SiteVars } from './Layout';

export type SiteKind = 'marketing' | 'support' | 'privacy' | 'terms';

const PAGES = {
  marketing: MarketingPage,
  support: SupportPage,
  privacy: PrivacyPage,
  terms: TermsPage,
} as const;

/** Legacy pages begin with a doctype that React does not emit itself. */
export const DOCTYPE = '<!DOCTYPE html>\n';

/** The full document element (layout + page body) for a site page. */
export function siteElement(kind: SiteKind, vars: SiteVars): ReactElement {
  const Page = PAGES[kind];
  return createElement(Layout, { vars }, createElement(Page, { vars }));
}

/** Render one public site page to a complete HTML string, once, at build/start time. */
export function renderSitePage(kind: SiteKind, vars: SiteVars): string {
  return DOCTYPE + renderToStaticMarkup(siteElement(kind, vars));
}
