import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import layoutHtml from '../../dashboard/site/layout.html?raw';
import marketingHtml from '../../dashboard/site/marketing.html?raw';
import supportHtml from '../../dashboard/site/support.html?raw';
import privacyHtml from '../../dashboard/site/privacy.html?raw';
import termsHtml from '../../dashboard/site/terms.html?raw';
import { CLASSES, renderSitePage, type SiteKind } from '../../dashboard/react/site/index';
// site.mjs is plain ESM with no type declarations; the surface it exports is asserted below.
// @ts-expect-error - TS7016: no declaration file for the JS server module
import { buildSitePages, buildSiteVars } from '../../dashboard/server/site.mjs';

const KINDS: SiteKind[] = ['marketing', 'support', 'privacy', 'terms'];

/** Classes still emitted by dashboard/server/site.mjs for the raw-HTML fragments (store links, legal meta). */
const LEGACY_FRAGMENT_CLASSES = ['meta', 'stores', 'store', 'soon'];

/** Fixed site config with values chosen to avoid HTML-entity differences. */
const config = {
  appName: 'MFB Think Tank',
  operator: 'MFB Services, Inc.',
  contactEmail: 'support@example.com',
  postalAddress: '500 Congress Ave, Austin, TX 78701',
  jurisdiction: 'the State of Texas',
  legalEffectiveDate: 'October 13, 2026',
  appStoreUrl: 'https://apps.apple.com/app/id123456789',
  playStoreUrl: 'https://play.google.com/store/apps/details?id=com.example.mfb',
};

const BODIES: Record<SiteKind, string> = {
  marketing: marketingHtml,
  support: supportHtml,
  privacy: privacyHtml,
  terms: termsHtml,
};

// --- Legacy filler, copied from server.mjs so the test can diff against it without touching
// --- the dashboard/site/*.html files at runtime (the ?raw imports are resolved at build time).

const escHtml = (s: string): string =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

const fillSite = (tpl: string, vars: Record<string, string>): string =>
  tpl.replace(/\{\{(\w+)\}\}/g, (m, k) => vars[k] ?? m);

function legacySiteVars(): Record<string, string> {
  const storeLinks = (
    [
      [config.appStoreUrl, 'Download on the App Store'],
      [config.playStoreUrl, 'Get it on Google Play'],
    ] as [string | null, string][]
  ).filter(([u]) => u) as [string, string][];
  return {
    APP_NAME: escHtml(config.appName),
    APP_NAME_URL: encodeURIComponent(config.appName),
    OPERATOR: escHtml(config.operator),
    CONTACT_EMAIL: escHtml(config.contactEmail),
    JURISDICTION: escHtml(config.jurisdiction),
    POSTAL_ADDRESS_LINE: config.postalAddress ? `<br>Mail: ${escHtml(config.postalAddress)}` : '',
    STORE_LINKS: storeLinks.length
      ? `<div class="stores">${storeLinks.map(([u, label]) => `<a class="store" href="${escHtml(u)}" rel="noopener">${label}</a>`).join('')}</div>`
      : '<p class="soon">Coming soon to iPhone and Android</p>',
    YEAR: '2026',
  };
}

const legacyLegalMeta = `<div class="meta">Effective ${escHtml(config.legalEffectiveDate)} · Last updated ${escHtml(config.legalEffectiveDate)}</div>`;

const LEGACY_META: Record<SiteKind, { title: string; docTitle: string; description: string; meta: string }> = {
  marketing: {
    title: `${config.appName}: policy analysis, briefed`,
    docTitle: config.appName,
    description: `${config.appName} brings long-form analysis from think tanks, policy journals and global newsrooms into one feed, with AI summaries and cited deep dives.`,
    meta: '',
  },
  support: {
    title: 'Support',
    docTitle: `Support — ${config.appName}`,
    description: `Get help with ${config.appName}: contact support, FAQs and account deletion.`,
    meta: '',
  },
  privacy: {
    title: 'Privacy Policy',
    docTitle: `Privacy Policy — ${config.appName}`,
    description: `How ${config.operator} handles your information in ${config.appName}.`,
    meta: legacyLegalMeta,
  },
  terms: {
    title: 'Terms of Service',
    docTitle: `Terms of Service — ${config.appName}`,
    description: `Terms of Service for ${config.appName}.`,
    meta: legacyLegalMeta,
  },
};

