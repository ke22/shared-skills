---
name: fe-polish
description: "Seven-phase front-end final-polish workflow: adaptive experience, WCAG, SEO/AEO, browser compat, code optimisation, debug, and learning recap"
effort: xhigh
license: MIT
metadata:
  author: yulincho
  version: "1.0"
---

Seven-phase front-end final-polish workflow. Run before every publish to audit adaptive experience, WCAG accessibility, SEO/AEO, browser compatibility, and performance — then delegate to existing skills for optimisation, debugging, and learning recap.

**Input**: Optional arguments to scope the run:

- `/fe-polish` — run all seven phases in sequence
- `/fe-polish --only <phase>` — run exactly one phase
- `/fe-polish --skip <phase>` — run all phases except the named one

Valid phase names: `adaptive`, `wcag`, `seo`, `compat`, `optimise`, `debug`, `recap`

Examples:
- `/fe-polish --only wcag` — WCAG audit only
- `/fe-polish --skip debug` — all phases except debug
- `/fe-polish --only seo` — SEO/AEO audit with publishing-intent gate

**Single-skill seven-phase architecture**: all audit phases run in one invocation and share context (e.g. findings from Phase 1 inform the Phase 6 debug trigger). Delegation phases (5–7) prompt the user to invoke existing skills rather than chaining automatically, so each phase remains independently controllable.

---

## Before You Start

Silently run these two steps before any phase output:

1. **Identify source files**: `find . -type f \( -name "*.html" -o -name "*.ts" -o -name "*.css" -o -name "*.js" \) | grep -v node_modules | grep -v ".git" | grep -v dist | head -30`
2. **Check for Spectra**: `ls openspec/ 2>/dev/null` — note result for use after phases 1–4.

---

## Phase 1 — Adaptive Experience Audit

*(skip if `--only` names a different phase, or if `--skip adaptive`)*

Grep for the signals below. Report each finding using the format:

```
**[P0/P1/P2][all/mobile/desktop] Short title**
- Evidence: file:line
- Impact: who is affected and how
- Fix: one sentence
```

| Signal | Grep pattern | Default severity |
|---|---|---|
| `vh` without `dvh` fallback | `min-height:.*vh` then check adjacent line for `dvh` | P1 |
| `prefers-reduced-motion` absent | grep for `prefers-reduced-motion` in CSS + JS | P1 |
| `prefers-color-scheme` absent | grep for `prefers-color-scheme` | P2 |
| `resize` listener without debounce | `addEventListener.*resize` without `clearTimeout`/`setTimeout` nearby | P1 |
| Touch targets below 44×44 px | `min-width\|min-height` values under `44px` or `2.75rem` on interactive elements | P1 `[mobile]` |
| Font sizes in `px` (non-icon) | `font-size:.*px` outside `@keyframes` and icon rules | P2 |

**P0 criteria for adaptive**: any `vh`-only height on the masthead / hero section (mobile Safari URL-bar truncation).

---

## Phase 2 — WCAG Audit

*(skip if `--only` names a different phase, or if `--skip wcag`)*

Tag every finding with WCAG level **and** viewport scope:

```
**[P0/P1/P2][AA/AAA][mobile/desktop/all] Short title**
- Evidence: file:line
- Impact: who is affected
- Fix: one sentence
```

**WCAG finding tagging convention**:
- `[AA]` — required for WCAG 2.1 AA conformance
- `[AAA]` — above AA; flag but do not treat as blocking
- `[mobile]` — only affects narrow viewport / touch
- `[desktop]` — only affects wide viewport / keyboard
- `[all]` — affects all viewports

| Signal | Grep pattern | Level | Default severity |
|---|---|---|---|
| Interactive element without `aria-label` | `<button\|<a` without `aria-label` or visible text | AA | P1 |
| `aria-current="true"` (non-semantic) | `aria-current="true"` | AA | P2 |
| Toggle button without `aria-pressed` | `<button` with play/pause/toggle behavior, no `aria-pressed` | AA | P1 |
| Missing `focus-visible` style | `:focus-visible` absent in CSS | AA | P1 `[desktop]` |
| Missing skip link | `class.*skip` absent in HTML | AA | P1 `[desktop]` |
| Decorative image with non-empty alt | `<img` with content `alt` but `aria-hidden` absent | AA | P2 |
| `aria-hidden` on meaningful text | `aria-hidden="true"` on non-decorative elements | AA | P0 |

**Not a bug** (confirm and exclude from report):
- `aria-hidden="true"` on images paired with adjacent visible text or an `<h1>` describing the same content
- Decorative SVGs with `aria-hidden="true"` and no `role`

---

## Phase 3 — SEO / AEO Audit

*(skip if `--only` names a different phase, or if `--skip seo`)*

**Publishing-intent gate** — ask before grepping:

> "Is this page published (or about to be published) to a live domain?"

Use the answer to set severity:

