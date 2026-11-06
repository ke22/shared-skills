#!/usr/bin/env node
// Copy the iasdr runtime (converter, lint, stylesheet, manifest, tokens, fonts) into presentation-studio,
// so the workbench and its portable release can render iasdr decks without reaching into shared-skills.
// The copy mirrors this folder's layout, so the scripts resolve manifest.json / templates/ unchanged.
// Usage: node scripts/sync-runtime.mjs [--check] [--target <dir>]
//   --check  exit 1 if any copied file differs from (or is missing next to) its source
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2), opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const TARGET = path.resolve(opt('--target') || path.join(ROOT, '../../presentation-studio/skills/research-deck-production/iasdr'));
export const RUNTIME_FILES = [
  'scripts/html-to-pptx.mjs', 'scripts/pptx-post.mjs', 'scripts/browser-lib.mjs', 'scripts/lint-deck.mjs', 'scripts/lint-rules.mjs',
  'manifest.json', 'tokens.json', 'templates/iasdr.css',
  'templates/fonts/OFL-Manrope.txt', 'templates/fonts/OFL-Inter.txt', 'templates/fonts/OFL-NotoSansTC.txt',
];
const FONTS = ['templates/fonts/Manrope-wght.ttf', 'templates/fonts/Inter-opsz-wght.ttf', 'templates/fonts/NotoSansTC-wght.ttf'];  // gitignored on both sides
const README = `# iasdr runtime (copied — do not edit)

Copied from \`shared-skills/deck-design-system\` by \`scripts/sync-runtime.mjs\`. Edit the source there,
then run \`node scripts/sync-runtime.mjs\` (and \`--check\` in its test suite).

Fonts (\`templates/fonts/*.ttf\`) are not in Git; \`sync-runtime.mjs\` copies them when the source has
them (\`scripts/fetch-fonts.sh\`). Without them the workbench falls back to installed or Google fonts.
`;

if (!fs.existsSync(path.dirname(TARGET))) { console.log(`SKIP  ${path.dirname(TARGET)} not found`); process.exit(0); }
const same = (a, b) => fs.existsSync(b) && Buffer.compare(fs.readFileSync(a), fs.readFileSync(b)) === 0;
const files = [...RUNTIME_FILES.map(f => [f, true]), ...FONTS.filter(f => fs.existsSync(path.join(ROOT, f))).map(f => [f, false])];
if (args.includes('--check')) {
  const stale = files.filter(([f, required]) => required && !same(path.join(ROOT, f), path.join(TARGET, f))).map(([f]) => f);
  const fontsMissing = FONTS.filter(f => !fs.existsSync(path.join(TARGET, f)));
  console.log(stale.length ? `FAIL  studio iasdr runtime is stale: ${stale.join(', ')} (run node scripts/sync-runtime.mjs)` : `OK    studio iasdr runtime matches (${RUNTIME_FILES.length} files)${fontsMissing.length ? ` · fonts not copied: ${fontsMissing.length}` : ''}`);
  process.exit(stale.length ? 1 : 0);
}
let copied = 0;
for (const [f] of files) {
  const src = path.join(ROOT, f), dst = path.join(TARGET, f);
  if (same(src, dst)) continue;
  fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.copyFileSync(src, dst); copied++;
}
fs.writeFileSync(path.join(TARGET, 'README.md'), README);
fs.writeFileSync(path.join(TARGET, '.gitignore'), '# font binaries are fetched, not committed (see README.md)\ntemplates/fonts/*.ttf\n');
console.log(`synced ${copied} file(s) → ${path.relative(process.cwd(), TARGET) || TARGET}`);
