#!/usr/bin/env node
// Convert a rendered iasdr HTML deck into an editable PPTX.
//
// The HTML (checked by lint-deck.mjs) is the single source of the design. Instead of re-implementing
// every component in PowerPoint terms, this renders the page in headless Chrome, measures what the
// browser actually laid out and draws the same thing with native PPTX objects at 1280×720 (13.33 in):
//   boxes      -> shapes (fill, border, inset/outer ring, radius, soft shadow)
//   text       -> editable text boxes; runs keep colour/weight/size/font; lines break exactly where
//                 the browser broke them (so Chinese line-break rules come from the browser, not PowerPoint)
//   icons      -> embedded SVG (vector, gradient kept)
//   gradients, clip-path shapes -> the element's own background as a transparent PNG; its text stays editable
//
// Usage: node scripts/html-to-pptx.mjs <deck.html> --out deck.pptx [--lang zh-Hant|en] [--compare dir]
//   --compare dir  per slide: html-NN.png, pptx-NN.png (artifact-tool render) and compare-NN.png
// Known losses: letter-spacing; font weights other than regular/bold (500 → regular, 800 → bold).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openPage } from './browser-lib.mjs';
import { postProcess } from './pptx-post.mjs';

const runtime = process.env.WORKBENCH_RUNTIME_MODULES
  || path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
export const PPTX_SIZE = { width: 1280, height: 720 };
const WRAP_SLACK = 1.06;   // multi-line boxes: room so PowerPoint never re-wraps a browser line
const LINE_SLACK = 1.15;   // single-line boxes (no wrap): room for wider fallback fonts

