// node --test tests/resolve-layout.test.mjs — the selection rule against the real layouts.json
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { resolveLayout } from '../scripts/resolve-layout.mjs';

const doc = JSON.parse(fs.readFileSync(new URL('../layouts.json', import.meta.url), 'utf8'));

test('claim with literature support -> N38a', () => {
  const r = resolveLayout({ component: 'assertion-evidence', relationship: 'evidence', count: 2, data: ['literature'] }, doc);
  assert.equal(r.fit, true); assert.equal(r.key, 'N38a');
});

test('one finding with participant quotes -> N48a, chosen inside the family', () => {
  const r = resolveLayout({ family: '證據', count: 1, data: ['quote'] }, doc);
  assert.equal(r.key, 'N48a'); assert.equal(r.family, '證據');
});

test('scale numbers -> N04a; a trend -> N04b', () => {
  assert.equal(resolveLayout({ component: 'assertion-evidence', count: 4, data: ['number'] }, doc).key, 'N04a');
  assert.equal(resolveLayout({ component: 'assertion-evidence', data: ['chart'] }, doc).key, 'N04b');
});

test('cover component: position decides between opening and closing', () => {
  assert.equal(resolveLayout({ component: 'cover', position: 'opening' }, doc).layout, 'N01');
  assert.equal(resolveLayout({ component: 'cover', position: 'closing' }, doc).layout, 'N34');
});

test('position-bound variants are not picked elsewhere', () => {
  const r = resolveLayout({ layout: 'N06', count: 1, data: ['text'] }, doc);
  assert.equal(r.fit, false);
});

test('nothing fits -> report no-fit with the custom-figure fallback, never a silent generic', () => {
  const r = resolveLayout({ component: 'peer-cards', count: 12, data: ['text'] }, doc);
  assert.equal(r.fit, false); assert.equal(r.fallback, 'N47'); assert.ok(r.reason);
});

test('generic workbench components fall back to the relationship', () => {
  const r = resolveLayout({ component: 'generic-groups', relationship: 'sequence', count: 4, data: ['steps'] }, doc);
  assert.equal(r.fit, true); assert.ok(doc.layouts.find(l => l.id === r.layout).workbench.relationships.includes('sequence'));
});

test('N29 and N47 are never picked automatically', () => {
  for (const data of [['relation'], ['screen'], ['text']]) {
    const r = resolveLayout({ data }, doc);
    assert.ok(!['N29', 'N47'].includes(r.layout));
  }
});

test('a count match alone is not enough: two plain-text points do not become participant quotes', () => {
  const r = resolveLayout({ component: 'assertion-evidence', count: 1, data: ['text'], position: 'opening' }, doc);
  assert.ok(!r.fit || r.layout !== 'N48', JSON.stringify(r));
});

test('the author can name a layout or a variant; impossible choices come back with the reason', () => {
  assert.equal(resolveLayout({ layout: 'N38', count: 2, data: ['text'] }, doc).layout, 'N38');
  assert.equal(resolveLayout({ layout: 'N38b', count: 2, data: ['number'] }, doc).key, 'N38b', 'a named variant is kept even when the data does not match');
  const r = resolveLayout({ layout: 'N48a', count: 3, data: ['quote'] }, doc);
  assert.equal(r.fit, false); assert.match(r.reason, /項數 3/);
  assert.match(resolveLayout({ layout: 'N99' }, doc).reason, /unknown layout/);
});

test('the author can name a family; the component only adds score inside it', () => {
  const r = resolveLayout({ family: '流程', component: 'assertion-evidence', count: 4, data: ['steps'] }, doc);
  assert.equal(r.fit, true); assert.equal(r.family, '流程');
});
