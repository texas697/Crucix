import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { buildUrl, parseUrl, shapeFromUrl, shapeToUrl, pinToUrl, type Shape } from '../../dashboard/react/state/url';
import { createHistoryAdapter, type HistoryLike, type LocationLike } from '../../dashboard/react/state/history';
import { safeExternalUrl, isSafeExternalUrl } from '../../dashboard/react/shared/safeUrl';
import { renderMarkdown } from '../../dashboard/react/shared/markdown';
import { escapeJsonForScript, selectPublicBootstrap, serializeBootstrap } from '../../dashboard/react/shared/bootstrap';
import { applyTheme, readStoredTheme, resolveTheme, toggleTheme, type StorageLike } from '../../dashboard/react/shared/theme';
import { createTranslator, getPath, interpolate } from '../../dashboard/react/shared/locale';

function renderToHtml(node: React.ReactNode): HTMLElement {
  const { container } = render(<div>{node}</div>);
  return container;
}

describe('url', () => {
  it('parses path segments and query params', () => {
    expect(parseUrl('https://x.test/digest/abc%20d?filter=foryou&q=ai')).toEqual({
      path: ['digest', 'abc d'],
      q: { filter: 'foryou', q: 'ai' },
    });
  });

  it('builds and drops empty/false/null params', () => {
    expect(buildUrl('/', { hide: '', time: false, pin: null, shape: undefined })).toBe('/');
    // Non-empty values are kept verbatim; dropping defaults (e.g. region=world) is the caller's job.
    expect(buildUrl('/', { region: 'world' })).toBe('/?region=world');
    expect(buildUrl(['digest', 'abc'], { filter: 'all', open: 'abc', grid: '' })).toBe('/digest/abc?filter=all&open=abc');
  });

  it('encodes and decodes every geometry form', () => {
    const shapes: Shape[] = [
      { kind: 'circle', center: { lat: 12.346, lng: -45.679 }, radiusKm: 42 },
      { kind: 'rect', sw: { lat: 10, lng: 20 }, ne: { lat: 30, lng: 40 } },
      { kind: 'poly', ring: [{ lat: 1, lng: 2 }, { lat: 3, lng: 4 }, { lat: 5, lng: 6 }] },
    ];
    for (const shape of shapes) {
      const encoded = shapeToUrl(shape);
      expect(shapeFromUrl(encoded)).toEqual(shape);
    }
    expect(shapeToUrl({ kind: 'circle', center: { lat: 1, lng: 2 }, radiusKm: 3.6 })).toBe('c:1.000,2.000,4');
    expect(shapeToUrl(null)).toBe('');
  });

  it('drops a closing ring point and rejects malformed shapes', () => {
    const ring = [{ lat: 1, lng: 2 }, { lat: 3, lng: 4 }, { lat: 5, lng: 6 }, { lat: 1, lng: 2 }];
    expect(shapeToUrl({ kind: 'poly', ring })).toBe('p:1.000,2.000;3.000,4.000;5.000,6.000');
    expect(shapeFromUrl('p:1,2;3,4')).toBeNull();
    expect(shapeFromUrl('c:nan,x')).toBeNull();
    expect(shapeFromUrl('')).toBeNull();
  });

  it('encodes a pin at 3-decimal precision', () => {
    expect(pinToUrl({ lat: 1.23456, lng: -7.89012 })).toBe('1.235,-7.890');
  });
});

describe('history ownership', () => {
  function fakeHistory(): HistoryLike & { calls: string[] } {
    const calls: string[] = [];
    return {
      calls,
      state: null,
      length: 3,
      pushState() { calls.push('push'); },
      replaceState() { calls.push('replace'); },
      back() { calls.push('back'); },
    };
  }
  const loc: LocationLike = { href: 'https://x.test/', pathname: '/', search: '' };

  it('pushes on open and replaces on filter change', () => {
    const history = fakeHistory();
    const adapter = createHistoryAdapter(history, loc);
    expect(adapter.set('/', { region: 'europe' }, { push: true, state: { k: 'region' } })).toBe(true);
    expect(history.calls).toEqual(['push']);
    adapter.set('/', { region: 'europe', time: '24h' });
    expect(history.calls).toEqual(['push', 'replace']);
  });

  it('reports no change for an identical URL', () => {
    const history = fakeHistory();
    const adapter = createHistoryAdapter(history, { href: 'https://x.test/?a=1', pathname: '/', search: '?a=1' });
    expect(adapter.set('/', { a: '1' })).toBe(false);
    expect(history.calls).toEqual([]);
  });

  it('goes back only for an entry it owns', () => {
    const owned = fakeHistory();
    owned.state = { k: 'read' };
    expect(createHistoryAdapter(owned, loc).afterClose('read')).toBe('back');
    expect(owned.calls).toEqual(['back']);

    const other = fakeHistory();
    other.state = { k: 'list' };
    expect(createHistoryAdapter(other, loc).afterClose('read')).toBe('rewrite');
    expect(other.calls).toEqual([]);
  });
});

