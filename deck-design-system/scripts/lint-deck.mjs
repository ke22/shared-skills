#!/usr/bin/env node
// Lint iasdr HTML decks against the design system: tokens, components (manifest.json) and
// the typesetting rules in references/iasdr-typesetting.md and references/zh-typesetting.md.
// Usage: node scripts/lint-deck.mjs <deck.html> [more.html] [--css path] [--json report.json]
// Exit 1 when any rule at level "error" fails.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openPage } from './browser-lib.mjs';
import { RULES } from './lint-rules.mjs';

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
// base colour -> the semantic tokens that should be used instead (R34)
const SEMANTIC_FOR = {};
for (const t of theme.semantic?.tokens ?? []) (SEMANTIC_FOR[t.ref] ??= []).push(t.name);
for (const k of Object.keys(SEMANTIC_FOR)) if (['--ink'].includes(k)) delete SEMANTIC_FOR[k]; else SEMANTIC_FOR[k] = SEMANTIC_FOR[k].join(' / ');
const PAGE_CHROME = new Set(['deck', 'deck-label', 'lib-label']); // gallery chrome outside slides
// visual grammar (components.md 視覺語法 -> manifest.grammar): status hues, the emphasis colour, where status may appear
const rgb = h => `rgb(${parseInt(h.slice(1, 3), 16)}, ${parseInt(h.slice(3, 5), 16)}, ${parseInt(h.slice(5, 7), 16)})`;
const STATUS_RGB = ['--warning', '--danger', '--success', '--warning-soft', '--danger-soft', '--success-soft'].map(k => rgb(theme.css[k]));
const EMPH_RGB = rgb(theme.css['--accent']);
const grammarSel = rule => (manifest.grammar?.marks ?? []).filter(g => g.rules.includes(rule)).flatMap(g => g.selectors);
const STATUS_SEL = [...grammarSel('R29'), '[data-sem~="status"]'].join(',');
const VERDICT_WORDS = manifest.grammar?.verdictWords ?? {}, CLAIM_WORDS = manifest.grammar?.claimWords ?? {};
// chart marks that count as muted (not a highlight): neutrals and the muted structure colour
const CHART_NEUTRAL = ['--line', '--rule', '--text', '--text-2', '--ink', '--card', '--accent-soft', '--tint', '--surface-2'].filter(k => theme.css[k]).map(k => rgb(theme.css[k])).concat(['rgb(255, 255, 255)']);

const findings = [];
// Tiers: floor (readability, never overridable) · system (design-system integrity, never overridable)
//        style (overridable with data-lint-allow="R13: reason") · advisory (never blocks)
const add = (rule, file, where, detail, allow = null) => {
  const { level, tier } = RULES[rule];
  if (allow && tier === 'style') return findings.push({ rule, level: 'overridden', tier, file: path.basename(file), where, detail, reason: allow });
  if (allow) detail += `  (override ignored: ${tier} rule)`;
  findings.push({ rule, level, tier, file: path.basename(file), where, detail });
};

