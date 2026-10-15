// Public site pages (marketing / support / privacy / terms), rendered from the React
// components in dashboard/react/site at module load.
//
// The legacy server read dashboard/site/*.html and filled {{TOKENS}} with strings on every
// request. Here the same substitution contract is expressed as React: escaped text stays a
// string (React escapes it), APP_NAME_URL is encodeURIComponent(appName) inside the mailto:
// subject, and the raw-HTML fragments (store links, postal address line, legal meta block)
// become React nodes. Each page is rendered once, to a static HTML string, so there is no
// client bundle and the pages stay readable without JavaScript.
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DOCTYPE, siteElement } from '../react/site/index';

/** @typedef {'marketing'|'support'|'privacy'|'terms'} SiteKind */

const SITE_KINDS = /** @type {const} */ (['marketing', 'support', 'privacy', 'terms']);

/** `META` — the legal effective/last-updated block shown above the body. */
function legalMeta(effectiveDate) {
  return createElement('div', { className: 'meta' }, 'Effective ', effectiveDate, ' · Last updated ', effectiveDate);
}

/** `STORE_LINKS` — store buttons when configured, otherwise the coming-soon fallback. */
function storeLinksNode(config) {
  const links = [
    [config.appStoreUrl, 'Download on the App Store'],
    [config.playStoreUrl, 'Get it on Google Play'],
  ].filter(([url]) => url);
  if (!links.length) {
    return createElement('p', { className: 'soon' }, 'Coming soon to iPhone and Android');
  }
  return createElement(
    'div',
    { className: 'stores' },
    ...links.map(([url, label]) => createElement('a', { key: url, className: 'store', href: url, rel: 'noopener' }, label)),
  );
}

/** `POSTAL_ADDRESS_LINE` — leading line break plus the operator's mailing address, or null. */
function postalAddressLineNode(postalAddress) {
  return postalAddress
    ? createElement(Fragment, null, createElement('br'), 'Mail: ', postalAddress)
    : null;
}

/** Per-page `TITLE` / `DOC_TITLE` / `DESCRIPTION`, exactly as server.mjs derived them. */
const PAGE_META = {
  marketing: (c) => ({
    title: `${c.appName}: policy analysis, briefed`,
    docTitle: c.appName,
    description: `${c.appName} brings long-form analysis from think tanks, policy journals and global newsrooms into one feed, with AI summaries and cited deep dives.`,
    legal: false,
  }),
  support: (c) => ({
    title: 'Support',
    docTitle: `Support — ${c.appName}`,
    description: `Get help with ${c.appName}: contact support, FAQs and account deletion.`,
    legal: false,
  }),
  privacy: (c) => ({
    title: 'Privacy Policy',
    docTitle: `Privacy Policy — ${c.appName}`,
    description: `How ${c.operator} handles your information in ${c.appName}.`,
    legal: true,
  }),
  terms: (c) => ({
    title: 'Terms of Service',
    docTitle: `Terms of Service — ${c.appName}`,
    description: `Terms of Service for ${c.appName}.`,
    legal: true,
  }),
};

/**
 * Build the React `SiteVars` for one page from a `config.site` object.
 * @param {SiteKind} kind
 * @param {object} config
 * @param {string} [year]
 */
export function buildSiteVars(kind, config, year = String(new Date().getFullYear())) {
  const page = PAGE_META[kind](config);
  return {
    appName: config.appName,
    appNameUrl: encodeURIComponent(config.appName),
    operator: config.operator,
    contactEmail: config.contactEmail,
    jurisdiction: config.jurisdiction,
    postalAddressLine: postalAddressLineNode(config.postalAddress),
    storeLinks: storeLinksNode(config),
    year,
    title: page.title,
    docTitle: page.docTitle,
    description: page.description,
    meta: page.legal ? legalMeta(config.legalEffectiveDate) : null,
  };
}

/**
 * Render all four public site pages to complete HTML strings.
 * @param {object} config - the `config.site` object
 * @param {string} [year] - footer year (defaults to the current year)
 * @returns {{marketing: string, support: string, privacy: string, terms: string}}
 */
export function buildSitePages(config, year = String(new Date().getFullYear())) {
  /** @type {Record<string, string>} */
  const pages = {};
  for (const kind of SITE_KINDS) {
    const vars = buildSiteVars(kind, config, year);
    pages[kind] = DOCTYPE + renderToStaticMarkup(siteElement(kind, vars));
  }
  return pages;
}

/** Defaults mirroring crucix.config.mjs's `site` block, for the module-load render. */
function siteConfigFromEnv() {
  return {
    appName: process.env.SITE_APP_NAME || 'MFB Think Tank',
    operator: process.env.SITE_OPERATOR || 'MFB Services, Inc.',
    contactEmail: process.env.SITE_CONTACT_EMAIL || 'rsanchezdev697@gmail.com',
    postalAddress: process.env.SITE_POSTAL_ADDRESS || null,
    jurisdiction: process.env.SITE_JURISDICTION || 'the State of Texas',
    legalEffectiveDate: 'October 13, 2026',
    appStoreUrl: process.env.SITE_APP_STORE_URL || null,
    playStoreUrl: process.env.SITE_PLAY_STORE_URL || null,
  };
}

/** Render every page once at module load; the drop-in replacement for `server.mjs`'s `sitePages`. */
export const sitePages = buildSitePages(siteConfigFromEnv());