describe('safe URLs', () => {
  it('allows http(s) and rejects everything else', () => {
    expect(safeExternalUrl('https://example.com/a')).toBe('https://example.com/a');
    expect(safeExternalUrl('http://example.com')).toBe('http://example.com/');
    expect(safeExternalUrl('javascript:alert(1)')).toBeNull();
    expect(safeExternalUrl('data:text/html,x')).toBeNull();
    expect(isSafeExternalUrl('mailto:a@b.com')).toBe(false);
    expect(safeExternalUrl(null)).toBeNull();
  });

  it('resolves relative URLs against the base', () => {
    expect(safeExternalUrl('/p', 'https://x.test/digest')).toBe('https://x.test/p');
  });
});

describe('markdown', () => {
  it('maps headings, lists, rules and blockquotes', () => {
    const html = renderToHtml(renderMarkdown('# One\n\n- a\n- b\n\n1. x\n\n---\n\n> quote')).innerHTML;
    expect(html).toContain('<h2');
    expect(html).toContain('<ul');
    expect(html).toContain('<ol');
    expect(html).toContain('<hr');
    expect(html).toContain('<blockquote');
  });

  it('renders inline strong/em/code and safe links only', () => {
    const html = renderToHtml(renderMarkdown('**b** *i* `c` [ok](https://e.test/x) [bad](javascript:alert(1))')).innerHTML;
    expect(html).toContain('<strong>b</strong>');
    expect(html).toContain('<em>i</em>');
    expect(html).toContain('<code>c</code>');
    expect(html).toContain('href="https://e.test/x"');
    expect(html).not.toContain('href="javascript');
    expect(html).toContain('bad');
  });

  it('never emits markup from hostile content', () => {
    const container = renderToHtml(renderMarkdown('<script>alert(1)</script> <img src=x onerror=alert(1)>'));
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('<script>alert(1)</script>');
  });
});

describe('bootstrap', () => {
  it('keeps only allowlisted keys', () => {
    expect(selectPublicBootstrap({ locale: 'en', apiKey: 'secret', config: {}, login: { a: 1 } }))
      .toEqual({ locale: 'en', login: { a: 1 } });
  });

  it('escapes script terminators and line separators', () => {
    const out = escapeJsonForScript({ s: '</script><!-- \u2028 \u2029' });
    expect(out).not.toContain('</script>');
    expect(out).not.toContain('<');
    expect(out).toContain('<'.replace('<', '\\u003c'));
    const boot = serializeBootstrap({ locale: 'en', apiKey: 'leak' });
    expect(boot).toContain('__CRUCIX_BOOT__');
    expect(boot).not.toContain('leak');
  });
});

describe('theme', () => {
  it('defaults to dark and toggles by class', () => {
    expect(resolveTheme(readStoredTheme({ getItem: () => null, setItem: () => {} }))).toBe('dark');
    expect(toggleTheme('dark')).toBe('light');
    const root = document.createElement('html');
    applyTheme('light', root);
    expect(root.classList.contains('light')).toBe(true);
    applyTheme('dark', root);
    expect(root.classList.contains('light')).toBe(false);
  });

  it('survives denied storage', () => {
    const denied: StorageLike = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
    expect(readStoredTheme(denied)).toBeNull();
  });
});

describe('locale', () => {
  const en = { panels: { nuclearWatch: 'Nuclear Watch' }, count: 'You have {n} items' };

  it('looks up dotted paths and interpolates', () => {
    expect(getPath(en, 'panels.nuclearWatch')).toBe('Nuclear Watch');
    expect(interpolate('You have {n} items', { n: 3 })).toBe('You have 3 items');
    expect(interpolate('{missing}', {})).toBe('{missing}');
  });

  it('falls back to the fallback dict then the key', () => {
    const t = createTranslator({ panels: {} }, en);
    expect(t('panels.nuclearWatch')).toBe('Nuclear Watch');
    expect(t('nope.key')).toBe('nope.key');
    expect(t('count', { n: 2 })).toBe('You have 2 items');
    expect(t.has('panels.nuclearWatch')).toBe(true);
  });
});
