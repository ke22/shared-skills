#!/usr/bin/env node
// One command that proves the design system is consistent:
//   1. tokens: every consumer matches tokens.json            (check-tokens.mjs)
//   2. manifest.json and layouts.json are not stale          (build-*.mjs --check)
//   3. both templates pass every lint rule                   (lint-deck.mjs)
//   4. the bad fixture trips every rule, so no rule is dead  (lint-deck.mjs on tests/fixtures/bad-deck.html)
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const run = (...a) => spawnSync(process.execPath, a, { cwd: ROOT, encoding: 'utf8' });
const results = [];
const step = (name, ok, detail = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };

let r = run('scripts/check-tokens.mjs');
step('tokens consistent across consumers', r.status === 0, r.status ? r.stdout.split('\n').filter(l => l.startsWith('FAIL')).join('; ') : '');
r = run('scripts/build-manifest.mjs', '--check');
step('manifest.json up to date', r.status === 0, r.status ? 'run node scripts/build-manifest.mjs' : '');
r = run('scripts/build-layouts.mjs', '--check');
step('layouts.json up to date', r.status === 0, r.status ? 'run node scripts/build-layouts.mjs' : '');
r = run('scripts/lint-deck.mjs', 'templates/iasdr-layouts.html', 'templates/iasdr-deck.html');
step('templates pass lint', r.status === 0, (r.stdout.trim().split('\n').pop() || ''));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'dds-')), 'fixture.json');
r = run('scripts/lint-deck.mjs', 'tests/fixtures/bad-deck.html', '--json', out);
const report = JSON.parse(fs.readFileSync(out, 'utf8'));
const fired = new Set(report.findings.map(f => f.rule));
const dead = Object.keys(report.rules).filter(k => !fired.has(k));
step('every lint rule fires on the bad fixture', dead.length === 0, dead.length ? `never fired: ${dead.join(', ')}` : `${fired.size}/${Object.keys(report.rules).length} rules`);
const over = report.findings.filter(f => f.level === 'overridden');
step('style rule override with a reason is accepted', over.some(f => f.rule === 'R13' && /quoted title/.test(f.reason)), `${over.length} override(s)`);
step('floor rule override is ignored', report.findings.some(f => f.rule === 'R10' && f.level === 'error' && /override ignored: floor/.test(f.detail)));
step('only style rules can be overridden', over.every(f => f.tier === 'style'));
process.exit(results.every(Boolean) ? 0 : 1);
