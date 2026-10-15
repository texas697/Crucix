import { describe, expect, it } from 'vitest';
import {
  decodeText, formatUsd, gdeltSeverity, getAge, magColor, relTime, shortAge, srcClass,
} from '../../dashboard/react/features/dashboard/format';

const NOW = Date.parse('2026-10-14T12:00:00.000Z');
const at = (minAgo: number) => new Date(NOW - minAgo * 60_000).toISOString();

describe('dashboard format helpers', () => {
  it('formats relative times like the legacy variants', () => {
    expect(relTime(at(5), NOW)).toBe('5m ago');
    expect(relTime(at(180), NOW)).toBe('3h ago');
    expect(relTime(at(60 * 48), NOW)).toBe('2d ago');
    expect(relTime(null, NOW)).toBe('');
    expect(relTime(at(-5), NOW)).toBe('');

    expect(getAge(at(0), NOW)).toBe('just now');
    expect(getAge(at(120), NOW)).toBe('2h ago');
    expect(getAge(at(60 * 30), NOW)).toBe('1d ago');

    expect(shortAge(at(45), NOW)).toBe('45m');
    expect(shortAge(at(120), NOW)).toBe('2h');
    expect(shortAge(at(60 * 50), NOW)).toBe('2d');
  });

  it('formats USD volumes', () => {
    expect(formatUsd(null)).toBeNull();
    expect(formatUsd(0)).toBe('$0.0000');
    expect(formatUsd(0.00005)).toBe('<$0.0001');
    expect(formatUsd(0.5)).toBe('$0.500');
    expect(formatUsd(12.345)).toBe('$12.35');
  });

  it('classifies news sources', () => {
    expect(srcClass('BBC')).toBe('bbc');
    expect(srcClass('Al Jazeera')).toBe('alj');
    expect(srcClass('DW Africa')).toBe('af');
    expect(srcClass('MercoPress')).toBe('sa');
    expect(srcClass(null)).toBe('other');
  });

  it('maps GDELT types to severity', () => {
    expect(gdeltSeverity('Mass violence')).toBe(6);
    expect(gdeltSeverity('Armed clash')).toBe(5);
    expect(gdeltSeverity('Protest')).toBe(1);
    expect(gdeltSeverity('unknown')).toBe(0);
    expect(gdeltSeverity(null)).toBe(0);
  });

  it('colours magnitudes by band', () => {
    expect(magColor(6.1)).toBe('#ff5f63');
    expect(magColor(5)).toBe('#ff8a5c');
    expect(magColor(4.2)).toBe('#ffa94d');
    expect(magColor(3)).toBe('#f2c879');
  });

  it('decodes entities and strips tags without escaping', () => {
    expect(decodeText('a &amp; b &#39;c&#39; &#33; <b>x</b>')).toBe("a & b 'c' ! x");
    expect(decodeText(null)).toBe('');
  });
});
