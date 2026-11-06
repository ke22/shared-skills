#!/usr/bin/env node
// Build one self-contained showcase page for the iasdr design system: tokens, type scale, grid,
// every component (cropped from the rendered templates), every narrative layout (zh + en renders),
// the template deck, deck spines and the lint rules. Everything is read from the generated sources
// (tokens.json, templates/iasdr.css, manifest.json, layouts.json, lint-deck.mjs), never copied by hand.
// Usage: node scripts/build-showcase.mjs [--out dist/showcase.html]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openPage } from './browser-lib.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2), opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const OUT = path.resolve(opt('--out') || path.join(ROOT, 'dist/showcase.html'));
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const theme = JSON.parse(read('tokens.json')).themes.iasdr;
const manifest = JSON.parse(read('manifest.json'));
const layoutsDoc = JSON.parse(read('layouts.json'));
const css = read('templates/iasdr.css');
const lintSrc = read('scripts/lint-deck.mjs');
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------------------------------------------------------------- data from the sources
function rootVars(block) {
  const vars = [];
  for (const line of block.split('\n')) {
    const comment = (line.match(/\/\*\s*(.*?)\s*\*\//) || [])[1] || '';
    for (const m of line.replace(/\/\*.*?\*\//g, '').matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) vars.push({ name: m[1], value: m[2].trim(), comment });
  }
  return vars;
}
const rootBlock = css.slice(css.indexOf(':root{'), css.indexOf('\n}', css.indexOf(':root{')));
const vars = rootVars(rootBlock);
const hexVars = vars.filter(v => /^#[0-9a-f]{6}$/i.test(v.value));
const pxVar = name => parseFloat((vars.find(v => v.name === name) || {}).value) || 0;

const lum = hex => { const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(x => x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const COLOR_GROUPS = [
  ['品牌與強調', ['--field', '--accent', '--accent-2', '--chip', '--accent-soft', '--bar-top', '--bar-bottom', '--icon-a', '--icon-b', '--section-mark']],
  ['文字', ['--ink', '--text', '--text-2', '--inactive', '--rule']],
  ['頁面與表面', ['--bg-a', '--bg-b', '--card', '--tint', '--line', '--surface-2', '--device']],
  ['深色頁', ['--dark', '--dark-2', '--dark-line', '--dark-raised', '--on-field', '--on-dark-2']],
  ['狀態（只用於語意）', ['--danger', '--danger-soft', '--warning', '--warning-soft', '--success', '--success-soft']],
  ['角色（最多四種，以明度區分）', ['--role-1', '--role-2', '--role-3', '--role-4']],
];
const grouped = new Set(COLOR_GROUPS.flatMap(([, names]) => names));
const otherColors = hexVars.filter(v => !grouped.has(v.name)).map(v => v.name);
if (otherColors.length) COLOR_GROUPS.push(['其他', otherColors]);

const ROLE_ORDER = ['display', 'statement', 'subtitle', 'kicker', 'eyebrow', 'h1', 'h2', 'h3', 'lead', 'body-l', 'body', 'caption', 'chip', 'micro', 'stat'];
const HEAD_ROLES = new Set(['display', 'statement', 'subtitle', 'kicker', 'eyebrow', 'h1', 'h2', 'h3', 'lead', 'stat']);
const ROLE_USE = { display: '封面大標', statement: '提問頁主句', subtitle: '封面副標', kicker: '主句上方小字', eyebrow: '標題上方段落名', h1: '頁面標題（一句斷言）', h2: '區塊標題', h3: '卡片標題', lead: '引言句', 'body-l': '大內文', body: '內文', caption: '引用、圖說', chip: '膠囊標籤', micro: '來源列、頁碼（最小字級）', stat: '數字磚' };

const lintRules = [...lintSrc.matchAll(/(R\d\d): \['(error|warn)', '((?:[^'\\]|\\.)*)', '(\w+)'\]/g)].map(m => ({ id: m[1], level: m[2], desc: m[3].replace(/\\'/g, "'"), tier: m[4] }));
const TIER = { floor: ['可讀性底線', '不能覆寫'], system: ['系統完整性', '不能覆寫'], style: ['風格', '可附理由覆寫'], advisory: ['提醒', '不擋產出'] };

// ---------------------------------------------------------------- renders
async function toWebp(conv, png, maxW, maxH) {
  return conv.evaluate(async ({ b64, maxW, maxH }) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const k = Math.min(1, maxW / img.width, maxH / img.height), c = document.createElement('canvas');
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, c.width, c.height);
    return { url: c.toDataURL('image/webp', 0.74), w: c.width, h: c.height };
  }, { b64: png.toString('base64'), maxW, maxH });
}

async function capture() {
  const slides = {}, comps = {};
  const { browser, page: conv } = await openPage(path.join(ROOT, 'templates/iasdr-deck.html'));
  await conv.setContent('<body></body>');
  for (const file of ['templates/iasdr-layouts.html', 'templates/iasdr-deck.html']) {
    const { browser: b2, page } = await openPage(path.join(ROOT, file));
    const handles = await page.$$('.deck .slide');
    for (const h of handles) {
      const { id, lang } = await h.evaluate(s => ({ id: s.dataset.layout, lang: s.closest('[lang]').lang }));
      slides[`${id}|${lang}`] = await toWebp(conv, await h.screenshot({ scale: 'css' }), 960, 540);
    }
    // components: first occurrence (zh first), cropped with a margin, clipped to its slide
    for (const c of manifest.components) {
      if (comps[c.id]) continue;
      for (const lang of ['zh-Hant', 'en']) {
        const box = await page.evaluate(({ sels, lang }) => {
          for (const s of document.querySelectorAll(`.deck[lang="${lang}"] .slide`)) for (const q of sels) {
            const el = s.matches(q) ? s : s.querySelector(q); if (!el) continue;
            const r = el.getBoundingClientRect(), S = s.getBoundingClientRect(); if (!r.width || !r.height) continue;
            const pad = 24, x = Math.max(S.left, r.left - pad), y = Math.max(S.top, r.top - pad);
            return { x: x + scrollX, y: y + scrollY, width: Math.min(S.right, r.right + pad) - x, height: Math.min(S.bottom, r.bottom + pad) - y, layout: s.dataset.layout };
          }
          return null;
        }, { sels: c.selectors, lang });
        if (!box) continue;
        const png = await page.screenshot({ clip: { x: box.x, y: box.y, width: box.width, height: box.height }, fullPage: true, scale: 'css' });
        comps[c.id] = { ...await toWebp(conv, png, 720, 420), from: box.layout };
        break;
      }
    }
    await b2.close();
  }
  await browser.close();
  return { slides, comps };
}

// ---------------------------------------------------------------- page
function swatches() {
  return COLOR_GROUPS.map(([title, names]) => `<div class="swgroup"><h4>${esc(title)}</h4><div class="swgrid">${names.map(n => {
    const v = vars.find(x => x.name === n); if (!v || !/^#/.test(v.value)) return '';
    const onWhite = contrast(v.value, '#FFFFFF'), onBg = contrast(v.value, theme.colors.bgA);
    const ink = contrast(v.value, '#111111') > contrast(v.value, '#FFFFFF') ? '#111111' : '#FFFFFF';
    return `<figure class="sw"><div class="chipc" style="background:${v.value};color:${ink}"><span>${esc(v.value.toUpperCase())}</span></div><figcaption><code>${esc(n)}</code>${v.comment ? `<span class="use">${esc(v.comment)}</span>` : ''}<span class="cr" title="對比度：對白色／對頁面底色"><b>${onWhite.toFixed(2)}</b> 白 · <b>${onBg.toFixed(2)}</b> 底</span></figcaption></figure>`;
  }).join('')}</div></div>`).join('');
}

function typeScale() {
  const en = theme.typography.en, zh = theme.typography.zh;
  const rows = ROLE_ORDER.filter(r => en[r] || zh[r]).map(r => {
    const cell = (t, lang) => !t ? '<td class="na">—</td>' : `<td><div class="spec"><b>${t.size}</b><span>/ ${t.lineHeight ?? '—'}</span><span>${t.weight ?? ''}</span>${t.tracking && t.tracking !== '0' ? `<span>${esc(t.tracking)}</span>` : ''}</div><div class="spec-s" lang="${lang}" style="font-family:${HEAD_ROLES.has(r) ? 'var(--f-head)' : 'var(--f-body)'};font-size:${Math.max(9, t.size * 0.5)}px;font-weight:${t.weight ?? 400};line-height:${t.lineHeight ?? 1.2};letter-spacing:${t.tracking ?? 0}">${lang === 'en' ? 'Design adapts to context' : '設計隨情境調整'}</div></td>`;
    return `<tr><th scope="row"><code>${r}</code><span>${esc(ROLE_USE[r] || '')}</span></th>${cell(en[r], 'en')}${cell(zh[r], 'zh-Hant')}</tr>`;
  }).join('');
  return `<div class="tablewrap"><table class="type"><thead><tr><th>角色</th><th>English（px / 行高 / 字重 / 字距）</th><th>繁體中文</th></tr></thead><tbody>${rows}</tbody></table></div><p class="note">字樣以 1920 畫布的 50% 顯示。字型：標題 ${esc(en.families?.head || 'Manrope')}，內文 ${esc(en.families?.body || 'Inter')}，中文 Noto Sans TC。</p>`;
}

function spacing() {
  const items = [['--mx', '左右邊界'], ['--mt', '上邊界'], ['--mb', '下邊界'], ['--head-gap', '標題區 → 內容'], ['--stack-gap', '疊卡間距'], ['--title-indent', '標題縮排'], ['--pad-lg', '卡片內距'], ['--pad-md', '中卡內距'], ['--gutter', '欄距'], ['--pad-sm', '小內距'], ['--col-gap', '並列卡間距']].filter(([n]) => pxVar(n));
  const radii = [['--r-lg', '大卡'], ['--r-md', '中卡'], ['--r-ml', ''], ['--r-sm', '表格、帶'], ['--r-xs', ''], ['--r-2xs', '標記框']].filter(([n]) => pxVar(n));
  return `<div class="two"><div><h4>間距（8px 單位）</h4><ul class="bars">${items.map(([n, l]) => `<li><code>${n}</code><span class="bar" style="width:${pxVar(n) * 1.5}px"></span><b>${pxVar(n)}</b><span class="muted">${esc(l)}</span></li>`).join('')}</ul></div>
  <div><h4>圓角</h4><div class="radii">${radii.map(([n, l]) => `<figure><div style="border-radius:${pxVar(n)}px"></div><figcaption><code>${n}</code> <b>${pxVar(n)}</b>${l ? ` <span class="muted">${esc(l)}</span>` : ''}</figcaption></figure>`).join('')}</div>
  <h4>陰影</h4><div class="shadowdemo"><div style="box-shadow:${esc((vars.find(v => v.name === '--shadow') || {}).value || 'none')}">卡片 <code>--shadow</code></div></div></div></div>`;
}

function grid() {
  const W = 1920, H = 1080, mx = pxVar('--mx'), mt = pxVar('--mt'), mb = pxVar('--mb'), col = pxVar('--col'), gut = pxVar('--gutter'), ti = pxVar('--title-indent');
  const cols = Array.from({ length: 12 }, (_, i) => `<rect x="${mx + i * (col + gut)}" y="${mt}" width="${col}" height="${H - mt - mb}" class="g-col"/>`).join('');
  return `<div class="gridwrap"><svg viewBox="-40 -40 ${W + 80} ${H + 120}" role="img" aria-label="1920 × 1080 畫布格線">
  <rect x="0" y="0" width="${W}" height="${H}" class="g-canvas"/>${cols}
  <rect x="${mx}" y="${mt}" width="16" height="132" rx="8" class="g-bar"/>
  <text x="${mx + ti}" y="${mt + 34}" class="g-t">eyebrow</text><text x="${mx + ti}" y="${mt + 110}" class="g-t big">h1 標題（縮排 ${ti}）</text>
  <line x1="0" y1="${mt + 196 + pxVar('--head-gap')}" x2="${W}" y2="${mt + 196 + pxVar('--head-gap')}" class="g-dash"/>
  <text x="${mx}" y="${H - 32}" class="g-t">來源列 · 距底 32</text><text x="${W - 48}" y="${H - 32}" class="g-t" text-anchor="end">頁碼 · 右 48</text>
  <line x1="${mx}" y1="${H + 24}" x2="${W - mx}" y2="${H + 24}" class="g-dim"/><text x="${W / 2}" y="${H + 62}" class="g-t" text-anchor="middle">12 欄 × ${col}，欄距 ${gut}，內容寬 ${W - 2 * mx}</text>
  <text x="${mx / 2}" y="${H / 2}" class="g-t" text-anchor="middle">${mx}</text><text x="${W - mx / 2}" y="${H / 2}" class="g-t" text-anchor="middle">${mx}</text>
  <text x="${W / 2}" y="${mt / 2 + 10}" class="g-t" text-anchor="middle">上 ${mt}</text><text x="${W / 2}" y="${H - mb / 2 + 10}" class="g-t" text-anchor="middle">下 ${mb}</text>
  </svg></div>`;
}

// icons: the full set from templates/icons.js, grouped by the concept tables in components.md §H
const ICONS = JSON.parse(read('templates/icons.js').replace(/^[\s\S]*?window\.ICONS\s*=\s*/, '').replace(/;\s*$/, ''));
function iconGroups() {
  const h = read('references/components.md').split(/^## H\./m)[1]?.split(/^## [^H]/m)[0] ?? '';
  const groups = []; let cur = null;
  for (const line of h.split('\n')) {
    const g = line.match(/^\*\*([^*]+)\*\*/); if (g) { cur = { name: g[1], items: [] }; groups.push(cur); continue; }
    if (!cur || !line.startsWith('|') || /^\|\s*(概念|---)/.test(line)) continue;
    const cells = line.split('|').slice(1, -1).map(c => c.trim());
    for (let i = 0; i + 1 < cells.length; i += 2) { const name = (cells[i + 1].match(/`([\w-]+)`/) || [])[1]; if (name && cells[i]) cur.items.push({ concept: cells[i], name }); }
  }
  const listed = new Set(groups.flatMap(g => g.items.map(i => i.name)));
  const rest = Object.keys(ICONS).filter(n => !listed.has(n));
  if (rest.length) groups.push({ name: '其他', items: rest.map(name => ({ concept: '', name })) });
  return groups.filter(g => g.items.length);
}
const iconSvg = (name, px, line) => `<svg class="ico" width="${px}" height="${px}" viewBox="0 0 24 24" aria-hidden="true" style="stroke-width:${(line * 24 / px).toFixed(3)}">${ICONS[name] || ''}</svg>`;
function icons() {
  const groups = iconGroups(), missing = groups.flatMap(g => g.items).filter(i => !ICONS[i.name]).map(i => i.name);
  const sizes = [[128, 6, '卡片'], [64, 4, '列表'], [40, 3, '角色標記'], [32, 2.5, '圖例']];
  return `<div class="isizes">${sizes.map(([px, line, use]) => `<figure>${iconSvg('book-open', px, line)}<figcaption><b>${px}px</b> 線寬 ${line}<span class="muted">${use}</span></figcaption></figure>`).join('')}</div>
  <p class="note">Lucide 1.70.0（ISC 授權），24 格線條 icon；<code>stroke-width = 目標線寬 × 24 ÷ 顯示尺寸</code>。淺底用 <code>--icon-a</code> → <code>--icon-b</code> 漸層，色塊與深色頁用白色。icon 一定要配文字標籤；同一個概念全篇用同一個 icon。共 ${Object.keys(ICONS).length} 個${missing.length ? `；表上有但 icons.js 沒有：${missing.join('、')}` : ''}。</p>
  ${groups.map(g => `<div class="igroup"><h4>${esc(g.name.replace(/（.*$/, ''))} <span class="muted">${g.items.length}</span></h4><ul class="igrid">${g.items.map(i => `<li>${iconSvg(i.name, 48, 3)}<span class="iname"><code>${esc(i.name)}</code>${i.concept ? `<span>${esc(i.concept)}</span>` : ''}</span></li>`).join('')}</ul></div>`).join('')}`;
}

function img(rec, alt, cls = '') { return rec ? `<img class="${cls}" src="${rec.url}" width="${rec.w}" height="${rec.h}" alt="${esc(alt)}" loading="lazy" decoding="async">` : `<div class="noimg ${cls}">尚無範例</div>`; }
function langPair(slides, id, alt, cls) { return `<span class="lp" data-l="zh">${img(slides[`${id}|zh-Hant`], alt + '（中文）', cls)}</span><span class="lp" data-l="en">${img(slides[`${id}|en`], alt + '（英文）', cls)}</span>`; }

function components(comps) {
  const groups = [...new Set(manifest.components.map(c => c.group))];
  const status = c => {
    const h = { rendered: ['ok', 'HTML 已渲染'], 'css-only': ['warn', '只有 CSS'], missing: ['bad', '尚未實作'] }[c.status.html] || ['bad', c.status.html];
    return `<span class="pill ${h[0]}">${h[1]}</span>${c.status.pptx === 'converted' ? '<span class="pill ok">PPTX 可轉</span>' : ''}`;
  };
  return `<div class="filters" role="group" aria-label="元件類別"><button type="button" class="f on" data-g="all" aria-pressed="true">全部 <span>${manifest.components.length}</span></button>${groups.map(g => `<button type="button" class="f" data-g="${esc(g)}" aria-pressed="false">${esc(g.replace(/^[A-H] /, ''))} <span>${manifest.components.filter(c => c.group === g).length}</span></button>`).join('')}</div>
  <div class="comps">${manifest.components.map(c => `<article class="comp" data-g="${esc(c.group)}" id="${c.id}">
    <div class="cimg">${img(comps[c.id], c.name)}</div>
    <div class="cbody"><header><code class="cid">${c.id}</code><h4>${esc(c.name)}</h4></header>
    <p>${esc(c.purpose)}</p>${c.spec ? `<p class="specline">${esc(c.spec)}</p>` : ''}${c.zhNote ? `<p class="specline zh">中文：${esc(c.zhNote)}</p>` : ''}
    <div class="meta">${status(c)}</div>
    ${c.tokens.length ? `<details><summary>用到 ${c.tokens.length} 個 token</summary><p class="toks">${c.tokens.map(t => `<code>${esc(t)}</code>`).join(' ')}</p></details>` : ''}
    ${c.usedIn.length ? `<p class="used">用於 ${c.usedIn.slice(0, 8).map(u => `<a href="#L-${esc(u.replace(/[a-d]$/, ''))}">${esc(u)}</a>`).join(' ')}${c.usedIn.length > 8 ? ` 等 ${c.usedIn.length} 頁` : ''}</p>` : ''}</div></article>`).join('')}</div>`;
}

function layouts(slides) {
  const sections = [...new Map(layoutsDoc.layouts.map(l => [l.section.id, l.section])).values()];
  const card = l => {
    const first = l.implemented[0], key = first ? l.id + first : null;
    return `<article class="lay" id="L-${l.id}">
      <button type="button" class="thumb" data-open="${l.id}" aria-label="放大 ${esc(l.id)} ${esc(l.name)}">${key ? langPair(slides, key, `${l.id} ${l.name}`) : '<div class="noimg">尚未實作</div>'}</button>
      <div class="lbody"><header><code class="cid">${l.id}</code><h4>${esc(l.name)}</h4></header><p class="q">${esc(l.question)}</p>
      ${l.variants.length ? `<ul class="vars">${l.variants.map(v => `<li class="${v.implemented ? 'done' : ''}"><b>${v.id}</b> ${esc(v.name)}<span>${esc(v.when)}</span></li>`).join('')}</ul>` : ''}
      ${l.workbench.components.length ? `<p class="wb">工作台：${l.workbench.components.map(c => `<code>${esc(c)}</code>`).join(' ')}</p>` : ''}</div></article>`;
  };
  const deckIds = Object.keys(slides).filter(k => /^L\d+-/.test(k) && k.endsWith('|zh-Hant')).map(k => k.split('|')[0]).sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)));
  return `${sections.map(s => `<div class="lsec"><h3><span>${esc(s.id)}</span>${esc(s.name)}</h3><div class="lays">${layoutsDoc.layouts.filter(l => l.section.id === s.id).map(card).join('')}</div></div>`).join('')}
  <div class="lsec"><h3><span>範本</span>iasdr-deck.html：十頁中英範本</h3><div class="decks">${deckIds.map(id => `<figure><button type="button" class="thumb" data-deck="${id}" aria-label="放大 ${id}">${langPair(slides, id, id)}</button><figcaption><code>${esc(id)}</code></figcaption></figure>`).join('')}</div></div>
  <div class="lsec"><h3><span>主線</span>五種簡報的版型順序</h3><div class="spines">${layoutsDoc.spines.map(sp => `<div class="spine"><h4>${esc(sp.type)}</h4><p class="muted">${esc(sp.spine)}</p><ol>${sp.steps.map(st => `<li class="${st.optional ? 'opt' : ''}"><a href="#L-${st.layout}">${st.layout}${st.variant || ''}</a>${st.alternative ? `<span>/${esc(st.alternative)}</span>` : ''}</li>`).join('')}</ol></div>`).join('')}</div></div>`;
}

