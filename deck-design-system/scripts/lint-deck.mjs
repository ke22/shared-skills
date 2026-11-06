#!/usr/bin/env node
// Lint iasdr HTML decks against the design system: tokens, components (manifest.json) and
// the typesetting rules in references/iasdr-typesetting.md and references/zh-typesetting.md.
// Usage: node scripts/lint-deck.mjs <deck.html> [more.html] [--css path] [--json report.json]
// Exit 1 when any rule at level "error" fails.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openPage } from './browser-lib.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : null; };
const jsonOut = opt('--json');
const cssPath = opt('--css') || path.join(ROOT, 'templates/iasdr.css');
const files = args.filter(a => !a.startsWith('--'));
if (!files.length) { console.error('usage: lint-deck.mjs <deck.html> [...] [--css iasdr.css] [--json out.json]'); process.exit(2); }

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
const theme = JSON.parse(fs.readFileSync(path.join(ROOT, 'tokens.json'), 'utf8')).themes.iasdr;
const tokenHex = new Set(Object.values(theme.css).filter(v => /^#[0-9a-f]{6}$/i.test(v)).map(v => v.toUpperCase()));
const definedClasses = new Set(manifest.definedClasses);
const PAGE_CHROME = new Set(['deck', 'deck-label', 'lib-label']); // gallery chrome outside slides

const RULES = {
  R01: ['error', 'Hard-coded colour (use a token)'],
  R02: ['error', 'Spacing not on the 4px sub-grid (layout spacing should be 8px)'],
  R03: ['error', 'Literal font size below the 18px minimum'],
  R04: ['error', 'Serif typeface'],
  R05: ['error', 'Class not defined by the design system (typo or ad-hoc style)'],
  R10: ['error', 'Text contrast below WCAG AA (4.5:1, or 3:1 for >=24px bold / >=32px)'],
  R11: ['error', 'Text on the blue field below 24px bold / 32px'],
  R12: ['error', 'Rendered text below 18px'],
  R13: ['error', 'Title over its line limit (h1: 2 lines, zh <= 20 CJK per line; display 3/2; statement 4)'],
  R14: ['error', 'Centred paragraph longer than 2 lines'],
  R15: ['error', 'Line too long (en > 75 chars, zh > 32 chars)'],
  R16: ['error', 'Content outside the 112px side margins'],
  R17: ['error', 'Chinese source text: missing CJK–Latin space, half-width punctuation, or curly quotes'],
  R18: ['error', 'Chinese punctuation at the start of a line'],
  R19: ['warn', 'Text not rendered with the local design-system fonts'],
  R20: ['error', 'Component text rule (chip on one line; id tag <= 4 chars)'],
  R21: ['error', 'Element outside the slide or content in the bottom margin'],
  R22: ['error', 'Page script error'],
  R23: ['warn', 'Success colour used: confirm the item is completed AND verified'],
};
const findings = [];
const add = (rule, file, where, detail) => findings.push({ rule, level: RULES[rule][0], file: path.basename(file), where, detail });

// ---------- static checks ----------
function stripTokenBlocks(s) {
  for (const op of [':root{', '[lang="zh-Hant"]{']) { const i = s.indexOf(op); if (i >= 0) { const j = s.indexOf('\n}', i); s = s.slice(0, i) + s.slice(j + 2); } }
  return s;
}
function staticChecks(file, src) {
  const body = file.endsWith('.css') ? stripTokenBlocks(src) : src;
  for (const h of new Set((body.match(/#[0-9A-Fa-f]{6}\b/g) || []).map(x => x.toUpperCase()))) if (!tokenHex.has(h)) add('R01', file, 'source', h);
  for (const [, prop, val] of body.matchAll(/((?:margin|padding)[\w-]*|(?:row-|column-)?gap)\s*:\s*([^;}"]+)/g))
    for (const [, n] of val.matchAll(/(?<![\w.-])(\d+)px/g)) if (+n % 4) add('R02', file, 'source', `${prop}: ${n}px`);
  for (const [, n] of body.matchAll(/font(?:-size)?\s*:[^;}]*?(\d+)px/g)) if (+n < 18) add('R03', file, 'source', `${n}px`);
  for (const m of body.matchAll(/\b(Georgia|Times(?: New Roman)?|Cambria|SimSun|PMingLiU|MingLiU)\b/g)) add('R04', file, 'source', m[1]);
}
staticChecks(cssPath, fs.readFileSync(cssPath, 'utf8'));

// ---------- rendered checks ----------
for (const file of files) {
  staticChecks(file, fs.readFileSync(file, 'utf8'));
  const { browser, page, errors } = await openPage(file);
  errors.forEach(e => add('R22', file, 'page', e));
  const res = await page.evaluate(({ rules, defined, chrome }) => {
    const out = [];
    const push = (rule, where, detail) => out.push({ rule, where, detail });
    const parse = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(',').map(Number); return { r: v[0], g: v[1], b: v[2], a: v[3] ?? 1 }; };
    const lum = ({ r, g, b }) => { const f = x => { x /= 255; return x <= .03928 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
    const ratio = (a, c) => { const l1 = lum(a), l2 = lum(c); return (Math.max(l1, l2) + .05) / (Math.min(l1, l2) + .05); };
    const FIELD = { r: 0x3A, g: 0x77, b: 0xED }, PAGE = { r: 0xF1, g: 0xF3, b: 0xF8 };
    const bgOf = el => { for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); const c = parse(cs.backgroundColor);
      if (cs.backgroundImage !== 'none' && !e.classList.contains('slide') && !e.classList.contains('photo')) return { grad: true, el: e };
      if (c && c.a > .9) return { c, el: e }; if (e.classList.contains('slide')) return { c: e.classList.contains('field') ? FIELD : PAGE, el: e }; } return { c: { r: 255, g: 255, b: 255 } }; };
    const lines = el => { const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n, L = [], cur = '', top = null;
      while ((n = w.nextNode())) for (let i = 0; i < n.length; i++) { const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + 1); const rc = r.getClientRects()[0]; if (!rc) continue;
        if (top === null) top = rc.top; if (rc.top - top > 5) { L.push(cur); cur = ''; top = rc.top; } cur += n.data[i]; }
      if (cur) L.push(cur); return L.map(s => s.trim()).filter(Boolean); };
    const BADSTART = '，。、；：？！」』）】》〉';
    const OK_FONTS = ['IASDR Manrope', 'IASDR Inter', 'IASDR Noto Sans TC'];
    document.querySelectorAll('.slide').forEach((s, idx) => {
      const lang = s.closest('[lang]').lang, zh = lang === 'zh-Hant';
      const id = `${s.dataset.layout || 'slide' + (idx + 1)}/${zh ? 'zh' : 'en'}`; const sb = s.getBoundingClientRect();
      // R05 classes
      for (const el of [s, ...s.querySelectorAll('[class]')]) for (const c of (el.getAttribute('class') || '').split(/\s+/).filter(Boolean))
        if (!defined.includes(c) && !chrome.includes(c)) push('R05', id, `.${c}`);
      // R21 bounds + bottom margin
      for (const el of s.querySelectorAll('*')) { const e = el.getBoundingClientRect(); if (!e.width || !e.height || el.closest('.photo-slot')) continue;
        if (e.right > sb.right + 1 || e.bottom > sb.bottom + 1 || e.left < sb.left - 1 || e.top < sb.top - 1) push('R21', id, `outside slide: ${el.tagName.toLowerCase()}.${el.getAttribute('class') || ''}`); }
      const kids = [...s.querySelectorAll('.body *')].map(k => k.getBoundingClientRect().bottom); if (kids.length) { const mx = Math.max(...kids); if (mx > sb.bottom - 80 + 1) push('R21', id, `content ${Math.round(mx - (sb.bottom - 80))}px into bottom margin`); }
      // text leaves
      const leafs = [...s.querySelectorAll('*')].filter(el => [...el.childNodes].some(n => n.nodeType === 3 && n.data.trim()) && !el.closest('.photo-slot'));
      for (const el of leafs) { const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        const txt = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.data).join('').trim(); const fz = parseFloat(cs.fontSize), fw = +cs.fontWeight; const q = `"${txt.slice(0, 24)}"`;
        const large = fz >= 32 || (fz >= 24 && fw >= 700); const bg = bgOf(el), fg = parse(cs.color);
        if (bg.c && fg) { const r = ratio(fg, bg.c), need = large ? 3 : 4.5; if (r < need) push('R10', id, `${r.toFixed(2)}:1 < ${need} ${fz}px/${fw} ${q}`); }
        if (s.classList.contains('field') && bg.el === s && !large) push('R11', id, `${fz}px/${fw} ${q}`);
        if (fz < 18) push('R12', id, `${fz}px ${q}`);
        const fam = cs.fontFamily.split(',')[0].replace(/"/g, '').trim(); if (!OK_FONTS.includes(fam)) push('R19', id, `${fam} ${q}`);
        if (zh) { if (/[一-鿿][A-Za-z0-9]|[A-Za-z0-9][一-鿿]/.test(txt)) push('R17', id, `CJK–Latin without space ${q}`);
          if (/[一-鿿][,.;:!?](?!\d)/.test(txt)) push('R17', id, `half-width punctuation ${q}`); if (/[“”]/.test(txt)) push('R17', id, `curly quotes ${q}`); }
        const e = el.getBoundingClientRect(); if (e.width && !el.closest('.pnum,.secmark,.sample-note,.src,.legend,.contact,.inst') && (e.left < sb.left + 111 || e.right > sb.right - 111)) push('R16', id, `x ${Math.round(e.left - sb.left)}–${Math.round(e.right - sb.left)} ${q}`);
        if (cs.color === 'rgb(38, 137, 86)' || cs.backgroundColor === 'rgb(38, 137, 86)') push('R23', id, q);
      }
      // R13 titles
      s.querySelectorAll('h1.title,.display,.big,.cover h1').forEach(t => { const L = lines(t); const isH1 = t.matches('h1.title');
        const lim = isH1 ? 2 : t.matches('.big') ? 4 : (zh ? 2 : 3); const maxc = Math.max(0, ...L.map(l => [...l].filter(ch => /[一-鿿]/.test(ch)).length));
        if (L.length > lim || (zh && isH1 && maxc > 20)) push('R13', id, `${L.length} lines, ${zh ? maxc + ' CJK/line' : ''} ${L.map(l => '[' + l + ']').join('')}`); });
      // R14, R15, R18 paragraphs
      s.querySelectorAll('p,li,td,h1,h2,h3').forEach(el => { if (el.closest('.photo-slot')) return; const cs = getComputedStyle(el); const L = lines(el);
        if (cs.textAlign === 'center' && L.length > 2 && !el.matches('h1,.display,.big')) push('R14', id, `${L.length} lines "${(L[0] || '').slice(0, 18)}"`);
        if (L.length && !el.matches('h1,.display,.big')) { const width = l => [...l].reduce((n, ch) => n + (/[\u3000-\u9fff\uff00-\uffef]/.test(ch) ? 1 : 0.5), 0); /* zh-typesetting: count full-width characters; half-width = 0.5 */
          const mx = Math.max(...L.map(l => zh ? Math.round(width(l)) : l.length)); if ((zh && mx > 32) || (!zh && mx > 75)) push('R15', id, `${mx} ${zh ? '字' : 'chars'}/line "${L[0].slice(0, 18)}"`); }
        if (zh) L.forEach((l, i) => { if (i && BADSTART.includes(l[0])) push('R18', id, `"${l[0]}" starts line ${i + 1}: ${l.slice(0, 16)}`); }); });
      // R20 component text rules from the manifest
      s.querySelectorAll('.chip').forEach(c => { if (lines(c).length > 1) push('R20', id, `chip wraps "${c.textContent.trim().slice(0, 20)}"`); });
      s.querySelectorAll('.idtag').forEach(c => { const t = c.textContent.trim(); if (!zh && t.length > 4 && !/\s/.test(t)) push('R20', id, `id tag "${t}" > 4 chars`); });
    });
    const loaded = [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family);
    return { out, loaded: [...new Set(loaded)] };
  }, { rules: Object.keys(RULES), defined: [...definedClasses], chrome: [...PAGE_CHROME] });
  await browser.close();
  res.out.forEach(f => add(f.rule, file, f.where, f.detail));
  if (!res.loaded.some(f => f.startsWith('IASDR '))) add('R19', file, 'page', `local fonts not loaded (loaded: ${res.loaded.join(', ') || 'none'}); run scripts/fetch-fonts.sh`);
}

// ---------- report ----------
const uniq = [...new Map(findings.map(f => [JSON.stringify(f), f])).values()];
const by = {}; for (const f of uniq) (by[f.rule] ??= []).push(f);
for (const r of Object.keys(RULES)) {
  const list = by[r] || []; const [lvl, desc] = RULES[r];
  console.log(`${list.length ? (lvl === 'error' ? 'FAIL' : 'WARN') : 'OK  '}  ${r}  ${desc}${list.length ? `  (${list.length})` : ''}`);
  list.slice(0, 6).forEach(f => console.log(`        ${f.file} ${f.where}  ${f.detail}`)); if (list.length > 6) console.log(`        … ${list.length - 6} more`);
}
const errors = uniq.filter(f => f.level === 'error').length, warns = uniq.length - errors;
console.log(`\n${errors} error(s), ${warns} warning(s) in ${files.map(f => path.basename(f)).join(', ')}`);
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({ rules: RULES, findings: uniq }, null, 2));
process.exit(errors ? 1 : 0);
