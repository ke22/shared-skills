// Pick a narrative layout and variant for one slide from layouts.json. Pure function, no I/O, so the
// workbench (presentation-studio) and any generator share one selection rule.
//
//   need = { layout?, family?, component?, relationship?, count?, data?: [], position?, occasion? }
//     layout       force a layout id (N38); still picks the best variant
//     family       family name or id from layouts.json families (證據 / F2)
//     component    workbench component id (assertion-evidence); generic-* components are ignored
//     relationship workbench relationship (evidence, sequence, …), used when there is no component
//     count        number of items on the slide (null for tables: rows are not items)
//     data         content kinds, same vocabulary as layouts.json selectVocabulary.data (number, quote, …)
//     position     opening / closing / section / every
//     occasion     conference / defense / project
//
// Returns { fit: true, key, layout, variant, family, why, score, reasons, alternatives }
//      or { fit: false, reason, fallback: 'N47', alternatives } — never a silent generic layout
//      (layouts.json fallbackPolicy.neverSilentlyGeneric).
const MAX_ITEMS = 6;  // a variant with no count limit still holds at most this many items
// a pick needs real evidence (a matching count, data kind or position), not just an implemented template
const MIN_SCORE = 1;
const AUTO_EXCLUDED = new Set(['N29', 'N47']);  // handed to another skill / the explicit no-fit fallback

export function resolveLayout(need, doc) {
  const want = { data: [], ...need };
  const fam = want.family ? doc.families.find(f => f.name === want.family || f.id === want.family) : null;
  if (want.family && !fam) return { fit: false, reason: `unknown family ${want.family}`, fallback: doc.fallbackPolicy.customFigureLayout, alternatives: [] };
  const component = want.component && !/^generic-/.test(want.component) ? want.component : null;
  let pool = doc.layouts;
  if (want.layout) pool = pool.filter(l => l.id === want.layout);
  else {
    pool = pool.filter(l => !AUTO_EXCLUDED.has(l.id));
    if (fam) pool = pool.filter(l => l.family.id === fam.id);
    if (component) pool = pool.filter(l => l.workbench.components.includes(component));
    else if (want.relationship) pool = pool.filter(l => l.workbench.relationships.includes(want.relationship));
  }
  const options = [];
  for (const l of pool) {
    const variants = l.variants.length ? l.variants : l.implemented.map(id => ({ id, name: l.name, select: { count: null, data: [], position: [], occasion: [] }, implemented: true }));
    for (const v of variants) {
      const s = v.select, reasons = []; let score = 0, reject = null;
      if (s.count && want.count != null) {
        const max = s.count.max ?? Math.max(MAX_ITEMS, s.count.min);  // "4+" still has a physical limit
        if (want.count < s.count.min || want.count > max) reject = `項數 ${want.count} 不在 ${s.count.min}–${max}`;
        else { score += 1; reasons.push(`項數 ${want.count} 符合`); }
      } else if (want.count > MAX_ITEMS) reject = `${want.count} 項超過 ${MAX_ITEMS} 項，要拆頁`;
      if (s.position.length) {
        if (!want.position || !s.position.includes(want.position)) reject ??= `只能放在 ${s.position.join('/')}`;
        else { score += 1; reasons.push(`位置 ${want.position}`); }
      }
      if (s.occasion.length) {
        if (want.occasion && !s.occasion.includes(want.occasion)) reject ??= `只適用 ${s.occasion.join('/')}`;
        else if (want.occasion) { score += 1; reasons.push(`場合 ${want.occasion}`); }
        else score -= 0.5;
      }
      const overlap = s.data.filter(d => want.data.includes(d));
      if (overlap.length) { score += 3 * overlap.length; reasons.push(`資料 ${overlap.join('、')}`); }
      else if (s.data.length && want.data.length) score -= 1;  // inferred data is rough: a mismatch lowers, does not exclude
      if (v.implemented) score += 0.5;
      options.push({ key: l.id + v.id, layout: l.id, variant: v.id, name: `${l.name}・${v.name}`, family: l.family.name, why: l.pickOver.why, score, reasons, reject, order: options.length });
    }
  }
  const ok = options.filter(o => !o.reject).sort((a, b) => b.score - a.score || a.order - b.order);
  const alternatives = ok.slice(1, 4).map(({ key, name, score }) => ({ key, name, score }));
  if (!ok.length || ok[0].score < MIN_SCORE) {
    const reason = !pool.length ? 'no layout accepts this component or relationship' : !ok.length ? `every candidate rejected: ${[...new Set(options.map(o => o.reject))].slice(0, 3).join('; ')}` : 'best candidate does not match the content';
    return { fit: false, reason, fallback: doc.fallbackPolicy.customFigureLayout, alternatives: ok.slice(0, 3).map(({ key, name, score }) => ({ key, name, score })) };
  }
  const { order, reject, ...best } = ok[0];
  return { fit: true, ...best, alternatives };
}
