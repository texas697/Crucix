// The legacy #main started at opacity:0 and GSAP faded it in at boot. The React dashboard has no
// GSAP, so a ported `opacity:0` leaves every panel invisible (the map stays visible because it sits
// outside #main). Guard against that regressing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../dashboard/react/styles/dashboard.css', import.meta.url), 'utf8');

test('dashboard #main/.dashboard-main is not hidden', () => {
  const rules = [...css.matchAll(/\[data-surface="dashboard"\]\s*(?:#main|\.dashboard-main)[^{]*\{[^}]*\}/g)].map((m) => m[0]);
  assert.ok(rules.length > 0, 'expected at least one #main/.dashboard-main rule');
  for (const rule of rules) {
    assert.ok(!/opacity\s*:\s*0(?:[;\s}])/.test(rule), `#main must not start hidden (no GSAP in React): ${rule.slice(0, 80)}`);
  }
});
