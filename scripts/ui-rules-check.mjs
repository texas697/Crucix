#!/usr/bin/env node
// Scans dashboard/react for violations of ~/.claude/rules/rudys-rules.md.
// Usage: node scripts/ui-rules-check.mjs [subdir ...]   (exit 1 on any error)
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const targets = process.argv.slice(2).length ? process.argv.slice(2) : ['dashboard/react'];
const HARD_MAX = 220;
const WARN_AT = 161;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === 'dist') continue;
      walk(p, out);
    } else if (/\.(ts|tsx)$/.test(name) && !name.endsWith('.d.ts')) {
      out.push(p);
    }
  }
  return out;
}

const COMMENT_RE = /^\s*(\/\/|\/\*|\*\s|\*\/)/;
const DEFAULT_EXPORT_RE = /^\s*export\s+default\b/;
const INLINE_CLASS_RE = /className=(["'][^"']+["']|\{\s*["'`])/;
const CSS_IMPORT_RE = /^\s*import\s+['"][^'"]+\.css['"]/;
const CSS_INLINE_RE = /^\s*import\s+\w+\s+from\s+['"][^'"]+\.css\?inline['"]/;
// Stylesheet bridges (docs/UI_CONVENTIONS.md, "Stylesheet bridges"): the only file allowed to pull
// a third-party stylesheet through GlobalStyles is the MapLibre one; app surfaces never import CSS.
const LEGACY_STYLE_BRIDGES = new Set([
  'dashboard/react/features/map/components/MapLibreStyles/index.tsx',
]);

const errors = [];
const warnings = [];
let files = 0;

for (const target of targets) {
  for (const file of walk(join(ROOT, target))) {
    files += 1;
    const rel = relative(ROOT, file);
    const lines = readFileSync(file, 'utf8').split('\n');
    const count = lines.length - (lines.at(-1) === '' ? 1 : 0);
    if (count >= HARD_MAX) errors.push(`${rel}: ${count} lines (hard max ${HARD_MAX - 1})`);
    else if (count >= WARN_AT) warnings.push(`${rel}: ${count} lines (target 120, ceiling 160)`);
    let inBlock = false;
    lines.forEach((line, i) => {
      const n = i + 1;
      if (inBlock) {
        if (line.includes('*/')) inBlock = false;
        errors.push(`${rel}:${n}: comment`);
        return;
      }
      const stripped = line.replace(/(["'`])(?:\\.|(?!\1).)*\1/g, '""').replace(/https?:\/\/\S*/g, '');
      const isComment = COMMENT_RE.test(line) || /\/\*/.test(stripped) || /\s\/\/\s/.test(stripped);
      if (isComment) {
        errors.push(`${rel}:${n}: comment`);
        if (/\/\*/.test(stripped) && !stripped.includes('*/')) inBlock = true;
        return;
      }
      if (DEFAULT_EXPORT_RE.test(line)) errors.push(`${rel}:${n}: export default`);
      if (INLINE_CLASS_RE.test(line)) errors.push(`${rel}:${n}: inline className literal`);
      if (CSS_IMPORT_RE.test(line) && !rel.includes('/site/')) errors.push(`${rel}:${n}: css import (use MUI styled/theme)`);
      if (CSS_INLINE_RE.test(line) && !LEGACY_STYLE_BRIDGES.has(rel)) errors.push(`${rel}:${n}: inline css bridge outside the documented LegacyStyles files`);
    });
  }
}

for (const w of warnings) console.log(`WARN  ${w}`);
for (const e of errors) console.log(`ERROR ${e}`);
console.log(`\n${files} files scanned: ${errors.length} errors, ${warnings.length} warnings`);
process.exit(errors.length ? 1 : 0);
