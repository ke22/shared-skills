#!/usr/bin/env node
// Build manifest.json: the machine-readable component list that both the generator (AI)
// and the checker (lint-deck.mjs) read. Nothing here is hand-maintained data except the
// selector map and text-slot map below; everything else is derived from:
//   references/components.md  -> id, name, group, purpose, spec, used-by
//   templates/iasdr.css        -> whether each selector exists, which tokens it uses, all defined classes
//   templates/iasdr-layouts.html + iasdr-deck.html (rendered) -> where each component appears, layout composition
//   tokens.json themes.iasdr   -> text roles (size, line height, weight) per language
// Usage:  node scripts/build-manifest.mjs           write manifest.json
//         node scripts/build-manifest.mjs --check   exit 1 if manifest.json is stale
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { openPage } from './browser-lib.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const P = f => path.join(ROOT, f);
const read = f => fs.readFileSync(P(f), 'utf8');
const hash = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);

// --- the only hand-kept mapping: component id -> CSS selectors that identify it in a page ---
const SELECTORS = {
  C01: ['.tb', '.eyebrow'], C02: ['.runhead'], C03: ['.secmark'], C04: ['.pnum'], C05: ['.src'], C06: ['.slide.field'],
  C07: ['.display', '.big'], C08: ['.kicker'], C09: ['.lead'], C10: ['.band'], C11: ['.cite'], C12: ['.quote'], C13: ['.qbox'],
  C14: ['.card'], C15: ['.num'], C16: ['.icard', '.hcard'], C17: ['.person'], C18: ['.callout'], C19: ['.ba'], C20: ['.seccard'],
  C21: ['.chip'], C22: ['.idtag'], C23: ['.role'], C24: ['.legend'], C25: ['.dot'], C26: ['tr.sev'], C27: ['.focus'], C28: ['.summary .lab'],
  C29: ['.stat'], C30: ['.cluster'], C31: ['.hero'], C32: ['.chart'], C33: ['table.tbl'], C34: ['table.tbl .dot'], C35: ['table.tbl tr.sev'],
  C36: ['.arr'], C37: ['.rail'], C38: ['.chev'], C39: ['.dia'], C40: ['.funnel'], C41: ['.dur'], C42: ['.tline'], C43: ['.gtl'],
  C44: ['.bp'], C45: ['.bp .line'], C46: ['.channels'], C47: ['.decision'], C48: ['.circ', '.node'], C49: ['.net-node', '.sysbar'],
  C50: ['.zone'], C51: ['.pin'], C52: ['.rule'], C53: ['.phone', '.desk'], C54: ['.screen'], C55: ['.photo'], C56: ['.mosaic'],
  C57: ['.artifact'], C58: ['.avatar'], C59: ['.logo', '.logo-slot'], C60: ['.qr'], C61: ['.ic', '.icon'], C62: ['.figure'],
  C63: ['.illus'], C64: ['.photo-wash'], C65: ['.verdict'], C66: ['.annot'],
};
// --- which text roles a component's slots use (limits come from TEXT_RULES) ---
const SLOTS = {
  C01: { eyebrow: 'eyebrow', title: 'h1' }, C07: { text: 'display|statement' }, C08: { text: 'kicker' }, C09: { text: 'lead' },
  C10: { text: 'body-l' }, C11: { text: 'caption' }, C12: { quote: 'body-l', by: 'caption' }, C13: { question: 'lead' },
  C15: { number: 'h2', heading: 'h3', body: 'body' }, C16: { heading: 'h3', body: 'body' }, C17: { name: 'h3', org: 'body', body: 'body', members: 'caption' },
  C19: { label: 'chip', heading: 'h3', items: 'body' }, C20: { number: 'stat', name: 'h3', items: 'body' }, C21: { label: 'chip' },
  C22: { code: 'idtag' }, C23: { label: 'body' }, C24: { label: 'caption' }, C28: { label: 'h2' }, C29: { value: 'stat', label: 'caption' },
  C31: { value: 'display', definition: 'caption' }, C33: { header: 'body', cell: 'body' }, C37: { label: 'body-l' }, C38: { label: 'body' },
  C42: { version: 'h3', note: 'body' }, C43: { group: 'h3', cell: 'body' }, C44: { role: 'body', cell: 'caption' }, C48: { label: 'body|h3' },
  C51: { number: 'chip', heading: 'h3', body: 'body' },
  C62: { caption: 'caption' }, C65: { word: 'caption', judgement: 'h3' }, C66: { title: 'body', note: 'caption' },
};
// --- limits that the typesetting docs state as rules (checked by lint-deck.mjs) ---
const TEXT_RULES = {
  h1: { maxLines: 2, zhMaxCjkPerLine: 20, note: 'assertion sentence; author sets Chinese breaks' },
  display: { maxLines: { en: 3, zh: 2 } }, statement: { maxLines: 4 }, lead: { maxLines: 2, align: 'center allowed' },
  'body-l': { measure: { en: [60, 75], zh: [22, 32] } }, body: { measure: { en: [60, 75], zh: [22, 32] } },
  chip: { singleLine: true }, idtag: { maxChars: 4 }, micro: { minPx: 18, note: 'nothing smaller anywhere' },
  field: { minPx: 24, minWeight: 700, orMinPx: 32, note: 'text placed directly on the blue field' },
};

