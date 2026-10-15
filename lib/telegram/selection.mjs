function normalize(value) {
  return String(value ?? '').trim().toLowerCase().replace(/^@/, '');
}

function splitEntries(raw) {
  return [...new Set(String(raw || '').split(',').map(normalize).filter(Boolean))];
}

export function parseGroups(raw) {
  const text = String(raw || '').trim();
  if (!text) return [];
  if (!text.includes(':')) return [{ name: null, entries: splitEntries(text) }];
  return text.split(';').map((part) => {
    const idx = part.indexOf(':');
    const name = idx >= 0 ? part.slice(0, idx).trim() : '';
    return { name: name || null, entries: splitEntries(idx >= 0 ? part.slice(idx + 1) : part) };
  }).filter((g) => g.entries.length);
}

export function parseAllowlist(raw) {
  return [...new Set(parseGroups(raw).flatMap((g) => g.entries))];
}

export function readAllowlist(env = process.env) {
  return parseAllowlist(env.TELEGRAM_CHATS);
}

export function readGroups(env = process.env) {
  return parseGroups(env.TELEGRAM_CHATS);
}

export function isAllowed(dialog, allowlist) {
  if (!allowlist.length) return false;
  return allowlist.includes(normalize(dialog.id)) || allowlist.includes(normalize(dialog.title));
}

export function selectDialogs(dialogs, allowlist) {
  return dialogs.filter((d) => isAllowed(d, allowlist));
}

export function groupDialogs(dialogs, groups) {
  const out = [];
  for (const group of groups) {
    for (const d of dialogs) {
      if (isAllowed(d, group.entries) && !out.some((x) => x.id === d.id)) out.push({ ...d, group: group.name });
    }
  }
  return out;
}