function rules() {
  const tiers = ['floor', 'system', 'style', 'advisory'];
  return `<div class="two"><div><h4>中文排版</h4><ul class="rl">
    <li><b>內文斷行</b><span><code>word-break: normal</code> ＋ <code>line-break: strict</code>：遵守標點禁則，句號、逗號不落在行首。</span></li>
    <li><b>標題斷行</b><span>標題用 <code>keep-all</code>，由作者在語意單位之間手動斷行；每行不超過 20 字、最多 2 行。</span></li>
    <li><b>不要用</b><span><code>keep-all</code> ＋ <code>overflow-wrap: anywhere</code>：實測會把分號推到行首。</span></li>
    <li><b>中英混排</b><span>中文與英文、數字之間留半形空白：「使用 LINE 官方帳號」、「完成 12 場訪談」。</span></li>
    <li><b>標點</b><span>中文句子用全形標點，引號用「」；不用驚嘆號。</span></li>
    <li><b>強調</b><span>一頁只用一種強調方式；中文不用斜體、底線。</span></li>
    <li><b>頁尾文獻</b><span>APA 7，最多 2 行；英文期刊名與卷數斜體，中文改粗體；中文簡報裡的英文文獻加 <code>lang="en"</code>。</span></li>
    <li><b>中英對照</b><span>中文字級約為英文的 0.9 倍，行高較大（內文 1.6 對 1.3）；英文字距略負，中文為 0。</span></li></ul></div>
  <div><h4>lint 規則（${lintRules.length} 條）</h4><div class="tablewrap"><table class="rules"><thead><tr><th>規則</th><th>檢查</th><th>層級</th></tr></thead><tbody>${tiers.flatMap(t => lintRules.filter(r => r.tier === t)).map(r => `<tr><td><code>${r.id}</code></td><td>${esc(r.desc)}</td><td><span class="pill ${r.tier}">${TIER[r.tier][0]}</span></td></tr>`).join('')}</tbody></table></div>
  <p class="note">${tiers.map(t => `<span class="pill ${t}">${TIER[t][0]}</span> ${TIER[t][1]}`).join('　')}。風格規則可在元素上加 <code>data-lint-allow="R13: 理由"</code> 覆寫。</p></div></div>`;
}