function legacyPage(kind: SiteKind): string {
  const vars = legacySiteVars();
  const meta = LEGACY_META[kind];
  const body = fillSite(BODIES[kind], vars);
  return fillSite(layoutHtml, {
    ...vars,
    TITLE: escHtml(meta.title),
    DOC_TITLE: escHtml(meta.docTitle),
    DESCRIPTION: escHtml(meta.description),
    META: meta.meta,
    BODY: body,
  });
}

// React and the legacy templates serialize the same DOM differently (void-element slashes,
// attribute casing, `charSet` vs `charset`, entity choices, JSX whitespace). Normalize both
// sides to the same canonical string; the scoped stylesheet is compared separately. Class and
// style attributes are dropped on both sides: the React tree carries the crucix-site- dictionary
// classes (asserted below) where the legacy templates used bare names or an inline style.
function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&');
}

function normalize(html: string): string {
  const s = html
    .replace(/<style>[\s\S]*?<\/style>/g, '<style></style>')
    .replace(/\s(?:class|style)="[^"]*"/g, '')
    .replace(/\sopen=""/g, ' open')
    .replace(/\/>/g, '>')
    .replace(/charSet=/g, 'charset=')
    .replace(/>\s+</g, '><')
    .replace(/\s+/g, ' ');
  return decodeEntities(s).trim();
}