// ---------------------------------------------------------------- in-page measurement
function measure({ lang }) {
  const NS = 'http://www.w3.org/2000/svg';
  const px = v => parseFloat(v) || 0;
  const rgba = v => {
    const m = /rgba?\(([^)]+)\)/.exec(v || ''); if (!m) return null;
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const hex = c => '#' + [c.r, c.g, c.b].map(n => Math.round(n).toString(16).padStart(2, '0')).join('').toUpperCase()
    + (c.a < 0.999 ? '/' + Math.round(c.a * 100) : '');
  const fontOf = cs => cs.fontFamily.split(',').map(f => f.trim().replace(/^["']|["']$/g, '').replace(/^IASDR /, ''));
  const CJK = /Noto Sans (TC|CJK)|PingFang|Heiti|JhengHei|Hiragino/i;
  const latinFont = cs => fontOf(cs).find(f => !CJK.test(f) && !/^(sans-serif|serif|system-ui)$/.test(f)) || 'Inter';
  const isInline = cs => cs.display === 'inline' || cs.display === 'contents';
  const label = el => String(el.className?.baseVal ?? el.className ?? '').split(' ')[0] || el.tagName.toLowerCase();

  // 1. turn ::before/::after into real elements so they are measured like everything else
  for (const el of document.querySelectorAll('.slide, .slide *')) {
    if (el instanceof SVGElement) continue;
    for (const which of ['::before', '::after']) {
      const cs = getComputedStyle(el, which);
      if (!cs || cs.content === 'none' || cs.content === 'normal' || cs.display === 'none') continue;
      const span = document.createElement('span'); span.dataset.pseudo = which;
      for (const p of cs) span.style.setProperty(p, cs.getPropertyValue(p));
      const attr = /attr\(([\w-]+)\)/.exec(cs.content), str = /^"([\s\S]*)"$/.exec(cs.content);
      span.textContent = attr ? el.getAttribute(attr[1]) ?? '' : str ? str[1].replace(/\\(.)/g, '$1') : '';
      span.className = 'pseudo-' + label(el);
      which === '::before' ? el.prepend(span) : el.append(span);
    }
  }
  const off = document.createElement('style'); off.textContent = '*::before,*::after{content:none!important}'; document.head.append(off);

  const shadowParts = v => (v && v !== 'none') ? v.split(/,(?![^(]*\))/).map(s => {
    const color = rgba(s), nums = (s.replace(/rgba?\([^)]*\)/, '').match(/-?[\d.]+(?:px)?/g) || []).map(px);
    return { inset: /inset/.test(s), x: nums[0] || 0, y: nums[1] || 0, blur: nums[2] || 0, spread: nums[3] || 0, color };
  }) : [];

  function svgMarkup(svg) {
    const clone = svg.cloneNode(true), r = svg.getBoundingClientRect();
    clone.setAttribute('xmlns', NS); clone.setAttribute('width', r.width); clone.setAttribute('height', r.height);
    const src = [svg, ...svg.querySelectorAll('*')], dst = [clone, ...clone.querySelectorAll('*')];
    src.forEach((s, i) => { const c = getComputedStyle(s);
      // plain SVG 1.1 values: url(#id) without quotes, unitless numbers (PowerPoint's and artifact-tool's SVG readers)
      for (const p of ['stroke', 'fill', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-opacity', 'fill-opacity', 'stroke-dasharray', 'stroke-dashoffset', 'opacity']) { const v = c.getPropertyValue(p); if (v) dst[i].setAttribute(p, v.replace(/url\(\s*["']?(#[\w-]+)["']?\s*\)/, 'url($1)').replace(/^(-?[\d.]+)px$/, '$1')); }
      if (s instanceof SVGTextContentElement) {   // SVG text: carry the CSS font, which a standalone SVG would lose
        const fam = fontOf(c).filter(f => !/^(sans-serif|serif|system-ui)$/.test(f));
        dst[i].setAttribute('font-family', [...new Set([...fam, 'Noto Sans TC'])].map(f => `'${f}'`).join(','));
        dst[i].setAttribute('font-size', px(c.fontSize)); dst[i].setAttribute('font-weight', c.fontWeight);
        for (const p of ['text-anchor', 'dominant-baseline']) { const v = c.getPropertyValue(p); if (v && v !== 'auto') dst[i].setAttribute(p, v); }
      } });
    const ids = new Set([...new XMLSerializer().serializeToString(clone).matchAll(/url\((?:&quot;|["'])?#([\w-]+)|href="#([\w-]+)"/g)].map(m => m[1] || m[2]));
    const defs = document.createElementNS(NS, 'defs');
    for (const id of ids) { const d = document.getElementById(id); if (d && !clone.querySelector('#' + CSS.escape(id))) defs.append(d.cloneNode(true)); }
    if (defs.childNodes.length) clone.prepend(defs);
    return new XMLSerializer().serializeToString(clone);
  }

  // Text of one block: its own text nodes plus inline descendants (nested blocks are measured on their own).
  // Each character's rendered line is read from the layout, so line breaks follow the browser exactly.
  function blockText(block, bcs) {
    const paras = [[]], rects = []; let space = true, lastMid = null, lastH = 0;
    const style = cs => ({ color: hex(rgba(cs.color)), bold: Number(cs.fontWeight) >= 600, italic: cs.fontStyle === 'italic', size: px(cs.fontSize), font: latinFont(cs) });
    const push = (t, st) => {
      const para = paras.at(-1), prev = para.at(-1);
      if (prev && ['color', 'bold', 'italic', 'size', 'font'].every(k => prev[k] === st[k])) prev.text += t; else para.push({ text: t, ...st });
    };
    const gap = (cs, side) => { const g = px(cs.getPropertyValue(`margin-${side}`)) + px(cs.getPropertyValue(`padding-${side}`)); return g >= 0.6 * px(cs.fontSize) ? '　' : g > 0.5 ? ' ' : ''; };
    (function walk(node) {
      for (const n of node.childNodes) {
        if (n.nodeType === 3) {
          const cs = getComputedStyle(n.parentElement), st = style(cs), pre = /pre/.test(cs.whiteSpace), upper = cs.textTransform === 'uppercase';
          const range = document.createRange();
          for (let i = 0; i < n.data.length; i++) {
            let ch = n.data[i];
            if (!pre && /\s/.test(ch)) { if (!space) { push(' ', st); space = true; } continue; }
            range.setStart(n, i); range.setEnd(n, i + 1);
            const r = range.getClientRects()[0]; if (!r || !r.width) continue;
            const mid = r.top + r.height / 2;
            if (lastMid !== null && Math.abs(mid - lastMid) > Math.max(r.height, lastH) / 2) {   // browser started a new line
              const last = paras.at(-1).at(-1); if (last) last.text = last.text.replace(/ +$/, '');
              push('\n', st);
            }
            lastMid = mid; lastH = r.height; rects.push(r); space = false;
            push(upper ? ch.toUpperCase() : ch, st);
          }
        } else if (n.nodeType === 1) {
          if (n.tagName === 'BR') { paras.push([]); space = true; lastMid = null; continue; }
          const cs = getComputedStyle(n);
          if (cs.display === 'none' || cs.visibility === 'hidden' || n instanceof SVGElement || !isInline(cs)) continue;
          const before = gap(cs, 'left'); if (before && !space) push(before, style(cs));
          walk(n);
          const after = gap(cs, 'right'); if (after) { push(after, style(cs)); space = after === ' '; }
        }
      }
    })(block);
    for (const p of paras) { const last = p.at(-1); if (last) last.text = last.text.replace(/[ 　]+$/, ''); if (!last?.text) p.pop(); }
    return { paras: paras.filter(p => p.length), rects };
  }

  const out = [];
  const decks = lang ? document.querySelectorAll(`.deck[lang="${lang}"]`) : document.querySelectorAll('.deck');
  let rasterId = 0;
  for (const deck of decks) for (const slide of deck.querySelectorAll('.slide')) {
    const S = slide.getBoundingClientRect(); const items = [];
    // CSS painting order (simplified): z-index of the outermost stacking context under the slide, then
    // positioned before in-flow, then document order. Without it, a later sibling's connector line
    // would be drawn over an earlier sibling's z-index:1 marker.
    let current = null;
    const stackKey = el => {
      let z = 0, positioned = 0;
      for (let a = el; a && a !== slide; a = a.parentElement) {
        const c = getComputedStyle(a);
        if (c.position !== 'static') { positioned = 1; if (c.zIndex !== 'auto') z = Number(c.zIndex); }
      }
      return [z, positioned];
    };
    const realPush = items.push.bind(items);
    // the slide is the stacking context root: its own background is always the bottom layer,
    // even under children with negative z-index (e.g. .photo-wash)
    items.push = it => realPush({ ...it, stack: current === slide ? [-1e9, 0, items.length] : [...stackKey(current), items.length] });
    const rel = r => ({ left: r.left - S.left, top: r.top - S.top, width: r.width, height: r.height });
    const visible = r => r.width > 0.5 && r.height > 0.5 && r.right > S.left && r.left < S.right && r.bottom > S.top && r.top < S.bottom;

    function paint(el, cs) {
      const r = el.getBoundingClientRect(); if (!visible(r)) return;
      const box = rel(r);
      // gradients and clipped shapes have no faithful native form: keep the element's own painting as an image
      // clip-path also clips every descendant, so a clipped element is painted together with its subtree
      const clipped = cs.clipPath && cs.clipPath !== 'none';
      if (clipped || (cs.backgroundImage && cs.backgroundImage !== 'none')) {
        el.dataset.h2pRaster = ++rasterId;
        items.push({ kind: 'raster', id: rasterId, subtree: Boolean(clipped), box, abs: { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height }, cls: label(el) });
        return clipped ? 'subtree' : 'self';
      }
      const bg = rgba(cs.backgroundColor), fill = bg && bg.a > 0.001 ? hex(bg) : null;
      const sides = ['top', 'right', 'bottom', 'left'].map(s => ({ s, w: px(cs.getPropertyValue(`border-${s}-width`)), c: rgba(cs.getPropertyValue(`border-${s}-color`)), style: cs.getPropertyValue(`border-${s}-style`) }))
        .map(b => ({ ...b, w: b.style === 'none' || !b.c || b.c.a < 0.001 ? 0 : b.w }));
      const uniform = sides.every(b => b.w === sides[0].w && b.w > 0 && hex(b.c) === hex(sides[0].c) && b.style === sides[0].style);
      const shadows = shadowParts(cs.boxShadow);
      const ring = shadows.find(s => !s.blur && !s.x && !s.y && s.spread > 0 && s.color && s.color.a > 0.001);
      const soft = shadows.find(s => !s.inset && (s.blur > 0 || s.x || s.y));
      const rad = cs.borderTopLeftRadius, radius = rad.endsWith('%') ? Math.min(box.width, box.height) * px(rad) / 100 : px(rad);
      const geometry = radius >= Math.min(box.width, box.height) / 2 - 0.5 && Math.abs(box.width - box.height) < 1 ? 'ellipse' : radius > 0.5 ? 'roundRect' : 'rect';
      let line = null, shapeBox = box;
      if (uniform) { const w = sides[0].w; line = { width: w, color: hex(sides[0].c), dash: /dash|dot/.test(sides[0].style) }; shapeBox = { left: box.left + w / 2, top: box.top + w / 2, width: box.width - w, height: box.height - w }; }
      else if (ring) { const w = ring.spread, d = ring.inset ? w / 2 : -w / 2; line = { width: w, color: hex(ring.color) }; shapeBox = { left: box.left + d, top: box.top + d, width: box.width - 2 * d, height: box.height - 2 * d }; }
      if (fill || line) items.push({ kind: 'shape', geometry, box: shapeBox, radius, fill, line, shadow: soft ? { x: soft.x, y: soft.y, blur: soft.blur, color: soft.color ? hex(soft.color) : '#000000/10' } : null, cls: label(el) });
      if (!uniform) for (const b of sides) if (b.w > 0) {
        const t = { top: [box.left, box.top, box.width, b.w], bottom: [box.left, box.top + box.height - b.w, box.width, b.w], left: [box.left, box.top, b.w, box.height], right: [box.left + box.width - b.w, box.top, b.w, box.height] }[b.s];
        if (/dash|dot/.test(b.style)) items.push({ kind: 'line', from: b.s === 'top' || b.s === 'bottom' ? [t[0], t[1] + b.w / 2, t[0] + t[2], t[1] + b.w / 2] : [t[0] + b.w / 2, t[1], t[0] + b.w / 2, t[1] + t[3]], width: b.w, color: hex(b.c), dash: true, cls: label(el) });
        else items.push({ kind: 'shape', geometry: 'rect', box: { left: t[0], top: t[1], width: t[2], height: t[3] }, fill: hex(b.c), line: null, radius: 0, cls: label(el) + '-' + b.s });
      }
    }

    function text(el, cs) {
      const { paras, rects } = blockText(el, cs); if (!rects.length || !paras.length) return;
      const lines = []; for (const r of [...rects].sort((a, b) => a.top - b.top)) { const mid = r.top + r.height / 2, l = lines.find(l => Math.abs(l.mid - mid) < Math.max(l.h, r.height) / 2); if (l) { l.left = Math.min(l.left, r.left); l.right = Math.max(l.right, r.right); l.h = Math.max(l.h, r.height); } else lines.push({ mid, h: r.height, left: r.left, right: r.right }); }
      const fs = px(cs.fontSize); let lh = px(cs.lineHeight);
      if (!lh) lh = lines.length > 1 ? (lines.at(-1).mid - lines[0].mid) / (lines.length - 1) : lines[0].h * 1.2;
      const er = el.getBoundingClientRect(), pad = k => px(cs.getPropertyValue(`padding-${k}`)) + px(cs.getPropertyValue(`border-${k}-width`));
      const content = { left: er.left + pad('left'), right: er.right - pad('right') };
      const textLeft = Math.min(...lines.map(l => l.left)), textRight = Math.max(...lines.map(l => l.right));
      const align = { start: 'left', left: 'left', center: 'center', right: 'right', end: 'right', justify: 'left' }[cs.textAlign] || 'left';
      // left-aligned text starts where its first glyph is (an inline-block before it, e.g. an avatar, is drawn on its own)
      let left = align === 'left' ? textLeft : Math.min(content.left, textLeft), right = align === 'right' ? textRight : Math.max(content.right, textRight);
      // centred text whose axis is not the element's centre (an icon beside it in a flex row, e.g. a role chip):
      // centre the box on the text's own axis, or PowerPoint centres it across the icon too
      const axis = (textLeft + textRight) / 2;
      if (align === 'center' && Math.abs(axis - (left + right) / 2) > 2) { const half = Math.min(axis - left, right - axis); left = axis - half; right = axis + half; }
      items.push({ kind: 'text', box: rel({ left, top: lines[0].mid - lh / 2, width: right - left, height: lh * lines.length }),
        textBox: rel({ left: textLeft, top: 0, width: textRight - textLeft, height: 0 }),
        lines: lines.length, lineHeight: lh, fontSize: fs, align, paras, cls: label(el) });
    }

    (function visit(el, inClip = false) {
      current = el;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return;
      if (el instanceof SVGSVGElement) { const r = el.getBoundingClientRect(); if (visible(r) && !inClip) items.push({ kind: 'svg', box: rel(r), svg: svgMarkup(el), cls: label(el.parentElement) }); return; }
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth) {
        const c = document.createElement('canvas'); c.width = el.naturalWidth; c.height = el.naturalHeight; c.getContext('2d').drawImage(el, 0, 0);
        items.push({ kind: 'image', box: rel(el.getBoundingClientRect()), dataUrl: c.toDataURL('image/png'), alt: el.alt || '' }); return;
      }
      let clip = inClip;
      if (!isInline(cs)) { if (!inClip && paint(el, cs) === 'subtree') clip = true; text(el, cs); }
      for (const c of el.children) visit(c, clip);
    })(slide);
    const cmp = (a, b) => a.stack[0] - b.stack[0] || a.stack[1] - b.stack[1] || a.stack[2] - b.stack[2];
    out.push({ layout: slide.dataset.layout || '', lang: deck.lang, width: S.width, height: S.height, items: [...items].sort(cmp).map(({ stack, ...it }) => it) });
  }
  return out;
}

// Paint one element's own background (no text, no children, nothing behind it) into a transparent PNG.
// subtree: also paint descendants' backgrounds and borders (text stays transparent; it is drawn as text boxes).
async function rasterize(page, item) {
  await page.evaluate(({ id, subtree }) => {
    const el = document.querySelector(`[data-h2p-raster="${id}"]`), sel = `[data-h2p-raster="${id}"]`;
    const st = document.createElement('style'); st.id = 'h2p-iso';
    st.textContent = `html,body{background:transparent!important} .slide *{visibility:hidden!important}
      .h2p-anc{background:transparent!important;box-shadow:none!important;border-color:transparent!important}
      ${sel}{visibility:visible!important;color:transparent!important}
      ${subtree ? `${sel} *{visibility:visible!important;color:transparent!important;text-shadow:none!important}` : `${sel} *{visibility:hidden!important}`}`;
    document.head.append(st);
    for (let a = el.parentElement; a; a = a.parentElement) a.classList.add('h2p-anc');
  }, { id: item.id, subtree: item.subtree });
  const png = await page.screenshot({ clip: item.abs, fullPage: true, omitBackground: true, scale: 'css' });
  await page.evaluate(() => { document.getElementById('h2p-iso')?.remove(); document.querySelectorAll('.h2p-anc').forEach(a => a.classList.remove('h2p-anc')); });
  return png;
}

// ---------------------------------------------------------------- PPTX drawing
export async function loadArtifactTool() {
  return import(path.join(runtime, '@oai/artifact-tool/dist/artifact_tool.mjs'));
}

export function drawSlide(slide, scene, { scale }) {
  const k = v => v * scale, pos = b => ({ left: k(b.left), top: k(b.top), width: Math.max(k(b.width), 0.5), height: Math.max(k(b.height), 0.5) });
  for (const it of scene.items) {
    if (it.kind === 'raster') {
      slide.images.add({ blob: it.png, contentType: 'image/png', alt: '', position: pos(it.box) }).name = `css:${it.cls}`;
    } else if (it.kind === 'shape') {
      const shape = slide.shapes.add({
        geometry: it.geometry, position: pos(it.box), fill: it.fill || 'none',
        line: it.line ? { style: it.line.dash ? 'dash' : 'solid', fill: it.line.color, width: Math.max(k(it.line.width), 0.5) } : { style: 'solid', fill: 'none', width: 0 },
        ...(it.geometry === 'roundRect' ? { borderRadius: k(it.radius) } : {}),
        ...(it.shadow ? { shadow: `${Math.round(k(it.shadow.x))}px ${Math.round(k(it.shadow.y))}px ${Math.round(k(it.shadow.blur))}px ${it.shadow.color}` } : {}),
      });
      shape.name = `css:${it.cls}`;
    } else if (it.kind === 'line') {
      const [x1, y1, x2, y2] = it.from.map(k);
      slide.shapes.add({ geometry: 'line', position: { left: Math.min(x1, x2), top: Math.min(y1, y2), width: Math.max(Math.abs(x2 - x1), 0.01), height: Math.max(Math.abs(y2 - y1), 0.01) }, fill: 'none', line: { style: 'dash', fill: it.color, width: Math.max(k(it.width), 0.5) } }).name = `css:${it.cls}`;
    } else if (it.kind === 'svg') {
      slide.images.add({ svg: it.svg, alt: 'icon', position: pos(it.box) }).name = `icon:${it.cls}`;
    } else if (it.kind === 'image') {
      slide.images.add({ dataUrl: it.dataUrl, alt: it.alt, fit: 'cover', position: pos(it.box) });
    } else if (it.kind === 'text') {
      const single = it.lines === 1, b = it.box;
      // slack grows only into room left on the slide (a no-wrap box narrower than its text just overflows it)
      const room = { left: Math.max(0, b.left), right: Math.max(0, scene.width - b.left - b.width) };
      const wanted = (single ? Math.max(b.width, it.textBox.width * LINE_SLACK) : b.width * WRAP_SLACK) - b.width;
      const extra = Math.max(0, Math.min(wanted, it.align === 'center' ? 2 * Math.min(room.left, room.right) : it.align === 'right' ? room.left : room.right));
      const width = b.width + extra;
      const left = it.align === 'center' ? b.left - extra / 2 : it.align === 'right' ? b.left - extra : b.left;
      const box = slide.shapes.add({ geometry: 'textbox', position: pos({ left, top: b.top, width, height: b.height }) });
      box.name = `text:${it.cls}`;
      // Order matters: assigning text replaces the paragraphs, so the paragraph-level style (alignment,
      // exact line height) is applied after it. Run-level style (font, size, colour, weight) is carried
      // by each run and is not part of this style, so it survives.
      box.text = it.paras.map(p => ({ runs: p.map(r => ({ run: r.text, style: { bold: r.bold, italic: r.italic, fontSize: `${k(r.size)}px`, typeface: r.font, color: r.color } })) }));
      box.text.style = { alignment: it.align, verticalAlignment: 'top', autoFit: 'none', wrap: single ? 'none' : 'square', insets: 0, lineSpacing: k(it.lineHeight) / 100 };
    }
  }
}

// notes:   optional speaker notes per slide (array of strings, same order as the slides)
// renders: also return a PNG of every PPTX slide (artifact-tool renderer), e.g. as QA evidence
export async function htmlToPptx(file, { lang = null, compare = null, notes = null, renders = false, fonts = { heading: 'Manrope', body: 'Inter', eastAsian: 'Noto Sans TC' } } = {}) {
  const { browser, page, errors } = await openPage(file, { width: 2016, height: 1200 });
  try {
    if (compare) await shootHtml(page, compare, lang);  // before measure() mutates the page
    const scenes = await page.evaluate(measure, { lang });
    if (errors.length) throw new Error('page errors: ' + errors.join(' | '));
    if (!scenes.length) throw new Error(`no .deck${lang ? `[lang="${lang}"]` : ''} .slide found in ${file}`);
    for (const scene of scenes) for (const it of scene.items) if (it.kind === 'raster') it.png = await rasterize(page, it);
    const { Presentation, PresentationFile } = await loadArtifactTool();
    const pres = Presentation.create({ slideSize: PPTX_SIZE });
    pres.theme.defaultFont = fonts.body;
    scenes.forEach((scene, i) => {
      const slide = pres.slides.add();
      drawSlide(slide, scene, { scale: PPTX_SIZE.width / scene.width });
      if (notes?.[i]) slide.speakerNotes.text = String(notes[i]);
    });
    const exported = Buffer.from((await PresentationFile.exportPptx(pres)).data);
    const pptx = await postProcess(exported, { fonts, exactLines: true });
    if (compare) await writeComparison(browser, pptx, scenes, compare, { PresentationFile });
    const pngs = renders ? await renderSlides(pptx, PresentationFile) : null;
    return { pptx, scenes, pngs };
  } finally { await browser.close(); }
}

async function renderSlides(pptx, PresentationFile) {
  const reread = await PresentationFile.importPptx(pptx), out = [];
  for (const slide of reread.slides.items ?? [...reread.slides]) out.push(Buffer.from(await (await reread.export({ slide, format: 'png', scale: 1 })).arrayBuffer()));
  return out;
}

async function shootHtml(page, dir, lang) {
  fs.mkdirSync(dir, { recursive: true });
  const slides = await page.$$(lang ? `.deck[lang="${lang}"] .slide` : '.deck .slide');
  for (let i = 0; i < slides.length; i++) await slides[i].screenshot({ path: path.join(dir, `html-${String(i + 1).padStart(2, '0')}.png`), scale: 'css' });
}

async function writeComparison(browser, pptx, scenes, dir, { PresentationFile }) {
  const reread = await PresentationFile.importPptx(pptx);
  const slides = reread.slides.items ?? [...reread.slides];
  for (let i = 0; i < scenes.length; i++) {
    const png = await reread.export({ slide: slides[i], format: 'png', scale: 1.5 });
    fs.writeFileSync(path.join(dir, `pptx-${String(i + 1).padStart(2, '0')}.png`), Buffer.from(await png.arrayBuffer()));
  }
  const cmp = await browser.newPage();
  await cmp.setViewportSize({ width: 1940, height: 560 });
  for (let i = 0; i < scenes.length; i++) {
    const n = String(i + 1).padStart(2, '0'), url = f => 'data:image/png;base64,' + fs.readFileSync(path.join(dir, f)).toString('base64');
    await cmp.setContent(`<body style="margin:0;display:flex;gap:20px;background:#888;font:16px sans-serif"><figure style="margin:0"><img src="${url(`html-${n}.png`)}" width="960"><figcaption>HTML ${scenes[i].layout}</figcaption></figure><figure style="margin:0"><img src="${url(`pptx-${n}.png`)}" width="960"><figcaption>PPTX</figcaption></figure></body>`, { waitUntil: 'load' });
    await cmp.screenshot({ path: path.join(dir, `compare-${n}.png`) });
  }
}

// ---------------------------------------------------------------- CLI
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const args = process.argv.slice(2), opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
  const file = args.find((a, i) => !a.startsWith('--') && !['--out', '--lang', '--compare'].includes(args[i - 1]));
  if (!file || !opt('--out')) { console.error('usage: html-to-pptx.mjs <deck.html> --out deck.pptx [--lang zh-Hant|en] [--compare dir]'); process.exit(2); }
  const { pptx, scenes } = await htmlToPptx(file, { lang: opt('--lang'), compare: opt('--compare') });
  fs.writeFileSync(opt('--out'), pptx);
  const count = k => scenes.reduce((n, s) => n + s.items.filter(i => i.kind === k).length, 0);
  console.log(`${opt('--out')}: ${scenes.length} slides · ${count('shape')} shapes · ${count('line')} dashed lines · ${count('text')} text boxes · ${count('svg')} icons · ${count('raster')} painted backgrounds`);
}
