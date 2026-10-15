#!/usr/bin/env node
import '../apis/utils/env.mjs';
import { getTelegramDialogs } from '../lib/telegram/client.mjs';
import { readAllowlist, isAllowed } from '../lib/telegram/selection.mjs';

const allowlist = readAllowlist();
const dialogs = await getTelegramDialogs({ limit: 200 });
console.log(`${dialogs.length} dialogs on this account. Put the ids (or exact titles) you want public into TELEGRAM_CHATS, comma-separated.\n`);
for (const d of dialogs) {
  const mark = isAllowed(d, allowlist) ? '*' : ' ';
  console.log(`${mark} ${d.id.padStart(16)}  ${d.type.padEnd(7)}  ${d.title}`);
}
console.log(`\n* = currently in TELEGRAM_CHATS (${allowlist.length} entries)`);
process.exit(0);