function page({ slides, comps }) {
  const counts = { comps: manifest.components.length, rendered: manifest.summary.rendered.length, layouts: layoutsDoc.layouts.length, variants: layoutsDoc.summary.variants, impl: layoutsDoc.summary.implementedVariants, rules: lintRules.length };
  const lightbox = {};
  for (const l of layoutsDoc.layouts) lightbox[l.id] = { title: `${l.id} ${l.name}`, q: l.question, items: l.implemented.map(v => ({ id: l.id + v, name: (l.variants.find(x => x.id === v) || {}).name || '', when: (l.variants.find(x => x.id === v) || {}).when || '' })) };
  return `<title>IASDR 簡報設計系統</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&family=Inter:wght@400;500;600;700&family=Noto+Sans+TC:wght@400;500;700&display=swap">
<style>
/* Layout: one long reference sheet on the iasdr page palette; sticky section nav; content max 1240. */
:root{
  --bg:${theme.colors.bgA}; --surface:${theme.colors.card}; --ink:${theme.colors.ink}; --text:${theme.colors.text}; --muted:${theme.colors.text2};
  --line:#E3E8F2; --accent:${theme.colors.accent}; --tint:${theme.colors.tint || '#EEF4FF'}; --bar-a:${theme.colors.barTop}; --bar-b:${theme.colors.barBottom};
  --ok:${theme.colors.success}; --warn:${theme.colors.warning}; --bad:${theme.colors.danger}; --ok-bg:${theme.colors.successSoft}; --warn-bg:${theme.colors.warningSoft}; --bad-bg:${theme.colors.dangerSoft};
  --f-head:"Manrope","Noto Sans TC",system-ui,sans-serif; --f-body:"Inter","Noto Sans TC",system-ui,sans-serif; --f-mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace;
}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg:#1E1E1E;--surface:#2B2C30;--ink:#F3F5FA;--text:#E6E8EE;--muted:#B9BEC9;--line:#41444C;--accent:#8DB2FF;--tint:#2E3A55;--ok:#6FCF97;--warn:#E8B25A;--bad:#F08C7A;--ok-bg:#1F3A2C;--warn-bg:#3D3020;--bad-bg:#43251F;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#1E1E1E;--surface:#2B2C30;--ink:#F3F5FA;--text:#E6E8EE;--muted:#B9BEC9;--line:#41444C;--accent:#8DB2FF;--tint:#2E3A55;--ok:#6FCF97;--warn:#E8B25A;--bad:#F08C7A;--ok-bg:#1F3A2C;--warn-bg:#3D3020;--bad-bg:#43251F;color-scheme:dark}
*{box-sizing:border-box}
body{background:var(--bg);color:var(--text);font:400 15px/1.6 var(--f-body)}
body::before{content:"";position:fixed;inset:0 0 auto;height:env(safe-area-inset-top,0px);z-index:10;background:var(--surface)}
a{color:var(--accent)}
code{font:500 12.5px/1.4 var(--f-mono);color:var(--muted)}
h1,h2,h3,h4{font-family:var(--f-head);color:var(--ink);text-wrap:balance;margin:0}
.wrap{max-width:1240px;margin:0 auto;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}
.top{position:sticky;top:env(safe-area-inset-top,0px);z-index:5;background:var(--surface);border-bottom:1px solid var(--line)}
.top .wrap{display:flex;align-items:center;gap:20px;padding-block:10px;flex-wrap:wrap}
.brand{display:flex;align-items:center;gap:10px;font:700 15px/1 var(--f-head);color:var(--ink);text-decoration:none}
.brand i{width:6px;height:22px;border-radius:3px;background:linear-gradient(180deg,var(--bar-a),var(--bar-b))}
.top nav{display:flex;gap:4px;flex-wrap:wrap;flex:1}
.top nav a{color:var(--muted);text-decoration:none;font-weight:600;font-size:14px;padding:6px 10px;border-radius:8px}
.top nav a:hover,.top nav a:focus-visible{background:var(--tint);color:var(--accent)}
.seg{display:inline-flex;border:1px solid var(--line);border-radius:999px;padding:2px}
.seg button{border:0;background:none;color:var(--muted);font:600 13px/1 var(--f-body);padding:7px 12px;border-radius:999px;cursor:pointer}
.seg button[aria-pressed="true"]{background:var(--accent);color:var(--surface)}
button:focus-visible,a:focus-visible,summary:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.hero{padding-block:48px 24px;display:grid;gap:14px}
.hero .eyebrow{font:700 13px/1 var(--f-head);letter-spacing:.08em;color:var(--accent);text-transform:uppercase}
.hero h1{font-size:clamp(30px,4.6vw,48px);font-weight:800;letter-spacing:-.01em;line-height:1.12}
.hero p{max-width:64ch;color:var(--muted);margin:0}
.facts{display:flex;flex-wrap:wrap;gap:8px 22px;margin:8px 0 0;padding:0;list-style:none;font-size:14px;color:var(--muted)}
.facts b{font:700 15px var(--f-head);color:var(--ink);font-variant-numeric:tabular-nums;margin-right:4px}
section.block{padding-block:40px;border-top:1px solid var(--line);scroll-margin-top:72px;display:grid;gap:22px}
section.block>header{display:grid;gap:6px}
section.block>header h2{font-size:26px;font-weight:800;display:flex;align-items:center;gap:12px}
section.block>header h2::before{content:"";width:8px;height:26px;border-radius:4px;background:linear-gradient(180deg,var(--bar-a),var(--bar-b))}
section.block>header p{margin:0;color:var(--muted);max-width:70ch}
h4{font-size:15px;font-weight:700;margin-bottom:10px}
.muted{color:var(--muted)} .note{font-size:13px;color:var(--muted);margin:0}
.swgroup{display:grid;gap:4px}
.swgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(176px,1fr));gap:12px}
.sw{margin:0;background:var(--surface);border:1px solid var(--line);border-radius:12px;overflow:hidden;display:grid}
.chipc{height:64px;display:flex;align-items:flex-end;padding:8px 10px;font:600 12px var(--f-mono)}
.sw figcaption{padding:8px 10px 10px;display:grid;gap:2px;min-width:0}
.sw .use{font-size:12px;color:var(--muted);line-height:1.4}
.cr{font-size:11.5px;color:var(--muted);font-variant-numeric:tabular-nums} .cr b{color:var(--text);font-weight:600}
.tablewrap{overflow-x:auto;border:1px solid var(--line);border-radius:12px;background:var(--surface)}
table{border-collapse:collapse;width:100%;font-size:14px}
th,td{text-align:left;padding:10px 14px;border-bottom:1px solid var(--line);vertical-align:top}
thead th{font:700 12px var(--f-head);letter-spacing:.04em;color:var(--muted);background:var(--tint)}
tbody tr:last-child>*{border-bottom:0}
.type th[scope=row]{min-width:140px} .type th[scope=row] span{display:block;margin-top:2px;font:400 12.5px var(--f-body);color:var(--muted)}
.type td{min-width:230px} .type td.na{color:var(--muted)}
.spec{display:flex;gap:8px;align-items:baseline;font-variant-numeric:tabular-nums;color:var(--muted);font-size:13px}
.spec b{font:700 16px var(--f-head);color:var(--ink)}
.spec-s{color:var(--ink);margin-top:4px;max-width:440px;overflow-wrap:anywhere}
.two{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:28px}
.bars{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.bars li{display:grid;grid-template-columns:118px auto 34px 1fr;align-items:center;gap:10px;font-size:13px}
.bar{display:block;height:12px;border-radius:3px;background:var(--accent);max-width:100%}
.bars b{font-variant-numeric:tabular-nums;text-align:right}
.bars li>*{min-width:0} .bars code{overflow-wrap:anywhere}
.sw code,.comp code,.lay code{overflow-wrap:anywhere}
.radii{display:flex;flex-wrap:wrap;gap:14px;margin-bottom:18px}
.radii figure{margin:0;display:grid;gap:6px;font-size:12.5px}
.radii figure div{width:96px;height:64px;background:var(--tint);border:1.5px solid var(--accent)}
.shadowdemo{padding:24px;background:${theme.colors.bgA};border-radius:12px}
.shadowdemo div{background:#FFFFFF;color:#111111;border-radius:20px;padding:22px;font-weight:600}
.shadowdemo code{color:#4B4B4B}
.gridwrap{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:12px}
.gridwrap svg{width:100%;height:auto;display:block}
.g-canvas{fill:var(--bg);stroke:var(--line);stroke-width:2}
.g-col{fill:var(--accent);fill-opacity:.1}
.g-bar{fill:var(--accent)}
.g-t{fill:var(--muted);font:600 30px var(--f-body)} .g-t.big{fill:var(--ink);font:700 56px var(--f-head)}
.g-dash{stroke:var(--accent);stroke-width:2;stroke-dasharray:10 10}
.g-dim{stroke:var(--muted);stroke-width:2}
.ico{flex:none;fill:none;stroke:url(#sc-ig);stroke-linecap:round;stroke-linejoin:round;display:block}
.ico *{fill:none;stroke:url(#sc-ig)}
.isizes{display:flex;flex-wrap:wrap;align-items:flex-end;gap:28px;background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:20px}
.isizes figure{margin:0;display:grid;justify-items:start;gap:8px}
.isizes figcaption{font-size:13px;display:grid} .isizes figcaption b{font:700 14px var(--f-head);color:var(--ink)}
.igroup{display:grid;gap:4px}
.igrid{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,200px),1fr));gap:8px}
.igrid li{display:flex;align-items:center;gap:12px;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:10px 12px;min-width:0}
.iname{display:grid;min-width:0} .iname code{color:var(--ink);font-weight:600;overflow-wrap:anywhere} .iname span{font-size:12.5px;color:var(--muted)}
.filters{display:flex;flex-wrap:wrap;gap:6px}
.f{border:1px solid var(--line);background:var(--surface);color:var(--text);border-radius:999px;padding:6px 12px;font:600 13px var(--f-body);cursor:pointer}
.f span{color:var(--muted);font-weight:500;margin-left:2px}
.f.on{background:var(--accent);border-color:var(--accent);color:var(--surface)} .f.on span{color:inherit;opacity:.8}
.comps{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,290px),1fr));gap:14px}
.comp{background:var(--surface);border:1px solid var(--line);border-radius:14px;overflow:hidden;display:grid;grid-template-rows:170px 1fr;scroll-margin-top:72px}
.cimg{background:${theme.colors.bgB};display:grid;place-items:center;padding:10px;border-bottom:1px solid var(--line)}
.cimg img{max-height:150px;width:auto;object-fit:contain;border-radius:6px}
.noimg{display:grid;place-items:center;color:var(--muted);font-size:13px;width:100%;height:100%;min-height:90px;background:repeating-linear-gradient(135deg,transparent 0 10px,var(--line) 10px 11px)}
.cbody{padding:12px 14px 14px;display:grid;gap:6px;align-content:start;min-width:0}
.cbody header,.lbody header{display:flex;gap:8px;align-items:baseline}
.cid{font:700 12px var(--f-mono);color:var(--accent);background:var(--tint);padding:2px 6px;border-radius:5px}
.cbody h4,.lbody h4{margin:0;font-size:15.5px}
.cbody p,.lbody p{margin:0;font-size:13.5px}
.specline{color:var(--muted);font-size:12.5px!important;line-height:1.5}
.meta{display:flex;gap:6px;flex-wrap:wrap}
.pill{display:inline-flex;align-items:center;font:600 11.5px/1 var(--f-body);padding:4px 8px;border-radius:999px;white-space:nowrap}
.pill.ok{background:var(--ok-bg);color:var(--ok)} .pill.warn{background:var(--warn-bg);color:var(--warn)} .pill.bad{background:var(--bad-bg);color:var(--bad)}
.pill.floor{background:var(--bad-bg);color:var(--bad)} .pill.system{background:var(--tint);color:var(--accent)} .pill.style{background:var(--warn-bg);color:var(--warn)} .pill.advisory{background:var(--line);color:var(--muted)}
details summary{cursor:pointer;font-size:12.5px;color:var(--muted)} .toks{line-height:1.9}
.used{font-size:12.5px!important;color:var(--muted)} .used a{font:600 12px var(--f-mono);margin-right:4px}
.lsec{display:grid;gap:14px} .lsec+.lsec{margin-top:20px}
.lsec h3{font-size:18px;display:flex;gap:10px;align-items:center}
.lsec h3 span{font:800 12px var(--f-mono);background:var(--ink);color:var(--bg);padding:4px 8px;border-radius:6px}
.lays{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,360px),1fr));gap:16px}
.lay{background:var(--surface);border:1px solid var(--line);border-radius:14px;overflow:hidden;display:grid;grid-template-rows:auto 1fr;scroll-margin-top:72px}
.thumb{display:block;width:100%;padding:0;border:0;background:${theme.colors.bgA};cursor:zoom-in;aspect-ratio:16/9;overflow:hidden}
.thumb img,.thumb .noimg{width:100%;height:100%;object-fit:cover;display:block}
.lbody{padding:12px 14px 14px;display:grid;gap:8px;align-content:start;min-width:0}
.q{color:var(--ink);font-weight:500}
.vars{list-style:none;margin:0;padding:0;display:grid;gap:4px;font-size:12.5px}
.vars li{display:grid;grid-template-columns:18px auto;column-gap:6px;color:var(--muted)}
.vars li b{grid-row:span 2;font:700 12px var(--f-mono);color:var(--muted);text-align:center;border:1px solid var(--line);border-radius:4px;height:18px;line-height:16px}
.vars li.done b{background:var(--accent);border-color:var(--accent);color:var(--surface)}
.vars li span{grid-column:2;font-size:12px}
.wb{font-size:12.5px!important;color:var(--muted)}
.lp[data-l="en"]{display:none} .lang-en .lp[data-l="en"]{display:contents} .lang-en .lp[data-l="zh"]{display:none} .lp[data-l="zh"]{display:contents}
.decks{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,220px),1fr));gap:12px}
.decks figure{margin:0;display:grid;gap:6px} .decks .thumb{border-radius:10px;border:1px solid var(--line)}
.spines{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,360px),1fr));gap:14px}
.spine{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:14px;display:grid;gap:8px}
.spine p{margin:0;font-size:13px}
.spine ol{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:6px;counter-reset:s}
.spine li{font:600 12px var(--f-mono);display:flex;align-items:center;gap:2px}
.spine li a{background:var(--tint);padding:4px 7px;border-radius:6px;text-decoration:none}
.spine li.opt a{background:none;border:1px dashed var(--accent)}
.spine li+li::before{content:"→";color:var(--muted);margin-right:4px;font-family:var(--f-body)}
.spine li span{color:var(--muted)}
.rl{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.rl li{display:grid;grid-template-columns:72px 1fr;gap:10px;font-size:14px}
.rl li b{font-family:var(--f-head);color:var(--ink)}
.rules td:nth-child(2){min-width:260px}
footer.end{padding-block:32px 48px;border-top:1px solid var(--line);font-size:13px;color:var(--muted);display:grid;gap:6px}
dialog{border:0;padding:0;border-radius:16px;background:var(--surface);color:var(--text);width:min(1100px,calc(100vw - 24px));max-height:calc(100vh - 24px)}
dialog::backdrop{background:rgb(10 16 30 / .7)}
.lbx{display:grid;gap:12px;padding:16px}
.lbx header{display:flex;gap:12px;align-items:center}
.lbx header h3{flex:1;font-size:18px}
.lbx .x{border:1px solid var(--line);background:var(--surface);color:var(--text);border-radius:8px;padding:6px 12px;font:600 13px var(--f-body);cursor:pointer}
.lbx img{width:100%;height:auto;border-radius:10px;border:1px solid var(--line);display:block}
.lbx .vtabs{display:flex;flex-wrap:wrap;gap:6px}
.lbx .cap{margin:0;color:var(--muted);font-size:13.5px}
@media (max-width:560px){.top nav{order:3;flex-basis:100%}.bars li{grid-template-columns:96px 1fr 30px}.bars li .muted{display:none}.rl li{grid-template-columns:1fr}}
@media (prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}
html{scroll-behavior:smooth}
</style>

<div class="top"><div class="wrap"><a class="brand" href="#top"><i></i>IASDR 簡報設計系統</a>
<nav aria-label="區塊"><a href="#tokens">Token</a><a href="#grid">格線</a><a href="#imagery">圖像</a><a href="#icons">Icon</a><a href="#components">元件</a><a href="#layouts">版型</a><a href="#rules">規則</a></nav>
<div class="seg" role="group" aria-label="範例語言"><button type="button" id="lang-zh" data-lang="zh" aria-pressed="true">中文</button><button type="button" id="lang-en" data-lang="en" aria-pressed="false">English</button></div></div></div>

<main class="wrap" id="top">
<div class="hero"><span class="eyebrow">deck-design-system · iasdr</span><h1>一套視覺標準，兩種排版系統</h1>
<p>研討會、口試與研究簡報共用的設計系統。同一組格線與元件，中文與英文各有自己的字級、行高與字距。這一頁的數值、元件與版型都由原始檔產生；HTML 經 lint 檢查後，可直接轉成可編輯的 PPTX。</p>
<ul class="facts"><li><b>1920 × 1080</b>畫布，8px 單位</li><li><b>12</b>欄格線</li><li><b>${counts.comps}</b>個元件（${counts.rendered} 個已渲染）</li><li><b>${counts.layouts}</b>個敘事版型，${counts.variants} 個變體（${counts.impl} 個已實作）</li><li><b>${counts.rules}</b>條 lint 規則</li></ul></div>

<section class="block" id="tokens"><header><h2>Design token</h2><p>唯一來源是 <code>tokens.json</code> 的 <code>themes.iasdr</code>，投影成 <code>iasdr.css</code> 的 CSS 變數。對比度欄位是對白色與頁面底色（${theme.colors.bgA}）的比值；一般文字需 4.5，24px 粗體或 32px 以上需 3。</p></header>
${swatches()}<h3 style="font-size:18px">字級</h3>${typeScale()}${spacing()}</section>

<section class="block" id="grid"><header><h2>格線與邊界</h2><p>以 1920 × 1080 的實際比例繪製。卡片從邊界 ${pxVar('--mx')} 開始，與標題直條對齊；標題文字縮排 ${pxVar('--title-indent')}。</p></header>${grid()}</section>

<section class="block" id="imagery"><header><h2>圖像</h2><p>原版的辨識度有一半來自圖像。完整規格見 <code>references/iasdr-imagery.md</code>；素材另外準備，不取自原檔。</p></header>
<div class="two"><div><h4>插畫 C63 <code>.illus</code></h4><ul class="rl">
<li><b>線條</b><span>單色線條，1920 畫布上 6px，圓頭圓角；輪廓留 1–3 處缺口，不填色。</span></li>
<li><b>顏色</b><span>由上到下的漸層 <code>--icon-a</code> → <code>--icon-b</code>，以整張插畫的高度計算。</span></li>
<li><b>造型</b><span>簡化的側面人物，大圓頭、無五官細節，配一到兩件道具（筆電、平板、書、望遠鏡、長條圖、帶三點的視窗）；最多一個狀態符號（問號、亂線團、虛線箭頭）。</span></li>
<li><b>尺寸</b><span>疊卡 144–176，欄卡上方 160–200，情境大圖 240–320；並列卡片的插畫同高、底緣對齊。</span></li>
<li><b>何時用</b><span>卡片在講「一個人遇到的情況」用插畫；講「一個概念或資料類型」用 icon。同一頁不混用。</span></li></ul></div>
<div><h4>照片與標誌</h4><ul class="rl">
<li><b>色塊頁</b><span><code>.photo-slot.has-photo</code>：照片與 <code>--field</code> 色彩增值，形成雙色調，往左淡出；白字對比仍需 ≥ 4.5。</span></li>
<li><b>內容頁</b><span>C64 <code>.photo-wash</code>：去色、透明度 10%、貼右緣寬 30%，在內容下方；一份簡報最多三頁。</span></li>
<li><b>頭像</b><span>圓形、無外框；封面 84px，團隊頁 120–160px；用本人同意的照片。</span></li>
<li><b>標誌</b><span>封面左上研討會標誌（白色，高 48–64），右上校系章（寬 120–140）；只用正式檔案，沒有就留空。</span></li>
<li><b>佔位</b><span>範本不印出佔位文字；空的 <code>.illus</code> 由 lint R27 提醒。</span></li></ul></div></div></section>

<section class="block" id="icons"><header><h2>Icon</h2><p>依 <code>components.md</code> 的概念對照表分組；每個概念固定用同一個 icon。需要「人」或「情境」時改用插畫（見上一節）。</p></header>
<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><linearGradient id="sc-ig" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="24"><stop offset="0" stop-color="${theme.colors.iconA}"/><stop offset="1" stop-color="${theme.colors.iconB}"/></linearGradient></defs></svg>
${icons()}</section>

<section class="block" id="components"><header><h2>元件</h2><p>每張圖都是從範本實際渲染截下來的。「只有 CSS」表示樣式已寫好、範本還沒用到；「尚未實作」表示規格已定、還沒有樣式。</p></header>${components(comps)}</section>

<section class="block" id="layouts"><header><h2>版型</h2><p>一個版型回答一個問題。先依問題選版型，再依條件選變體；實心的變體代號表示已實作。點圖片可放大，右上角可切換中英文版本。</p></header>${layouts(slides)}</section>

<section class="block" id="rules"><header><h2>排版與檢查規則</h2><p>完整規則見 <code>references/zh-typesetting.md</code> 與 <code>references/iasdr-typesetting.md</code>；<code>scripts/lint-deck.mjs</code> 會在產出前逐條檢查。</p></header>${rules()}</section>

<footer class="end"><span>由 <code>scripts/build-showcase.mjs</code> 於 ${new Date().toISOString().slice(0, 10)} 產生，來源：tokens.json、iasdr.css、manifest.json、layouts.json、兩份範本。</span><span>設計系統變更後重新執行即可更新這一頁。</span></footer>
</main>

<dialog id="lbx" aria-labelledby="lbx-title"><div class="lbx"><header><h3 id="lbx-title"></h3><div class="seg" role="group" aria-label="版本"><button type="button" data-lang="zh" aria-pressed="true">中文</button><button type="button" data-lang="en" aria-pressed="false">English</button></div><button type="button" class="x" id="lbx-close">關閉</button></header><p class="cap" id="lbx-q"></p><div class="vtabs" id="lbx-tabs"></div><img id="lbx-img" alt=""><p class="cap" id="lbx-when"></p></div></dialog>

<script type="application/json" id="data-lightbox">${JSON.stringify(lightbox).replace(/</g, '\\u003c')}</script>
<script>
(function(){
  var root=document.documentElement, lang='zh';
  try{ if(localStorage.getItem('iasdr-showcase-lang')==='en') lang='en'; }catch(e){}
  function setLang(l){ lang=l; root.classList.toggle('lang-en', l==='en');
    document.querySelectorAll('.seg [data-lang]').forEach(function(b){ b.setAttribute('aria-pressed', String(b.dataset.lang===l)); });
    try{ localStorage.setItem('iasdr-showcase-lang', l); }catch(e){}
    if(dlg.open) show(cur.list, cur.i); }
  document.addEventListener('click', function(e){ var b=e.target.closest('.seg [data-lang]'); if(b) setLang(b.dataset.lang); });
  // component filter
  var fs=document.querySelectorAll('.f');
  fs.forEach(function(f){ f.addEventListener('click', function(){ fs.forEach(function(x){ x.classList.toggle('on', x===f); x.setAttribute('aria-pressed', String(x===f)); });
    document.querySelectorAll('.comp').forEach(function(c){ c.hidden = f.dataset.g!=='all' && c.dataset.g!==f.dataset.g; }); }); });
  // lightbox: images are already on the page; reuse their data URLs
  var data=JSON.parse(document.getElementById('data-lightbox').textContent), dlg=document.getElementById('lbx'), cur={list:[],i:0};
  var SRC={}; document.querySelectorAll('.thumb').forEach(function(t){ var key=t.dataset.open||t.dataset.deck; t.querySelectorAll('.lp').forEach(function(p){ var im=p.querySelector('img'); if(im) SRC[key+'|'+p.dataset.l]=im.src; }); });
  function srcFor(id){ return SRC[id+'|'+lang] || SRC[id+'|zh'] || ''; }
  function show(list,i){ cur={list:list,i:i}; var it=list[i]; document.getElementById('lbx-img').src=it.src(); document.getElementById('lbx-img').alt=it.title;
    document.getElementById('lbx-when').textContent=it.when||''; document.querySelectorAll('#lbx-tabs .f').forEach(function(b,k){ b.classList.toggle('on',k===i); b.setAttribute('aria-pressed',String(k===i)); }); }
  function open(title,q,list){ document.getElementById('lbx-title').textContent=title; document.getElementById('lbx-q').textContent=q||'';
    var tabs=document.getElementById('lbx-tabs'); tabs.innerHTML=''; if(list.length>1) list.forEach(function(it,k){ var b=document.createElement('button'); b.type='button'; b.className='f'; b.textContent=it.label; b.onclick=function(){ show(list,k); }; tabs.appendChild(b); });
    show(list,0); if(!dlg.open) dlg.showModal(); }
  document.querySelectorAll('.thumb').forEach(function(t){ t.addEventListener('click', function(){
    if(t.dataset.deck){ var id=t.dataset.deck; open(id,'',[{label:id,title:id,when:'',src:function(){ return SRC[id+'|'+lang]||''; }}]); return; }
    var L=data[t.dataset.open]; if(!L||!L.items.length) return;
    // variant images other than the first live only in the gallery source; the first is on the card
    open(L.title,L.q,L.items.map(function(v){ return {label:v.id.slice(-1)+' '+v.name,title:v.id,when:v.when,src:function(){ return VSRC[v.id+'|'+lang]||VSRC[v.id+'|zh']||srcFor(t.dataset.open); }}; })); }); });
  var VSRC=JSON.parse(document.getElementById('data-variants').textContent);
  document.getElementById('lbx-close').onclick=function(){ dlg.close(); };
  dlg.addEventListener('click', function(e){ if(e.target===dlg) dlg.close(); });
  setLang(lang);
})();
</script>`;
}

