function normalize(value) {
  return String(value ?? '').trim().toLowerCase().replace(/^@/, '');
}

export function parseAllowlist(raw) {
  return [...new Set(String(raw || '').split(',').map(normalize).filter(Boolean))];
}

export function readAllowlist(env = process.env) {
  return parseAllowlist(env.TELEGRAM_CHATS);
}

export function isAllowed(dialog, allowlist) {
  if (!allowlist.length) return false;
  return allowlist.includes(normalize(dialog.id)) || allowlist.includes(normalize(dialog.title));
}

export function selectDialogs(dialogs, allowlist) {
  return dialogs.filter((d) => isAllowed(d, allowlist));
}