// ---------- static checks ----------
function stripTokenBlocks(s) {
  for (const op of [':root{', '[lang="zh-Hant"]{']) { const i = s.indexOf(op); if (i >= 0) { const j = s.indexOf('\n}', i); s = s.slice(0, i) + s.slice(j + 2); } }
  return s;
}
function staticChecks(file, src) {
  // token definitions and comments are not usage; an HTML deck may inline the whole stylesheet
  const body = stripTokenBlocks(src.replace(/\/\*[\s\S]*?\*\//g, ''));
  for (const h of new Set((body.match(/#[0-9A-Fa-f]{6}\b/g) || []).map(x => x.toUpperCase()))) if (!tokenHex.has(h)) add('R01', file, 'source', h);
  for (const [, prop, val] of body.matchAll(/((?:margin|padding)[\w-]*|(?:row-|column-)?gap)\s*:\s*([^;}"]+)/g))
    for (const [, n] of val.matchAll(/(?<![\w.-])(\d+)px/g)) if (+n % 4) add('R02', file, 'source', `${prop}: ${n}px`);
  for (const [, n] of body.matchAll(/font(?:-size)?\s*:[^;}]*?(\d+)px/g)) if (+n < 18) add('R03', file, 'source', `${n}px`);
  for (const m of body.matchAll(/\b(Georgia|Times(?: New Roman)?|Cambria|SimSun|PMingLiU|MingLiU)\b/g)) add('R04', file, 'source', m[1]);
  // R34: inline styles name base colours that have a semantic replacement (tokens.json themes.iasdr.semantic)
  if (!file.endsWith('.css')) for (const m of src.matchAll(/style\s*=\s*\\?["']([^"']*)\\?["']/g))
    for (const t of m[1].matchAll(/var\((--[\w-]+)\)/g)) if (SEMANTIC_FOR[t[1]]) add('R34', file, 'source', `${t[1]} → ${SEMANTIC_FOR[t[1]]}`);
}
staticChecks(cssPath, fs.readFileSync(cssPath, 'utf8'));

// ---------- rendered checks ----------
for (const file of files) {
  staticChecks(file, fs.readFileSync(file, 'utf8'));
  const { browser, page, errors } = await openPage(file);
  errors.forEach(e => add('R22', file, 'page', e));
  const res = await page.evaluate(({ rules, defined, chrome, G }) => {
    const out = [];
    const allowFor = (el, rule) => { for (let e = el; e && e.getAttribute; e = e.parentElement) { const a = e.getAttribute('data-lint-allow'); if (!a) continue;
      for (const part of a.split(';')) { const m = part.match(/^\s*(R\d\d)\s*:\s*(.{4,})$/); if (m && m[1] === rule) return m[2].trim(); } } return null; };
    const push = (rule, where, detail, el = null) => out.push({ rule, where, detail, allow: el ? allowFor(el, rule) : null });
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
        if (!defined.includes(c) && !chrome.includes(c)) push('R05', id, `.${c}`, el);
      // R21 bounds + bottom margin
      for (const el of s.querySelectorAll('*')) { const e = el.getBoundingClientRect(); if (!e.width || !e.height || el.closest('.photo-slot')) continue;
        if (e.right > sb.right + 1 || e.bottom > sb.bottom + 1 || e.left < sb.left - 1 || e.top < sb.top - 1) push('R21', id, `outside slide: ${el.tagName.toLowerCase()}.${el.getAttribute('class') || ''}`, el); }
      const kids = [...s.querySelectorAll('.body *')].map(k => k.getBoundingClientRect().bottom); if (kids.length) { const mx = Math.max(...kids); if (mx > sb.bottom - 80 + 1) push('R21', id, `content ${Math.round(mx - (sb.bottom - 80))}px into bottom margin`); }
      // text leaves
      const leafs = [...s.querySelectorAll('*')].filter(el => [...el.childNodes].some(n => n.nodeType === 3 && n.data.trim()) && !el.closest('.photo-slot'));
      for (const el of leafs) { const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        const txt = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.data).join('').trim(); const fz = parseFloat(cs.fontSize), fw = +cs.fontWeight; const q = `"${txt.slice(0, 24)}"`;
        const large = fz >= 32 || (fz >= 24 && fw >= 700); const bg = bgOf(el), fg = parse(cs.color);
        if (bg.c && fg) { const r = ratio(fg, bg.c), need = large ? 3 : 4.5; if (r < need) push('R10', id, `${r.toFixed(2)}:1 < ${need} ${fz}px/${fw} ${q}`, el); }
        if (s.classList.contains('field') && bg.el === s && !large) push('R11', id, `${fz}px/${fw} ${q}`, el);
        if (fz < 18) push('R12', id, `${fz}px ${q}`, el);
        const fam = cs.fontFamily.split(',')[0].replace(/"/g, '').trim(); if (!OK_FONTS.includes(fam)) push('R19', id, `${fam} ${q}`, el);
        if (zh) { if (/[一-鿿][A-Za-z0-9]|[A-Za-z0-9][一-鿿]/.test(txt)) push('R17', id, `CJK–Latin without space ${q}`, el);
          if (/[一-鿿][,.;:!?](?!\d)/.test(txt)) push('R17', id, `half-width punctuation ${q}`, el); if (/[“”]/.test(txt)) push('R17', id, `curly quotes ${q}`, el); }
        const e = el.getBoundingClientRect(); if (e.width && !el.closest('.pnum,.secmark,.sample-note,.src,.legend,.contact,.inst') && (e.left < sb.left + 111 || e.right > sb.right - 111)) push('R16', id, `x ${Math.round(e.left - sb.left)}–${Math.round(e.right - sb.left)} ${q}`, el);
        if (cs.color === 'rgb(38, 137, 86)' || cs.backgroundColor === 'rgb(38, 137, 86)') push('R23', id, q, el);
        if (cs.fontStyle === 'italic' && /[一-鿿]/.test(txt)) push('R26', id, `Chinese text set in italics ${q} (use bold: <i> inside a Chinese reference)`, el);
      }
      // R28 title highlight (components.md C01): the coloured phrase is the page's one emphasis
      s.querySelectorAll('.hl').forEach(h => { if (!h.closest('h1.title')) push('R28', id, `highlight outside a content-page title "${h.textContent.trim().slice(0, 20)}"`, h); });
      s.querySelectorAll('h1.title').forEach(t => { const hs = t.querySelectorAll('.hl'); if (hs.length > 1) push('R28', id, `${hs.length} highlighted phrases in one title`, t);
        hs.forEach(h => { const tx = h.textContent.trim(), cjk = [...tx].filter(c => /[一-鿿]/.test(c)).length; if ((zh && cjk > 12) || (!zh && tx.length > 36)) push('R28', id, `highlight too long "${tx}"`, h); }); });
      // R29 status hues only inside status components (or elements declared data-sem="status")
      for (const el of s.querySelectorAll('*')) { if (el.closest(G.statusSel)) continue; const cs = getComputedStyle(el);
        const hues = [cs.color, cs.backgroundColor, parseFloat(cs.borderTopWidth) ? cs.borderTopColor : '', parseFloat(cs.borderLeftWidth) ? cs.borderLeftColor : '', el instanceof SVGElement ? cs.stroke : '', el instanceof SVGElement ? cs.fill : ''];
        const hit = hues.find(c => G.status.includes(c)); if (!hit) continue;
        if (hit === cs.color && ![...el.childNodes].some(n => n.nodeType === 3 && n.data.trim()) && !(el instanceof SVGElement)) continue;  // inherited colour on a wrapper
        push('R29', id, `${el.tagName.toLowerCase()}${el.getAttribute('class') ? '.' + el.getAttribute('class').split(/\s+/).join('.') : ''} uses ${hit}`, el); }
      // R30 one emphasis per slide: a title highlight excludes blue text emphasis in the body
      if (s.querySelector('h1.title .hl')) s.querySelectorAll('b,strong,em,mark,a,.acc,span:not([class])').forEach(e => { if (e.closest('h1.title,.tb')) return;
        if (getComputedStyle(e).color === G.emph && e.textContent.trim()) push('R30', id, `blue emphasis "${e.textContent.trim().slice(0, 20)}" besides the title highlight`, e); });
      // R31 arrows mean sequence or cause: none between a claim and its evidence (data-sem)
      const semOf = x => !x ? '' : x.matches('[data-sem]') ? x.dataset.sem : (x.querySelector('[data-sem]')?.dataset.sem || '');
      s.querySelectorAll('.arr').forEach(a => { let w = a; while (w.parentElement && w.parentElement.children.length === 1 && w.parentElement !== s) w = w.parentElement;
        const pair = [semOf(w.previousElementSibling), semOf(w.nextElementSibling)].join(' ');
        if (/\bclaim\b/.test(pair) && /\bevidence\b/.test(pair)) push('R31', id, 'arrow between data-sem="claim" and data-sem="evidence"', a); });
      // R32 verdict badge: class, mark shape and verdict word agree
      s.querySelectorAll('.verdict').forEach(v => { const state = v.classList.contains('gap') ? 'gap' : v.classList.contains('partly') ? 'partly' : 'met';
        const mark = v.querySelector('.vmark svg')?.dataset.mark, word = (v.querySelector('.vword')?.textContent || '').trim();
        if (!mark) push('R32', id, `verdict "${word}" has no shape mark (colour alone)`, v); else if (mark !== state) push('R32', id, `verdict ${state} drawn with the ${mark} mark`, v);
        const words = G.words[state]?.[zh ? 'zh' : 'en'] || []; if (words.length && !words.includes(word)) push('R32', id, `verdict ${state} labelled "${word}" (expected ${words.join(' / ')})`, v); });
      s.querySelectorAll('.claim').forEach(c => { const state = ['confirmed', 'prelim', 'unverified'].find(k => c.classList.contains(k));
        const mark = c.querySelector('svg')?.dataset.mark, word = c.textContent.trim();
        if (!state) { push('R32', id, `evidence strength "${word}" has no state class (confirmed / prelim / unverified)`, c); return; }
        if (!mark) push('R32', id, `evidence strength "${word}" has no shape mark`, c); else if (mark !== state) push('R32', id, `evidence strength ${state} drawn with the ${mark} mark`, c);
        const words = G.claimWords[state]?.[zh ? 'zh' : 'en'] || []; if (words.length && !words.includes(word)) push('R32', id, `evidence strength ${state} labelled "${word}" (expected ${words.join(' / ')})`, c); });
      // R35 charts (C32): one highlight, a takeaway, a data source
      s.querySelectorAll('.chart').forEach(ch => {
        if (!ch.querySelector('.take')?.textContent.trim()) push('R35', id, 'chart without a takeaway (.take)', ch);
        if (!s.querySelector('.src')?.textContent.trim()) push('R35', id, 'chart without a data source in the source line (.src)', ch);
        const hues = new Set(); ch.querySelectorAll('svg rect,svg path,svg circle,svg line,svg polyline,svg polygon,svg ellipse').forEach(m => { const cs = getComputedStyle(m);
          for (const c of /^(line|polyline)$/.test(m.tagName) ? [cs.stroke] : [cs.fill, cs.stroke]) if (c && c !== 'none' && !/rgba\(.*, 0\)$/.test(c) && !G.neutral.includes(c)) hues.add(c); });
        if (hues.size > 1) push('R35', id, `${hues.size} highlight colours (${[...hues].join(' ')}); highlight one series only`, ch); });
      // R33 numbered pins: the figure and the list carry the same numbers
      { const onFig = [...s.querySelectorAll('.pin')].filter(p => !p.closest('.pinlist')).map(p => p.textContent.trim()).sort(), inList = [...s.querySelectorAll('.pinlist .pin')].map(p => p.textContent.trim()).sort();
        if (onFig.length && inList.length && onFig.join() !== inList.join()) push('R33', id, `figure [${onFig}] vs list [${inList}]`); }
      // R27 imagery placeholders (iasdr-imagery.md §5)
      s.querySelectorAll('.illus').forEach(f => { if (!f.querySelector('img,svg')) push('R27', id, 'empty .illus slot', f); });
      // R26 source line / APA 7 references (zh-typesetting.md §11)
      s.querySelectorAll('.src').forEach(src => {
        const L = lines(src); if (L.length > 2) push('R26', id, `source line has ${L.length} lines (max 2; put full references on a reference slide)`, src);
        const pn = s.querySelector('.pnum'); if (pn) { const a = src.getBoundingClientRect(), b = pn.getBoundingClientRect(); if (b.width && a.right > b.left - 16 && a.bottom > b.top && a.top < b.bottom) push('R26', id, 'source line runs into the page number', src); }
        const units = [[]]; for (const n of src.childNodes) { if (n.nodeName === 'BR') units.push([]); else units.at(-1).push(n); }
        for (const u of units) {
          const text = u.map(n => n.textContent).join('').replace(/\s+/g, ' ').trim();
          if (!/\(\d{4}[a-z]?\)\.|（\d{4}[a-z]?）。/.test(text)) continue;  // not an APA reference
          const marks = u.filter(n => n.nodeType === 1).flatMap(n => [n, ...n.querySelectorAll('*')]).filter(e => e.tagName === 'I');
          if (!marks.length) { push('R26', id, `APA reference without journal/volume in <i>: "${text.slice(0, 32)}"`, src); continue; }
          for (const m of marks) { const st = getComputedStyle(m), latin = !/[一-鿿]/.test(m.textContent);
            if (latin && st.fontStyle !== 'italic') push('R26', id, `English journal/volume not italic "${m.textContent.slice(0, 24)}" (mark the English reference lang="en")`, src); }
        }
      });
      // R26 reference list (C68): every entry APA with <i>; Chinese entries first, English entries A–Z
      s.querySelectorAll('.refs').forEach(list => { const items = [...list.children]; let seenEn = false, prevEn = '';
        for (const li of items) { const text = li.textContent.replace(/\s+/g, ' ').trim(), isZh = /^[一-鿿]/.test(text);
          if (!li.querySelector('i')) push('R26', id, `reference without journal/book title in <i>: "${text.slice(0, 32)}"`, li);
          for (const m of li.querySelectorAll('i')) if (!/[一-鿿]/.test(m.textContent) && getComputedStyle(m).fontStyle !== 'italic') push('R26', id, `English title not italic "${m.textContent.slice(0, 24)}" (mark the entry lang="en")`, li);
          if (isZh && seenEn) push('R26', id, `Chinese reference after English ones: "${text.slice(0, 20)}"`, li);
          if (!isZh) { const key = text.toLowerCase(); if (seenEn && key.localeCompare(prevEn) < 0) push('R26', id, `English references not in A–Z order at "${text.slice(0, 24)}"`, li); seenEn = true; prevEn = key; } } });
      // R13 titles
      s.querySelectorAll('h1.title,.display,.big,.cover h1').forEach(t => { const L = lines(t); const isH1 = t.matches('h1.title');
        const lim = isH1 ? 2 : t.matches('.big') ? 4 : (zh ? 2 : 3); const maxc = Math.max(0, ...L.map(l => [...l].filter(ch => /[一-鿿]/.test(ch)).length));
        if (L.length > lim || (zh && isH1 && maxc > 20)) push('R13', id, `${L.length} lines, ${zh ? maxc + ' CJK/line' : ''} ${L.map(l => '[' + l + ']').join('')}`, t); });
      // R14, R15, R18 paragraphs
      s.querySelectorAll('p,li,td,h1,h2,h3').forEach(el => { if (el.closest('.photo-slot')) return; const cs = getComputedStyle(el); const L = lines(el);
        if (cs.textAlign === 'center' && L.length > 2 && !el.matches('h1,.display,.big')) push('R14', id, `${L.length} lines "${(L[0] || '').slice(0, 18)}"`, el);
        if (L.length && !el.matches('h1,.display,.big,.src,.refs li')) { /* .src and .refs: reference strings, governed by R26 */ const width = l => [...l].reduce((n, ch) => n + (/[\u3000-\u9fff\uff00-\uffef]/.test(ch) ? 1 : 0.5), 0); /* zh-typesetting: count full-width characters; half-width = 0.5 */
          const mx = Math.max(...L.map(l => zh ? Math.round(width(l)) : l.length)); if ((zh && mx > 32) || (!zh && mx > 75)) push('R15', id, `${mx} ${zh ? '字' : 'chars'}/line "${L[0].slice(0, 18)}"`, el); }
        if (zh) L.forEach((l, i) => { if (i && BADSTART.includes(l[0])) push('R18', id, `"${l[0]}" starts line ${i + 1}: ${l.slice(0, 16)}`, el); }); });
      // R20 component text rules from the manifest
      s.querySelectorAll('.chip').forEach(c => { if (lines(c).length > 1) push('R20', id, `chip wraps "${c.textContent.trim().slice(0, 20)}"`, c); });
      s.querySelectorAll('.figure').forEach(f => { const kind = f.getAttribute('data-figure-kind'); push('R24', id, kind || '(no kind)');
        if (!kind || !f.querySelector('figcaption')) push('R25', id, `${kind ? '' : 'missing data-figure-kind '}${f.querySelector('figcaption') ? '' : 'missing figcaption'}`.trim()); });
      s.querySelectorAll('.idtag').forEach(c => { const t = c.textContent.trim(); if (!zh && t.length > 4 && !/\s/.test(t)) push('R20', id, `id tag "${t}" > 4 chars`, c); });
    });
    const loaded = [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family);
    return { out, loaded: [...new Set(loaded)] };
  }, { rules: Object.keys(RULES), defined: [...definedClasses], chrome: [...PAGE_CHROME], G: { status: STATUS_RGB, emph: EMPH_RGB, statusSel: STATUS_SEL, words: VERDICT_WORDS, claimWords: CLAIM_WORDS, neutral: CHART_NEUTRAL } });
  await browser.close();
  res.out.forEach(f => add(f.rule, file, f.where, f.detail, f.allow));
  if (!res.loaded.some(f => f.startsWith('IASDR '))) add('R19', file, 'page', `local fonts not loaded (loaded: ${res.loaded.join(', ') || 'none'}); run scripts/fetch-fonts.sh`);
}

// ---------- report ----------
const uniq = [...new Map(findings.map(f => [JSON.stringify(f), f])).values()];
const by = {}; for (const f of uniq) (by[f.rule] ??= []).push(f);
for (const r of Object.keys(RULES)) {
  const all = by[r] || []; const list = all.filter(f => f.level !== 'overridden'); const over = all.length - list.length; const { level: lvl, desc, tier } = RULES[r];
  console.log(`${list.length ? (lvl === 'error' ? 'FAIL' : 'WARN') : 'OK  '}  ${r}  [${tier}] ${desc}${list.length ? `  (${list.length})` : ''}${over ? `  · ${over} overridden` : ''}`);
  list.slice(0, 6).forEach(f => console.log(`        ${f.file} ${f.where}  ${f.detail}`)); if (list.length > 6) console.log(`        … ${list.length - 6} more`);
}
const errors = uniq.filter(f => f.level === 'error').length, overridden = uniq.filter(f => f.level === 'overridden'), warns = uniq.length - errors - overridden.length;
if (overridden.length) { console.log('\nOverrides (style rules, with reasons):'); overridden.forEach(f => console.log(`  ${f.rule} ${f.file} ${f.where}  — ${f.reason}`)); }
const figures = uniq.filter(f => f.rule === 'R24'); const kinds = {}; figures.forEach(f => kinds[f.detail] = (kinds[f.detail] || 0) + 1);
console.log(`\nMetrics: custom figures ${figures.length}${figures.length ? ' ' + JSON.stringify(kinds) : ''} · overrides ${overridden.length}`);
console.log(`${errors} error(s), ${warns} warning(s), ${overridden.length} override(s) in ${files.map(f => path.basename(f)).join(', ')}`);
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({ rules: RULES, findings: uniq }, null, 2));
process.exit(errors ? 1 : 0);
