// Shared headless-Chrome helper for build-manifest.mjs and lint-deck.mjs.
// Resolves Playwright from the Codex runtime (same place the presentation workbench uses)
// unless WORKBENCH_RUNTIME_MODULES / CHROME_PATH say otherwise.
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const runtime = process.env.WORKBENCH_RUNTIME_MODULES
  || path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const chromePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

export async function openPage(file, { width = 2016, height = 1200, blockRemoteFonts = false } = {}) {
  let playwright;
  try { playwright = require(path.join(runtime, 'playwright')); }
  catch { throw new Error(`Playwright not found under ${runtime}. Set WORKBENCH_RUNTIME_MODULES.`); }
  const launch = fs.existsSync(chromePath) ? { executablePath: chromePath } : {};
  const browser = await playwright.chromium.launch(launch);
  const page = await browser.newPage({ viewport: { width, height } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  if (blockRemoteFonts) await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await page.goto('file://' + path.resolve(file), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  return { browser, page, errors };
}
