// Post-export fixes for PPTX packages written by the Codex artifact-tool.
//   1. Fonts: artifact-tool writes one typeface into <a:latin>, <a:ea> and <a:cs>, and masters point
//      CJK text at the Latin theme font (+mj-lt). Give East Asian text its own font.
//   2. Line spacing: artifact-tool only takes a multiple, which PowerPoint applies to the font's own
//      line height, not to the font size as CSS does. html-to-pptx encodes the exact CSS line height
//      in px as lineSpacing = px / 100; this pass turns every such value into exact points (spcPts).
// Same font logic as presentation-studio app/presentation-workbench/src/lib/pptx-fonts.js.
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const runtime = process.env.WORKBENCH_RUNTIME_MODULES
  || path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
export const loadJSZip = () => createRequire(import.meta.url)(path.join(runtime, 'jszip'));

const attr = v => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const THEME_REF = { '+mj-lt': '+mj-ea', '+mn-lt': '+mn-ea', '+mj-ea': '+mj-ea', '+mn-ea': '+mn-ea' };

function fontBlock(xml, tag, latin, eastAsian) {
  return xml.replace(new RegExp(`<a:${tag}>([\\s\\S]*?)</a:${tag}>`), (whole, inner) => {
    let out = latin ? inner.replace(/<a:latin\b[^>]*?\/>/, `<a:latin typeface="${attr(latin)}"/>`) : inner;
    out = /<a:ea\b/.test(out)
      ? out.replace(/<a:ea\b[^>]*?\/>/, `<a:ea typeface="${attr(eastAsian)}"/>`)
      : out.replace(/(<a:latin\b[^>]*?\/>)/, `$1<a:ea typeface="${attr(eastAsian)}"/>`);
    return `<a:${tag}>${out}</a:${tag}>`;
  });
}
export const rewriteThemeFonts = (xml, { heading, body, eastAsian }) => fontBlock(fontBlock(xml, 'majorFont', heading, eastAsian), 'minorFont', body, eastAsian);
export const rewriteRunFonts = (xml, { eastAsian }) => xml.replace(/<a:ea\b([^>]*?)\/>/g, (w, a) => {
  const cur = (a.match(/typeface="([^"]*)"/) || [])[1] ?? '';
  return `<a:ea typeface="${attr(cur.startsWith('+') ? THEME_REF[cur] ?? cur : eastAsian)}"/>`;
});
// lineSpacing = px/100 was written as spcPct val = px*1000; exact points in 1/100 pt = px * 0.75 * 100.
export const exactLineSpacing = xml => xml.replace(/<a:lnSpc>\s*<a:spcPct val="(\d+)"\s*\/>\s*<\/a:lnSpc>/g,
  (w, v) => `<a:lnSpc><a:spcPts val="${Math.round(Number(v) * 0.075)}"/></a:lnSpc>`);

const THEME = /^ppt\/theme\/theme\d+\.xml$/;
const TEXT_PARTS = /^ppt\/(slides|slideLayouts|slideMasters|notesSlides|notesMasters)\/[^/]+\.xml$/;
const SLIDES = /^ppt\/slides\/[^/]+\.xml$/;

export async function postProcess(data, { fonts, exactLines = false, JSZip = loadJSZip() } = {}) {
  const zip = await JSZip.loadAsync(data);
  for (const name of Object.keys(zip.files)) {
    if (zip.files[name].dir) continue;
    const steps = [];
    if (fonts?.eastAsian && THEME.test(name)) steps.push(x => rewriteThemeFonts(x, fonts));
    if (fonts?.eastAsian && TEXT_PARTS.test(name)) steps.push(x => rewriteRunFonts(x, fonts));
    if (exactLines && SLIDES.test(name)) steps.push(exactLineSpacing);
    if (!steps.length) continue;
    const xml = await zip.file(name).async('string');
    const next = steps.reduce((x, f) => f(x), xml);
    if (next !== xml) zip.file(name, next);
  }
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}
