#!/usr/bin/env node
// Build layouts.json: the machine-readable narrative layout library. The generator (AI) uses it to
// pick a narrative layout first and a variant second; the workbench uses it to map layouts onto its
// component registry. Derived from:
//   references/narrative-layouts.md                      -> ids, questions, variants + selection conditions, components, spines
//   manifest.json                                        -> which variants are implemented, actual component composition
//   presentation-studio .../semantic-layout.js (if found) -> relationships each workbench component accepts
// Usage: node scripts/build-layouts.mjs [--check]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const WORKSPACE = path.resolve(ROOT, '..', '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const md = read('references/narrative-layouts.md');
const manifest = JSON.parse(read('manifest.json'));
const registryFile = path.join(WORKSPACE, 'presentation-studio/app/presentation-workbench/src/lib/semantic-layout.js');

// workbench registry: component id -> relationships
const registry = {};
let registrySource = null;
if (fs.existsSync(registryFile)) {
  const src = fs.readFileSync(registryFile, 'utf8');
  const strings = t => [...t.matchAll(/'([\w-]+)'/g)].map(m => m[1]);  // JS arrays may have trailing commas
  const all = strings((src.match(/const RELATIONSHIPS = Object\.freeze\((\[[\s\S]*?\])\)/) || [])[1] || '');
  for (const m of src.matchAll(/entry\('([\w-]+)',\s*(RELATIONSHIPS|\[[^\]]*\])/g)) registry[m[1]] = m[2] === 'RELATIONSHIPS' ? all : strings(m[2]);
  registrySource = path.relative(WORKSPACE, registryFile);
}

const cells = line => line.replace(/^\|/, '').replace(/\|\s*$/, '').split(' | ').map(c => c.trim());
const parseVariants = cell => cell.split('<br>').map(v => {
  const m = v.match(/\*\*([a-d]) ([^*]+)\*\*[：:]?\s*(.*)$/); if (!m) return null;
  let rest = m[3].trim(); const src = rest.match(/（([^（）]*)）\s*$/);
  const sources = src ? src[1].split(/[、,]\s*/).map(s => s.trim()).filter(Boolean) : [];
  if (src) rest = rest.slice(0, src.index).replace(/[：:，,\s]+$/, '');
  return { id: m[1], name: m[2].trim(), when: rest, sources };
}).filter(Boolean);

