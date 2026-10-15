import type { AbArticle } from './areaBriefTypes';

export function abAge(value: unknown): string {
  if (!value) return '';
  const hours = (Date.now() - new Date(String(value)).getTime()) / 3600000;
  if (!(hours >= 0)) return '';
  if (hours < 1) return 'just now';
  if (hours < 24) return `${Math.floor(hours)}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function abFormatUsd(usd: number | null | undefined): string | null {
  if (usd == null) return null;
  if (usd === 0) return '$0.0000';
  if (usd < 0.0001) return '<$0.0001';
  return `$${usd.toFixed(usd < 0.01 ? 4 : usd < 1 ? 3 : 2)}`;
}

export function abLinkFor(article: AbArticle): string {
  return article.id ? `/digest?open=${encodeURIComponent(article.id)}` : (article.url || '#');
}