function parseComponentsDoc() {
  const md = read('references/components.md');
  const out = {}; let group = '';
  for (const line of md.split('\n')) {
    const g = line.match(/^## ([A-H])\. (.+)$/); if (g) group = `${g[1]} ${g[2]}`;
    const m = line.match(/^\| (C\d\d) \| ([^|]+)\| ([^|]+)\| ([^|]+)\| ([^|]+)\| ([^|]+)\| ([^|]+)\| ([^|]+)\|/);
    if (!m) continue;
    const [, id, name, purpose, spec, zh, used] = m.map(s => s.trim());
    out[id] = { id, name, group, purpose, spec, zhNote: zh === '—' ? '' : zh, docUsedBy: [...new Set(used.match(/N\d\d[a-d]?/g) || [])] };
  }
  out.C61 = { id: 'C61', name: 'icon', group: 'H icon', purpose: 'Lucide line icons', spec: 'see components.md section H', zhNote: '', docUsedBy: [] };
  return out;
}

function cssFacts(css) {
  const rules = [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(m => ({ sel: m[1].trim(), body: m[2] }));
  const classes = new Set(rules.flatMap(r => [...r.sel.matchAll(/\.([A-Za-z][\w-]*)/g)].map(m => m[1])));
  const tokensFor = sels => {
    const keys = sels.flatMap(s => [...s.matchAll(/\.([A-Za-z][\w-]*)/g)].map(m => m[1]));
    const last = sels.map(s => (s.match(/\.([A-Za-z][\w-]*)[^.]*$/) || [])[1]).filter(Boolean);
    const set = new Set();
    for (const r of rules) if (last.some(k => new RegExp(`\\.${k}(?![\\w-])`).test(r.sel))) for (const v of r.body.matchAll(/var\((--[\w-]+)/g)) set.add(v[1]);
    return [...set].sort();
  };
  return { classes, tokensFor };
}

async function renderFacts() {
  const merged = { used: {}, layouts: {} };
  for (const file of ['templates/iasdr-layouts.html', 'templates/iasdr-deck.html']) {
  const { browser, page, errors } = await openPage(P(file));
  const facts = await page.evaluate(SEL => {
    const used = {}, layouts = {};
    document.querySelectorAll('.slide').forEach(s => {
      const id = s.dataset.layout, lang = s.closest('[lang]').lang;
      for (const [c, sels] of Object.entries(SEL)) if (sels.some(q => s.matches(q) || s.querySelector(q))) {
        (used[c] ??= new Set()).add(id);
        if (lang === 'en') (layouts[id] ??= new Set()).add(c);
      }
    });
    const j = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, [...v].sort()]));
    return { used: j(used), layouts: j(layouts) };
  }, SELECTORS);
  await browser.close();
  if (errors.length) throw new Error(file + ' page errors: ' + errors.join(' | '));
  for (const [k, v] of Object.entries(facts.used)) merged.used[k] = [...new Set([...(merged.used[k] || []), ...v])].sort();
  Object.assign(merged.layouts, facts.layouts);
  }
  return merged;
}

// colour facts for readers and tools: contrast tier per base colour (as text/marks on the light page),
// the semantic layer resolved to values, and alias records (tokens.json themes.iasdr.semantic)
function colorFacts(theme) {
  const lum = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(x => x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const page = theme.colors.bgA, r2 = n => Math.round(n * 100) / 100;
  const tier = h => { const m = Math.min(ratio(h, '#FFFFFF'), ratio(h, page)); return m >= 4.5 ? 'text' : m >= 3 ? 'large' : 'decor'; };
  const sem = theme.semantic ?? { tokens: [], contexts: {}, aliases: [], channels: {} };
  const aliasOf = Object.fromEntries(sem.aliases.map(a => [a.name, a]));
  const base = Object.entries(theme.css).filter(([, v]) => /^#[0-9a-f]{6}$/i.test(v)).map(([name, value]) => ({
    name, value: value.toUpperCase(), onWhite: r2(ratio(value, '#FFFFFF')), onPage: r2(ratio(value, page)), tier: tier(value),
    aliasOf: aliasOf[name]?.aliasOf ?? null, aliasReason: aliasOf[name]?.reason ?? null,
  }));
  const valueOf = n => theme.css[n]?.toUpperCase() ?? null;
  return {
    tierRule: 'text: >= 4.5:1 on white and on the page background; large: >= 3:1 (24px bold or 32px and up); decor: below 3:1, not for text',
    channels: sem.channels, base,
    usesLegend: sem.usesLegend ?? {},
    // tier: as ink on the light page; fillTier: white text or icons on it (only for tokens used as a fill)
    semantic: sem.tokens.map(t => ({ ...t, value: valueOf(t.ref), tier: valueOf(t.ref) ? tier(valueOf(t.ref)) : null,
      fillTier: (t.uses ?? []).includes('fill') && valueOf(t.ref) ? (r => r >= 4.5 ? 'text' : r >= 3 ? 'large' : 'decor')(ratio(valueOf(t.ref), '#FFFFFF')) : null,
      contexts: Object.fromEntries(Object.entries(sem.contexts).filter(([, c]) => c.tokens[t.name]).map(([k, c]) => [k, { ref: c.tokens[t.name], value: valueOf(c.tokens[t.name]) }])) })),
    contexts: Object.fromEntries(Object.entries(sem.contexts).map(([k, c]) => [k, { selector: c.selector, note: c.note }])),
  };
}