const layouts = []; let section = null;
for (const line of md.split('\n')) {
  const h = line.match(/^## ([0A-H])\. (.+)$/); if (h) { section = { id: h[1], name: h[2].trim() }; continue; }
  if (!/^\| N\d\d \|/.test(line) || !section) continue;
  const c = cells(line);
  if (section.id === 'H') {
    const [id, name, question, chain, wb, status, priority] = c;
    layouts.push({ id, name, section, question, chain, variants: [], components: [], workbench: { components: [], basis: wb, relationships: [] }, sources: ['WB'], docStatus: status, priority });
    continue;
  }
  const [id, name, question, variantCell, compCell, wb, sourceCell, status, priority] = c;
  const wbComponents = [...wb.matchAll(/`([\w-]+)`/g)].map(m => m[1]);
  layouts.push({
    id, name, section, question, variants: parseVariants(variantCell),
    components: [...new Set(compCell.match(/C\d\d/g) || [])],
    workbench: { components: wbComponents, relationships: [...new Set(wbComponents.flatMap(w => registry[w] || []))].sort(), note: wb.startsWith('—') ? wb : undefined },
    sources: sourceCell.split(/[、,]\s*/).map(s => s.trim()).filter(Boolean), docStatus: status, priority,
  });
}

// implementation facts from the manifest (rendered gallery)
for (const l of layouts) {
  const built = Object.keys(manifest.layouts).filter(k => k.startsWith(l.id) && /^N\d\d[a-d]$/.test(k));
  l.implemented = built.map(k => k.slice(3)).sort();
  for (const v of l.variants) { v.implemented = l.implemented.includes(v.id); if (v.implemented) v.renderedComponents = manifest.layouts[l.id + v.id].components; }
  if (!l.variants.length && built.length) l.renderedComponents = manifest.layouts[built[0]].components;
}

// ---- derived content written back into narrative-layouts.md (Markdown stays the authored source;
// everything that can be computed is generated, so the doc cannot drift from the gallery) ----
const derive = l => {
  if (/轉交/.test(l.docStatus)) return '轉交';
  const n = l.variants.length, done = l.variants.filter(v => v.implemented).map(v => v.id);
  if (!n) return l.implemented.length ? '有' : '待做';
  return done.length === n ? '有' : done.length ? `部分（${done.join('、')} 有）` : '待做';
};
for (const l of layouts) l.docStatus = derive(l);
let mdOut = md.split('\n').map(line => {
  if (!/^\| N\d\d \|/.test(line)) return line;
  const c = cells(line), l = layouts.find(x => x.id === c[0]); if (!l) return line;
  c[l.section.id === 'H' ? 5 : 7] = l.docStatus;
  return '| ' + c.join(' | ') + ' |';
}).join('\n');
const GEN = '<!-- 由 scripts/build-layouts.mjs 產生，不要手改；改版型表或範本後重跑 -->';
const statusOf = l => l.docStatus.replace(/（.*$/, '');
const idsBy = k => layouts.filter(l => statusOf(l) === k).map(l => l.id);
const variantsAll = layouts.flatMap(l => l.variants.map(v => ({ ...v, key: l.id + v.id })));
const codes = [...md.matchAll(/^\| (\w{2}) \| /gm)].map(m => m[1]).filter(c => !['代號'].includes(c));
const bySource = codes.map(c => [c, variantsAll.filter(v => v.sources.some(s => s.startsWith(c + ' ') || s === c)).length]).filter(([, n]) => n);
const prio = ['P1', 'P2', 'P3'].map(p => `${p} ${layouts.filter(l => l.priority === p).length} 個`).join('、');
const noWB = layouts.filter(l => !l.workbench.components.length && l.section.id !== 'H' && statusOf(l) !== '轉交').map(l => `${l.id} ${l.name}`);
const statsBlock = `## 統計\n\n${GEN}\n\n- **版型 ${layouts.length} 個**。\n  - 現況：有 ${idsBy('有').length}、部分 ${idsBy('部分').length}、待做 ${idsBy('待做').length}${idsBy('待做').length ? `（${idsBy('待做').join('、')}）` : ''}、轉交 ${idsBy('轉交').length}${idsBy('轉交').length ? `（${idsBy('轉交').join('、')}）` : ''}。\n  - 優先：${prio}。\n- **變體 ${variantsAll.length} 個**，已實作 ${variantsAll.filter(v => v.implemented).length} 個。依來源（一個變體可引用多個來源）：${bySource.map(([c, n]) => `${c} ${n}`).join('、')}。\n- **工作台沒有對應元件的版型**：${noWB.join('、') || '無'}。要讓工作台自動選到，需要補進它的元件註冊表。\n\n`;
const noVariant = layouts.filter(l => !l.variants.length && l.implemented.length).map(l => l.id + l.implemented.join(''));
const progressBlock = `## 實作進度\n\n${GEN}\n\n範本：\`templates/iasdr-layouts.html\`（共用樣式 \`templates/iasdr.css\`、icon \`templates/icons.js\`）。每頁都通過 \`scripts/lint-deck.mjs\` 的全部規則；機器可讀的版型清單見 \`../layouts.json\`。\n\n- **已實作的變體（${variantsAll.filter(v => v.implemented).length} 個）**：${variantsAll.filter(v => v.implemented).map(v => v.key).join('、')}。\n${noVariant.length ? `- **沒有變體編號、已實作的版型**：${noVariant.join('、')}。\n` : ''}- **尚未實作的變體（${variantsAll.filter(v => !v.implemented).length} 個）**：${variantsAll.filter(v => !v.implemented).map(v => v.key).join('、')}。\n${idsBy('轉交').map(id => `- ${id} ${layouts.find(l => l.id === id).name}：轉交其他 skill（見版型表）。`).join('\n')}\n`;
const replaceSection = (text, heading, block) => {
  const i = text.search(new RegExp(`\\n${heading}[^\\n]*\\n`)); if (i < 0) throw new Error(`${heading} not found in narrative-layouts.md`);
  const j = text.indexOf('\n## ', i + heading.length + 1);
  return text.slice(0, i + 1) + block + (j < 0 ? '' : text.slice(j + 1));
};
mdOut = replaceSection(mdOut, '## 統計', statsBlock);
mdOut = replaceSection(mdOut, '## 實作進度', progressBlock).replace(/\n*$/, '\n');

// deck spines
const spineRows = md.split('\n').filter(x => /^\| [^|]+ \| [^|]+ \| N\d\d/.test(x));
const spines = spineRows.map(r => { const [type, spine, order] = cells(r);
  const steps = []; for (const m of order.matchAll(/(（)?(N\d\d)([a-d])?(?:\/(N\d\d)([a-d])?)?(）)?/g)) steps.push({ layout: m[2], variant: m[3] || null, alternative: m[4] ? m[4] + (m[5] || '') : null, optional: Boolean(m[1] && m[6]) });
  return { type, spine, steps }; });

const out = {
  schema: 'deck-design-system/layouts@1', theme: 'iasdr',
  note: 'GENERATED by scripts/build-layouts.mjs — do not edit. Pick a layout by the question it answers, then a variant by its "when" condition.',
  selection: [
    'Choose the layout whose question matches what the audience must understand on this slide.',
    'Within it, choose the variant whose "when" condition fits the content (count, data type, density, position).',
    'If no layout fits without distorting the content, say so (no-fit + reason) and use N47 custom figure; do not squeeze the content into N38/N39.',
    'A custom figure kind that appears in 3 decks becomes a proposal for a new component (lint R24 counts kinds).',
  ],
  fallbackPolicy: { noFit: 'report', customFigureLayout: 'N47', promoteAfterDecks: 3, neverSilentlyGeneric: true },
  relationshipsSource: registrySource,
  sources: { 'references/narrative-layouts.md': crypto.createHash('sha256').update(mdOut).digest('hex').slice(0, 16), 'manifest.json': crypto.createHash('sha256').update(read('manifest.json')).digest('hex').slice(0, 16) },
  layouts, spines,
  summary: {
    layouts: layouts.length, variants: layouts.reduce((n, l) => n + l.variants.length, 0),
    implementedVariants: layouts.reduce((n, l) => n + l.variants.filter(v => v.implemented).length, 0),
    layoutsWithAnyImplementation: layouts.filter(l => l.implemented.length).length,
    noWorkbenchComponent: layouts.filter(l => !l.workbench.components.length && l.section.id !== 'H').map(l => l.id),
  },
};
const text = JSON.stringify(out, null, 2) + '\n';
const target = path.join(ROOT, 'layouts.json');
if (process.argv.includes('--check')) {
  const ok = fs.existsSync(target) && fs.readFileSync(target, 'utf8') === text && mdOut === md;
  console.log(ok ? 'OK    layouts.json and the generated parts of narrative-layouts.md are up to date' : 'FAIL  layouts.json or narrative-layouts.md is stale (run node scripts/build-layouts.mjs)'); process.exit(ok ? 0 : 1);
}
fs.writeFileSync(target, text);
if (mdOut !== md) fs.writeFileSync(path.join(ROOT, 'references/narrative-layouts.md'), mdOut);
const s = out.summary;
console.log(`layouts.json: ${s.layouts} layouts · ${s.variants} variants (${s.implementedVariants} implemented) · ${spines.length} spines · relationships from ${registrySource || 'NOT FOUND'} · no workbench component: ${s.noWorkbenchComponent.join(', ')}`);
