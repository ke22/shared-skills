#!/usr/bin/env node
// Verify every consumer still matches deck-design-system/tokens.json. Exit 1 on drift.
import fs from 'node:fs';
import { CONSUMERS, STALE_COPIES, loadSource, studioView, same, parseVars, houseRegion, demoRootVars, cssBlockVars } from './tokens-lib.mjs';

const src = loadSource();
const { research, demo } = src.themes;
const errors = [], warns = [], oks = [];
const hex = /^#[0-9A-F]{6}$/i;

// 1. source sanity: semantic colors of every theme must be hex
for (const [name, theme] of Object.entries(src.themes))
  for (const [k, v] of Object.entries(theme.colors ?? {})) if (!hex.test(v)) errors.push(`source ${name}.colors.${k} is not #RRGGBB: ${v}`);

// 2. presentation-studio tokens.json == research theme
try {
  const studio = JSON.parse(fs.readFileSync(CONSUMERS.studioTokens, 'utf8'));
  if (same(studio, studioView(research))) oks.push('presentation-studio tokens.json');
  else errors.push('presentation-studio tokens.json differs from themes.research (run sync-tokens.mjs --write)');
} catch (e) { errors.push(`presentation-studio tokens.json unreadable: ${e.message}`); }

// 3. audience-deck house-style.md generated block == research.css
try {
  const md = fs.readFileSync(CONSUMERS.houseStyle, 'utf8');
  const region = houseRegion(md);
  if (!region) errors.push('house-style.md is missing the deck-tokens:research markers');
  else {
    const got = parseVars(region.inner);
    if (same(got, research.css)) oks.push('audience-deck house-style.md');
    else errors.push('house-style.md token block differs from themes.research.css (run sync-tokens.mjs --write)');
  }
} catch (e) { errors.push(`house-style.md unreadable: ${e.message}`); }

// 4. demo-player-deck template :root == demo.css
try {
  const vars = demoRootVars(fs.readFileSync(CONSUMERS.demoTemplate, 'utf8'));
  if (!vars) errors.push('demo deck-template.html has no :root block');
  else if (same(vars, demo.css)) oks.push('demo-player-deck deck-template.html');
  else errors.push('demo deck-template.html :root differs from themes.demo.css (run sync-tokens.mjs --write)');
} catch (e) { errors.push(`deck-template.html unreadable: ${e.message}`); }

// 5. iasdr bilingual template :root and zh-Hant blocks == iasdr.css / iasdr.cssZh
if (src.themes.iasdr) try {
  const html = fs.readFileSync(CONSUMERS.iasdrTemplate, 'utf8');
  const root = cssBlockVars(html, ':root{'), zh = cssBlockVars(html, '[lang="zh-Hant"]{');
  if (!root || !zh) errors.push('iasdr template is missing its :root or [lang="zh-Hant"] block');
  else if (same(root, src.themes.iasdr.css) && same(zh, src.themes.iasdr.cssZh)) oks.push('deck-design-system templates/iasdr.css (en + zh-Hant)');
  else errors.push('iasdr template CSS differs from themes.iasdr.css / cssZh');
} catch (e) { errors.push(`iasdr template unreadable: ${e.message}`); }

// 6. stale copies (warn only)
for (const f of STALE_COPIES) {
  if (!fs.existsSync(f)) continue;
  try {
    if (!same(JSON.parse(fs.readFileSync(f, 'utf8')), studioView(research))) warns.push(`stale copy drifted: ${f}`);
    else warns.push(`stale copy exists (currently identical, should be removed or linked): ${f}`);
  } catch { warns.push(`stale copy unreadable: ${f}`); }
}

oks.forEach(m => console.log('OK    ' + m));
warns.forEach(m => console.log('WARN  ' + m));
errors.forEach(m => console.log('FAIL  ' + m));
process.exit(errors.length ? 1 : 0);
