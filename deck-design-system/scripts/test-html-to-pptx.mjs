#!/usr/bin/env node
// Checks for html-to-pptx.mjs on templates/iasdr-deck.html (both languages). Independent of the
// converter's own measurements where possible:
//   - post-processing rules (exact line spacing, East Asian fonts, theme refs)
//   - slide count matches the HTML
//   - no text lost: every visible character of each HTML slide (innerText, read before conversion)
//     appears in that PPTX slide's text or in its embedded SVG text
//   - fonts: runs use Manrope/Inter for Latin and Noto Sans TC for East Asian text
//   - every line spacing is exact points (no font-relative multiples left)
//   - every text box lies on the slide; the package re-imports in artifact-tool
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openPage } from './browser-lib.mjs';
import { htmlToPptx, loadArtifactTool, PPTX_SIZE } from './html-to-pptx.mjs';
import { exactLineSpacing, rewriteRunFonts, loadJSZip } from './pptx-post.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DECK = path.join(ROOT, 'templates/iasdr-deck.html');
const results = [];
const step = (name, ok, detail = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };

step('post: exact line spacing from encoded px', exactLineSpacing('<a:lnSpc><a:spcPct val="44800" /></a:lnSpc>') === '<a:lnSpc><a:spcPts val="3360"/></a:lnSpc>');
step('post: East Asian font set, theme refs kept on the East Asian slot',
  rewriteRunFonts('<a:ea typeface="Manrope"/><a:ea typeface="+mn-lt"/>', { eastAsian: 'Noto Sans TC' }) === '<a:ea typeface="Noto Sans TC"/><a:ea typeface="+mn-ea"/>');

const chars = s => [...s.replace(/\s+/g, '')];
const count = arr => arr.reduce((m, c) => m.set(c, (m.get(c) || 0) + 1), new Map());
const xmlText = xml => [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map(m => m[1]).join('').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');

const JSZip = loadJSZip();
const { PresentationFile } = await loadArtifactTool();
for (const lang of ['zh-Hant', 'en']) {
  const { browser, page } = await openPage(DECK);
  const expected = await page.evaluate(l => [...document.querySelectorAll(`.deck[lang="${l}"] .slide`)].map(s => s.innerText), lang);
  await browser.close();

  const { pptx } = await htmlToPptx(DECK, { lang });
  const zip = await JSZip.loadAsync(pptx);
  const slideFiles = Object.keys(zip.files).filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f)).sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
  step(`${lang}: slide count`, slideFiles.length === expected.length, `${slideFiles.length} PPTX / ${expected.length} HTML`);

  const media = {}; for (const f of Object.keys(zip.files).filter(f => f.endsWith('.svg'))) media[f] = await zip.file(f).async('string');
  const missing = [], fontsBad = new Set(), pct = [], outside = [];
  for (let i = 0; i < slideFiles.length; i++) {
    const xml = await zip.file(slideFiles[i]).async('string');
    const rels = await zip.file(slideFiles[i].replace('slides/', 'slides/_rels/') + '.rels')?.async('string') ?? '';
    const svgText = [...rels.matchAll(/Target="(?:\.\.|\/ppt)\/media\/([^"]+\.svg)"/g)].map(m => (media['ppt/media/' + m[1]] || '').replace(/<[^>]+>/g, '')).join('');
    const have = count(chars(xmlText(xml) + svgText).map(c => c.toUpperCase()));
    for (const [c, n] of count(chars(expected[i] || '').map(c => c.toUpperCase()))) if ((have.get(c) || 0) < n) missing.push(`slide ${i + 1} '${c}'×${n - (have.get(c) || 0)}`);
    for (const m of xml.matchAll(/<a:latin typeface="([^"]*)"/g)) if (!['Manrope', 'Inter'].includes(m[1])) fontsBad.add('latin:' + m[1]);
    for (const m of xml.matchAll(/<a:ea typeface="([^"]*)"/g)) if (m[1] !== 'Noto Sans TC') fontsBad.add('ea:' + m[1]);
    if (/<a:lnSpc>\s*<a:spcPct/.test(xml)) pct.push(i + 1);
    const emu = v => Number(v) / 9525;  // px at 96 dpi
    for (const m of xml.matchAll(/<p:sp>[\s\S]*?<\/p:sp>/g)) {
      if (!/txBox="1"/.test(m[0])) continue;
      const off = /<a:off x="(-?\d+)" y="(-?\d+)"/.exec(m[0]), ext = /<a:ext cx="(\d+)" cy="(\d+)"/.exec(m[0]); if (!off || !ext) continue;
      const [x, y, w, h] = [emu(off[1]), emu(off[2]), emu(ext[1]), emu(ext[2])];
      if (x < -1 || y < -1 || x + w > PPTX_SIZE.width + 1 || y + h > PPTX_SIZE.height + 1) outside.push(`slide ${i + 1} ${/name="([^"]*)"/.exec(m[0])?.[1]}`);
    }
  }
  step(`${lang}: no text lost`, missing.length === 0, missing.slice(0, 6).join(', ') || `${expected.join('').replace(/\s+/g, '').length} characters`);
  step(`${lang}: fonts are Manrope/Inter + Noto Sans TC`, fontsBad.size === 0, [...fontsBad].join(', '));
  step(`${lang}: all line spacing is exact`, pct.length === 0, pct.length ? `font-relative spacing on slides ${pct.join(', ')}` : '');
  step(`${lang}: text boxes stay on the slide`, outside.length === 0, outside.slice(0, 4).join(', '));
  let reimport = true; try { await PresentationFile.importPptx(pptx); } catch { reimport = false; }
  step(`${lang}: package re-imports`, reimport);
}
process.exit(results.every(Boolean) ? 0 : 1);