| Element | Published | Not published |
|---|---|---|
| Missing `<title>` | **P0** | **P0** |
| Missing `<meta name="description">` | P0 | P1 |
| Missing Open Graph tags (`og:title`, `og:description`, `og:image`, `og:url`, `og:type`) | P0 | P2 |
| Missing Twitter Card (`twitter:card`, `twitter:title`, etc.) | P1 | P2 |
| Missing `<link rel="canonical">` | P1 | P2 |
| Missing Article JSON-LD (`<script type="application/ld+json">`) | P0 | P2 |
| `og:image` is a relative URL | P0 | P2 |

**Grep patterns**:
- `<title` — check presence
- `og:` — check OG tags
- `twitter:` — check Twitter Card
- `canonical` — check canonical link
- `application/ld+json` — check structured data

---

## Phase 4 — Browser & System Compatibility Audit

*(skip if `--only` names a different phase, or if `--skip compat`)*

| Signal | Detection rule | Severity |
|---|---|---|
| Unguarded `matchMedia` | `globalThis.matchMedia(` without preceding `typeof globalThis.matchMedia === 'function'` | **P0** `[all]` — crashes LINE browser / old Android WebView |
| `-webkit-` without standard property | `-webkit-backdrop-filter` without adjacent `backdrop-filter`; `-webkit-mask-image` without adjacent `mask-image` | P1 |
| Below-fold images without `loading="lazy"` | `<img` outside first viewport section without `loading="lazy"` | P1 |
| LCP image without `fetchpriority="high"` | Hero / masthead `<img>` without `fetchpriority="high"` | P1 |
| `will-change` overuse | more than 3 elements with `will-change` simultaneously | P2 |
| `position: sticky` without overflow check | `position: sticky` in a container that has `overflow: hidden/auto` on an ancestor | P1 `[mobile]` |

**Confirmed safe patterns** (do not flag):
- `-webkit-backdrop-filter` when standard `backdrop-filter` is also present on the same rule
- `scrollbar-width: none` paired with `::-webkit-scrollbar { display: none }`

---

## Phase 5 — Code Optimisation

*(skip if `--only` names a different phase, or if `--skip optimise`)*

This phase delegates to the existing `/simplify` skill.

**Prompt the user:**

> Code optimisation is handled by `/simplify`. Run it now to review the changed files for reuse, quality, and efficiency improvements.

Do not perform optimisation analysis yourself in this phase.

---

## Phase 6 — Debug

*(skip if `--only` names a different phase, or if `--skip debug`)*
*(skip entirely if phases 1–4 produced zero P0 or P1 findings)*

If at least one P0 or P1 finding was found in phases 1–4, prompt:

> **Bugs found in audit.** Run `/spectra-debug <issue description>` for each P0 or P1 item that represents a reproducible defect. Suggested invocations:
>
> (list each P0/P1 finding as a suggested `/spectra-debug` call)

If phases 1–4 produced only P2 findings or zero findings, skip this phase silently.

---

## Phase 7 — Learning Recap

*(skip if `--only` names a different phase, or if `--skip recap`)*

Always runs after all selected phases complete.

**Prompt the user:**

> Run `/spectra-learn` to auto-review this session, capture decisions and learnings, commit, and write a handoff record.

---

## Spectra Integration (opt-in)

After phases 1–4 complete, check for `openspec/` in the working directory (detected in the Before You Start step).

**If `openspec/` exists:**

> Spectra project detected. To turn these findings into a tracked change proposal with specs, design, and tasks, run:
> `/spectra-propose <change-name>`
> Suggested name based on findings: `fe-polish-<YYYY-MM-DD>`

**If `openspec/` does not exist:** do not mention Spectra.

---

## Output Format

Each audit phase produces:

```
## Phase N — <Name>

### Findings

**[P0/P1/P2][AA/AAA (WCAG only)][mobile/desktop/all] Title**
- Evidence: path/to/file:line
- Impact: <affected user group and consequence>
- Fix: <one sentence>

### Confirmed Not Bugs
- <element/pattern> — <reason it is correct>
```

End of all phases: show a **Summary Table**:

```
| Phase | P0 | P1 | P2 | Status |
|---|---|---|---|---|
| Adaptive | 0 | 1 | 1 | ⚠ |
| WCAG | 0 | 0 | 1 | ✓ |
| SEO/AEO | 1 | 0 | 0 | ✗ |
| Compat | 0 | 2 | 0 | ⚠ |
```

Then show delegation prompts and Spectra integration offer (if applicable).

---

## Guardrails

- **Never modify code** — this skill is audit + report only; all fixes happen via the change proposal or direct editing outside this skill.
- **Never invent findings** — every finding must have a `file:line` evidence reference from an actual grep result.
- **Never skip the publishing-intent question** in Phase 3 — the answer materially changes severity.
- **Never show Phase 6 prompt** when phases 1–4 found only P2 or no issues.
- **Always show Phase 7 prompt** regardless of finding count.

## User Skills

<user-skills baseDir="assets/references/user">
</user-skills>
