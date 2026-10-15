import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Layout } from './Layout';
import { MarketingPage } from './MarketingPage';
import { PrivacyPage } from './PrivacyPage';
import { SupportPage } from './SupportPage';
import { TermsPage } from './TermsPage';
import type { SiteKind, SiteVars } from './types';

export { CLASSES } from './classes';
export type { PageProps, SiteKind, SiteVars } from './types';

const PAGES = {
  marketing: MarketingPage,
  support: SupportPage,
  privacy: PrivacyPage,
  terms: TermsPage,
} as const;

export const DOCTYPE = '<!DOCTYPE html>\n';

export function siteElement(kind: SiteKind, vars: SiteVars): ReactElement {
  const Page = PAGES[kind];
  return createElement(Layout, { vars }, createElement(Page, { vars }));
}

export function renderSitePage(kind: SiteKind, vars: SiteVars): string {
  return DOCTYPE + renderToStaticMarkup(siteElement(kind, vars));
}
