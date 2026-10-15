import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

export function readTreeSources(dir: string): string {
  const parts: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) parts.push(readTreeSources(path));
    else if (/\.(ts|tsx)$/.test(name)) parts.push(readFileSync(path, 'utf8'));
  }
  return parts.join('\n');
}