describe('public site pages', () => {
  it('matches the legacy template output for every page (YEAR pinned)', () => {
    const pages = buildSitePages(config, '2026') as Record<SiteKind, string>;
    for (const kind of KINDS) {
      expect(normalize(pages[kind]), kind).toBe(normalize(legacyPage(kind)));
    }
  });

  it('renderSitePage agrees with buildSitePages', () => {
    const pages = buildSitePages(config, '2026') as Record<SiteKind, string>;
    for (const kind of KINDS) {
      const vars = buildSiteVars(kind, config, '2026');
      expect(renderSitePage(kind, vars), kind).toBe(pages[kind]);
    }
  });

  it('uses the process clock for the footer year by default (pinned)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-13T12:00:00Z'));
    try {
      const pages = buildSitePages(config) as Record<SiteKind, string>;
      expect(pages.marketing).toContain('© 2026 MFB Services, Inc.');
    } finally {
      vi.useRealTimers();
    }
  });

  it('preserves every legacy anchor id', () => {
    const pages = buildSitePages(config, '2026') as Record<SiteKind, string>;
    const privacyIds = [
      'summary', 'collect', 'not-collect', 'use', 'share', 'ai', 'retention', 'delete-account',
      'rights', 'security', 'transfers', 'children', 'changes', 'contact',
    ];
    const termsIds = [
      'eligibility', 'account', 'service', 'license', 'acceptable-use', 'no-advice', 'information',
      'byok', 'ip', 'purchases', 'termination', 'disclaimers', 'liability', 'disputes',
      'app-stores', 'general', 'contact',
    ];
    for (const id of privacyIds) expect(pages.privacy, `privacy #${id}`).toContain(`id="${id}"`);
    for (const id of termsIds) expect(pages.terms, `terms #${id}`).toContain(`id="${id}"`);
    expect(pages.support).toContain('id="faq"');
    expect(pages.support).toContain('id="delete-account"');
    // TOC targets are plain fragment links.
    expect(pages.privacy).toContain('href="#delete-account"');
    expect(pages.terms).toContain('href="#no-advice"');
  });

  it('keeps the first support FAQ <details> open and the rest closed', () => {
    const pages = buildSitePages(config, '2026') as Record<SiteKind, string>;
    const support = pages.support;
    // React serializes the boolean attribute as open=""; both it and the legacy bare `open` match.
    expect(support).toMatch(/<details open(?:="")? class="[^"]*">/);
    expect((support.match(/<details open/g) || []).length).toBe(1);
    expect((support.match(/<details/g) || []).length).toBe(8);
  });

  it('encodes the app name inside the mailto: subject', () => {
    const pages = buildSitePages(config, '2026') as Record<SiteKind, string>;
    expect(pages.support).toContain('mailto:support@example.com?subject=MFB%20Think%20Tank%20support');
    expect(pages.support).toContain('mailto:support@example.com?subject=MFB%20Think%20Tank%20feedback');
    expect(pages.support).toContain('mailto:support@example.com?subject=Delete%20my%20MFB%20Think%20Tank%20account');
    expect(pages.privacy).toContain('mailto:support@example.com?subject=Delete%20my%20MFB%20Think%20Tank%20account');
  });

  it('renders store anchors when configured and the coming-soon line otherwise', () => {
    const withStores = buildSitePages(config, '2026') as Record<SiteKind, string>;
    expect(withStores.marketing).toContain('class="stores"');
    expect(withStores.marketing).toContain('href="https://apps.apple.com/app/id123456789"');
    expect(withStores.marketing).toContain('Get it on Google Play');
    expect(withStores.marketing).not.toContain('class="soon"');

    const withoutStores = buildSitePages({ ...config, appStoreUrl: null, playStoreUrl: null }, '2026') as Record<SiteKind, string>;
    expect(withoutStores.marketing).toContain('<p class="soon">Coming soon to iPhone and Android</p>');
    expect(withoutStores.marketing).not.toContain('class="stores"');
  });

  it('renders the postal address line only when one is configured', () => {
    const withAddress = buildSitePages(config, '2026') as Record<SiteKind, string>;
    expect(withAddress.privacy).toContain('Mail: 500 Congress Ave, Austin, TX 78701');
    expect(withAddress.terms).toContain('Mail: 500 Congress Ave, Austin, TX 78701');

    const withoutAddress = buildSitePages({ ...config, postalAddress: null }, '2026') as Record<SiteKind, string>;
    expect(withoutAddress.privacy).not.toContain('Mail:');
  });

  it('sets the title and meta description for each page', () => {
    const pages = buildSitePages(config, '2026') as Record<SiteKind, string>;
    expect(pages.marketing).toContain('<title>MFB Think Tank</title>');
    expect(pages.support).toContain('<title>Support — MFB Think Tank</title>');
    expect(pages.privacy).toContain('<title>Privacy Policy — MFB Think Tank</title>');
    expect(pages.terms).toContain('<title>Terms of Service — MFB Think Tank</title>');
    expect(pages.marketing).toContain(`content="${LEGACY_META.marketing.description}"`);
    expect(pages.privacy).toContain(`content="${LEGACY_META.privacy.description}"`);
  });

  it('inlines the scoped stylesheet with the print rules preserved', () => {
    // Vitest stubs `.css?raw` to an empty string, so the source stylesheet is checked directly;
    // a real Vite build inlines the same text into the <style> element via the ?raw import.
    const here = (import.meta as ImportMeta & { dirname: string }).dirname;
    const siteCss = readFileSync(join(here, '../../dashboard/react/site/site.css'), 'utf8');
    const pages = buildSitePages(config, '2026') as Record<SiteKind, string>;
    expect(siteCss).toContain(`.${CLASSES.page}`);
    expect(siteCss).toContain('--bg:#05070b');
    expect(siteCss).toContain('@media print');
    expect(pages.support).toContain('<style>');
    expect(pages.support).toContain(`<footer class="${CLASSES.footer}">`);
    expect(pages.support).toContain(`<body class="${CLASSES.page}">`);
  });

  it('puts a crucix-site- dictionary class on every rendered element', () => {
    const pages = buildSitePages(config, '2026') as Record<SiteKind, string>;
    const known = new Set<string>([...Object.values(CLASSES), ...LEGACY_FRAGMENT_CLASSES]);
    const skip = new Set(['html', 'head', 'meta', 'title', 'link', 'style', 'br']);
    for (const kind of KINDS) {
      const body = pages[kind].replace(/<style>[\s\S]*?<\/style>/, '');
      for (const [tag, name, attrs] of body.matchAll(/<([a-z][a-z0-9]*)([^>]*)>/g)) {
        if (skip.has(name as string)) continue;
        const classAttr = /\sclass="([^"]*)"/.exec(attrs as string);
        expect(classAttr, `${kind}: ${tag}`).not.toBeNull();
        for (const token of (classAttr as RegExpExecArray)[1]!.split(/\s+/)) {
          expect(known.has(token), `${kind}: ${tag} has unknown class ${token}`).toBe(true);
        }
      }
    }
  });

  it('styles only classes that exist in the dictionary', () => {
    const here = (import.meta as ImportMeta & { dirname: string }).dirname;
    const siteCss = readFileSync(join(here, '../../dashboard/react/site/site.css'), 'utf8');
    const values = new Set<string>(Object.values(CLASSES));
    const selectors = [...siteCss.matchAll(/\.(crucix-site-[\w-]+)/g)].map(([, name]) => name as string);
    expect(selectors.length).toBeGreaterThan(0);
    for (const name of selectors) expect(values.has(name), name).toBe(true);
    for (const name of LEGACY_FRAGMENT_CLASSES) expect(siteCss).toContain(`.${CLASSES.page} .${name}`);
  });
});