async function build() {
  const css = read('templates/iasdr.css');
  const theme = JSON.parse(read('tokens.json')).themes.iasdr;
  const doc = parseComponentsDoc();
  const { classes, tokensFor } = cssFacts(css);
  const { used, layouts } = await renderFacts();
  const components = Object.keys(SELECTORS).sort().map(id => {
    const sels = SELECTORS[id];
    const defined = sels.every(s => [...s.matchAll(/\.([A-Za-z][\w-]*)/g)].every(m => classes.has(m[1])));
    const usedIn = used[id] || [];
    return {
      ...(doc[id] || { id, name: '(not in components.md)', group: '' }),
      selectors: sels, tokens: defined ? tokensFor(sels) : [], textSlots: SLOTS[id] || {},
      // PPTX is derived from the rendered HTML (scripts/html-to-pptx.mjs), so any rendered component converts
      status: { css: defined ? 'defined' : 'missing', html: usedIn.length ? 'rendered' : defined ? 'css-only' : 'missing', pptx: usedIn.length ? 'converted' : 'n/a' },
      usedIn,
    };
  });
  const textRoles = Object.fromEntries(Object.keys(TEXT_RULES).map(k => [k, {
    en: theme.typography.en[k] ?? null, zh: theme.typography.zh[k] ?? null, rules: TEXT_RULES[k],
  }]));
  return {
    schema: 'deck-design-system/manifest@1', theme: 'iasdr',
    note: 'GENERATED by scripts/build-manifest.mjs — do not edit. AI reads it to choose components; lint-deck.mjs reads it to check pages.',
    sources: Object.fromEntries(['references/components.md', 'templates/iasdr.css', 'templates/iasdr-layouts.html', 'templates/iasdr-deck.html', 'tokens.json'].map(f => [f, hash(read(f))])),
    definedClasses: [...classes].sort(),
    textRoles, colors: colorFacts(theme), components,
    pptx: {
      method: 'scripts/html-to-pptx.mjs: measure the rendered HTML, redraw as native shapes and text boxes at 1280×720',
      editable: 'text boxes (runs, weight, colour), shapes; icons as embedded SVG',
      asImage: 'backgrounds with gradients, and clip-path shapes with their subtree backgrounds (text inside stays editable)',
      knownLosses: ['letter-spacing', 'font weights other than regular/bold', 'blur shadows become one soft shadow'],
      fonts: 'install templates/fonts/*.ttf (Manrope, Inter, Noto Sans TC) on the machine that opens the PPTX',
    },
    layouts: Object.fromEntries(Object.entries(layouts).map(([k, v]) => [k, { components: v }])),
    summary: {
      components: components.length,
      rendered: components.filter(c => c.status.html === 'rendered').map(c => c.id),
      cssOnly: components.filter(c => c.status.html === 'css-only').map(c => c.id),
      missing: components.filter(c => c.status.html === 'missing').map(c => c.id),
      pptxConverted: components.filter(c => c.status.pptx === 'converted').map(c => c.id),
    },
  };
}

const manifest = await build();
const text = JSON.stringify(manifest, null, 2) + '\n';
if (process.argv.includes('--check')) {
  const cur = fs.existsSync(P('manifest.json')) ? read('manifest.json') : '';
  if (cur === text) { console.log('OK    manifest.json is up to date'); process.exit(0); }
  console.log('FAIL  manifest.json is stale (run node scripts/build-manifest.mjs)'); process.exit(1);
}
fs.writeFileSync(P('manifest.json'), text);
const s = manifest.summary;
console.log(`manifest.json: ${s.components} components · rendered ${s.rendered.length} · css-only ${s.cssOnly.join(',') || '-'} · missing ${s.missing.join(',') || '-'} · layouts ${Object.keys(manifest.layouts).length}`);