const shots = await capture();
// extra variant renders (beyond each layout's first) for the lightbox
const variants = {};
for (const l of layoutsDoc.layouts) for (const v of l.implemented.slice(1)) for (const [lg, key] of [['zh', 'zh-Hant'], ['en', 'en']]) { const s = shots.slides[`${l.id}${v}|${key}`]; if (s) variants[`${l.id}${v}|${lg}`] = s.url; }
for (const l of layoutsDoc.layouts) { const v = l.implemented[0]; if (!v) continue; for (const [lg, key] of [['zh', 'zh-Hant'], ['en', 'en']]) { const s = shots.slides[`${l.id}${v}|${key}`]; if (s) variants[`${l.id}${v}|${lg}`] = null; } }
let html = page(shots).replace('</script>\n<script>', `</script>\n<script type="application/json" id="data-variants">${JSON.stringify(Object.fromEntries(Object.entries(variants).filter(([, v]) => v)))}</script>\n<script>`);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html);
const missing = manifest.components.filter(c => !shots.comps[c.id]).map(c => c.id);
console.log(`${path.relative(process.cwd(), OUT)}: ${(fs.statSync(OUT).size / 1e6).toFixed(2)} MB · ${Object.keys(shots.slides).length} slide renders · ${Object.keys(shots.comps).length} component crops${missing.length ? ` · no crop: ${missing.join(',')}` : ''}`);
