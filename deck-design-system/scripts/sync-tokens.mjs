#!/usr/bin/env node
// Regenerate consumers from tokens.json. Dry run by default; pass --write to apply.
//   node sync-tokens.mjs            show what would change
//   node sync-tokens.mjs --write    apply
//   node sync-tokens.mjs --css demo print the :root block of a theme
import fs from 'node:fs';
import { CONSUMERS, HOUSE_START, HOUSE_END, loadSource, studioView, same, cssBlock, houseRegion } from './tokens-lib.mjs';

const args = process.argv.slice(2);
const write = args.includes('--write');
const src = loadSource();

const ci = args.indexOf('--css');
if (ci >= 0) {
  const theme = src.themes[args[ci + 1] ?? src.default];
  if (!theme) { console.error('unknown theme'); process.exit(2); }
  console.log(cssBlock(theme.css));
  process.exit(0);
}

const changes = [];

// presentation-studio tokens.json
const studioNext = JSON.stringify(studioView(src.themes.research), null, 2) + '\n';
const studioCur = fs.readFileSync(CONSUMERS.studioTokens, 'utf8');
if (!same(JSON.parse(studioCur), JSON.parse(studioNext))) changes.push([CONSUMERS.studioTokens, studioNext]);

// house-style.md generated region
const md = fs.readFileSync(CONSUMERS.houseStyle, 'utf8');
const region = houseRegion(md);
if (!region) { console.error('house-style.md has no markers; add them first'); process.exit(2); }
const inner = `\n\`\`\`css\n${cssBlock(src.themes.research.css)}\n\`\`\`\n`;
if (region.inner !== inner) changes.push([CONSUMERS.houseStyle, md.slice(0, region.a + HOUSE_START.length) + inner + md.slice(region.b)]);

// demo template :root (keep color-scheme)
const html = fs.readFileSync(CONSUMERS.demoTemplate, 'utf8');
const rootLine = ':root{' + Object.entries(src.themes.demo.css).map(([k, v]) => `${k}:${v}`).join(';') + ';color-scheme:light}';
const htmlNext = html.replace(/:root\s*\{[^}]*\}/, rootLine);
if (htmlNext !== html) changes.push([CONSUMERS.demoTemplate, htmlNext]);

if (!changes.length) { console.log('Everything already in sync.'); process.exit(0); }
for (const [file, content] of changes) {
  console.log(`${write ? 'WRITE' : 'WOULD WRITE'}  ${file}`);
  if (write) fs.writeFileSync(file, content);
}
if (!write) console.log('\nDry run. Re-run with --write to apply.');
