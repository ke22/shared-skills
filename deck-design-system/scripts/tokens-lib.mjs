import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SKILL_ROOT = fileURLToPath(new URL('..', import.meta.url));
// scripts/ -> deck-design-system/ -> shared-skills/ -> 01_Github/
export const WORKSPACE = path.resolve(SKILL_ROOT, '..', '..');
export const SOURCE = path.join(SKILL_ROOT, 'tokens.json');

// Every place that holds a copy or projection of the tokens.
export const CONSUMERS = {
  studioTokens: path.join(WORKSPACE, 'presentation-studio/skills/research-deck-production/assets/tokens.json'),
  houseStyle: path.join(WORKSPACE, 'shared-skills/audience-deck/references/house-style.md'),
  demoTemplate: path.join(WORKSPACE, 'shared-skills/demo-player-deck/assets/deck-template.html'),
  iasdrTemplate: path.join(SKILL_ROOT, 'templates/iasdr.css'),
};
// Known stale copies: reported as warnings, never rewritten.
export const STALE_COPIES = [
  path.join(WORKSPACE, '訪談LLMwiki/skill/research-deck-production/assets/tokens.json'),
];

export const HOUSE_START = '<!-- deck-tokens:research:start -->';
export const HOUSE_END = '<!-- deck-tokens:research:end -->';

export function loadSource() {
  const src = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));
  if (src.schemaVersion !== '2.0' || !src.themes?.[src.default]) throw new Error('tokens.json: bad schemaVersion or default theme');
  return src;
}

/** The studio file format = research theme without label/css. */
export function studioView(theme) {
  const { label, css, ...rest } = theme;
  return rest;
}

export function stable(v) {
  if (Array.isArray(v)) return v.map(stable);
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map(k => [k, stable(v[k])]));
  return v;
}
export const same = (a, b) => JSON.stringify(stable(a)) === JSON.stringify(stable(b));

export function cssBlock(vars) {
  return ':root {\n' + Object.entries(vars).map(([k, v]) => `  ${k}: ${v};`).join('\n') + '\n}';
}

/** Parse `--name: value;` declarations (first :root block text). */
export function parseVars(text) {
  const out = {};
  for (const m of text.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim().replace(/\s*\/\*.*$/, '');
  return out;
}

export function houseRegion(md) {
  const a = md.indexOf(HOUSE_START), b = md.indexOf(HOUSE_END);
  if (a < 0 || b < a) return null;
  return { a, b, inner: md.slice(a + HOUSE_START.length, b) };
}

export function demoRootVars(html) {
  const m = html.match(/:root\s*\{([^}]*)\}/);
  if (!m) return null;
  const vars = parseVars(m[1] + ';');
  delete vars['color-scheme'];
  return vars;
}

// ---- iasdr semantic layer (L1): tokens.json themes.iasdr.semantic -> a generated block in iasdr.css ----
export const SEM_START = '/* deck-tokens:semantic:start — generated from tokens.json themes.iasdr.semantic by scripts/sync-tokens.mjs; do not edit */';
export const SEM_END = '/* deck-tokens:semantic:end */';
export function semanticCss(theme) {
  const s = theme.semantic, base = theme.css;
  const refs = [...s.tokens.map(t => t.ref), ...Object.values(s.contexts).flatMap(c => Object.values(c.tokens)), ...s.aliases.map(a => a.aliasOf)];
  const missing = refs.filter(r => !(r in base));
  if (missing.length) throw new Error(`semantic refs not in themes.iasdr.css: ${[...new Set(missing)].join(', ')}`);
  const names = new Set(s.tokens.map(t => t.name)), unknown = Object.values(s.contexts).flatMap(c => Object.keys(c.tokens)).filter(n => !names.has(n));
  if (unknown.length) throw new Error(`context overrides a token that is not defined: ${unknown.join(', ')}`);
  for (const a of s.aliases) if (base[a.name] !== base[a.aliasOf]) throw new Error(`alias ${a.name} (${base[a.name]}) no longer equals ${a.aliasOf} (${base[a.aliasOf]}): update the alias record`);
  const decl = pairs => pairs.map(([k, r]) => `${k}:var(${r})`).join(';');
  return [SEM_START, `:root{${decl(s.tokens.map(t => [t.name, t.ref]))}}`, ...Object.values(s.contexts).map(c => `${c.selector}{${decl(Object.entries(c.tokens))}}`), SEM_END].join('\n');
}
export function semanticRegion(css) {
  const a = css.indexOf(SEM_START), b = css.indexOf(SEM_END);
  return a < 0 || b < a ? null : { a, b: b + SEM_END.length, text: css.slice(a, b + SEM_END.length) };
}

/** Parse a CSS block by its selector prefix, e.g. ':root{' or '[lang="zh-Hant"]{'. */
export function cssBlockVars(html, opener) {
  const i = html.indexOf(opener); if (i < 0) return null;
  const j = html.indexOf('\n}', i); if (j < 0) return null;
  return Object.fromEntries([...html.slice(i + opener.length, j).matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(m => [m[1], m[2].trim()]));
}
