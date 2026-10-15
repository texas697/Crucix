#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import '../apis/utils/env.mjs';

const ROOT = process.cwd();
const ENV_PATH = resolve(ROOT, '.env');

const DEFAULT_API_ID = '30574172';
const DEFAULT_API_HASH = '5f0f4ebf105f44c050c13b6fcd5e4b8d';

function updateEnvFile(entries) {
  let content = '';
  if (existsSync(ENV_PATH)) {
    content = readFileSync(ENV_PATH, 'utf-8');
  }

  const lines = content ? content.split('\n') : [];
  for (const [key, value] of Object.entries(entries)) {
    let replaced = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith(`${key}=`)) {
        lines[i] = `${key}=${value}`;
        replaced = true;
        break;
      }
    }
    if (!replaced) {
      lines.push(`${key}=${value}`);
    }
  }

  const newContent = lines.filter((l, idx) => idx === lines.length - 1 || l.trim() !== '' || lines[idx + 1]?.trim() !== '').join('\n') + '\n';
  writeFileSync(ENV_PATH, newContent, 'utf-8');
}

async function main() {
  const rl = readline.createInterface({ input, output });

  try {
    console.log('\n--- Telegram Account Authorization Helper ---');
    console.log('This script authenticates your Telegram personal account via MTProto and saves your session.\n');

    const apiIdStr = process.env.TELEGRAM_API_ID || await rl.question(`Telegram API ID [${DEFAULT_API_ID}]: `) || DEFAULT_API_ID;
    const apiHash = process.env.TELEGRAM_API_HASH || await rl.question(`Telegram API Hash [${DEFAULT_API_HASH}]: `) || DEFAULT_API_HASH;
    const apiId = parseInt(apiIdStr.trim(), 10);

    if (!apiId || isNaN(apiId)) {
      console.error('Invalid API ID.');
      process.exit(1);
    }
    if (!apiHash || apiHash.trim() === '') {
      console.error('Invalid API Hash.');
      process.exit(1);
    }

    const stringSession = new StringSession(process.env.TELEGRAM_SESSION || '');
    const client = new TelegramClient(stringSession, apiId, apiHash.trim(), {
      connectionRetries: 5,
    });

    console.log('\nConnecting to Telegram...');
    await client.start({
      phoneNumber: async () => {
        const phone = await rl.question('Enter your phone number (international format, e.g. +1234567890): ');
        return phone.trim();
      },
      password: async () => {
        const pwd = await rl.question('Enter your 2FA Cloud Password (if enabled): ');
        return pwd.trim();
      },
      phoneCode: async () => {
        const code = await rl.question('Enter the verification code sent to your Telegram app: ');
        return code.trim();
      },
      onError: (err) => {
        console.error('Telegram Auth Error:', err.message || err);
      },
    });

    console.log('\nSuccessfully connected to Telegram!');
    const sessionString = client.session.save();

    updateEnvFile({
      TELEGRAM_API_ID: String(apiId),
      TELEGRAM_API_HASH: apiHash.trim(),
      TELEGRAM_SESSION: sessionString,
    });

    console.log(`\nCredentials saved to ${ENV_PATH}`);
    console.log('You are all set! The session is saved and Crucix can now access your subscribed chats.');

    await client.disconnect();
  } catch (err) {
    console.error('\nAuthentication failed:', err.message || err);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();
