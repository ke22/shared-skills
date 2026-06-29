---
name: llm-wiki
description: Maintains a persistent, interlinked markdown wiki built from immutable raw sources (LLM Wiki pattern). Use when the user mentions LLM wiki, personal knowledge base, Obsidian wiki, raw/wiki/schema layers, ingesting sources, building wiki pages, updating index/log, wikilinks, or running wiki lint/health checks.
---

# LLM Wiki

## Goal

Turn a pile of documents into a **persistent, compounding wiki** (markdown pages with links) that stays current as new sources arrive.

## Core model (3 layers)

- **Raw sources (`raw/`)**: source-of-truth inputs. Treat as **immutable** (read-only).
- **Wiki (`wiki/`)**: LLM-maintained markdown pages: `sources/`, `topics/`, `concepts/`, `entities/`, plus `index.md`, `log.md`.
- **Schema (e.g. `CLAUDE.md` / `AGENTS.md`)**: the rules that define structure, conventions, and workflows.

## Default operating modes

### Ingest (add a new source)

Triggers: new file added under `raw/`, user says "ingest" / "summarize into wiki".

Checklist:
- Read the project schema file (`CLAUDE.md` or `AGENTS.md`) and follow it exactly.
- Read the new raw source(s).
- Create/update a source summary page under `wiki/sources/<slug>.md` with required frontmatter.
- Add/update cross-links to relevant `wiki/concepts/`, `wiki/entities/`, `wiki/topics/` pages.
- Update `wiki/index.md` to include the new/updated source entry.
- Append an entry to `wiki/log.md` with heading format: `## [YYYY-MM-DD] ingest | ...`

If the repo has automation scripts, prefer running them instead of hand-editing repetitive sections.

### Query (answer and optionally file back)

Triggers: user asks a question about the corpus ("what do we know about X?").

Checklist:
- Start by reading `wiki/index.md` to locate relevant pages.
- Read only the necessary `wiki/` pages, then raw excerpts if needed for evidence.
- Answer with citations (point to `wiki/...` and, when needed, `raw/...` paths).
- If the answer is durable, file it: create/update `wiki/topics/<topic>.md`, add links, append a `query` log entry.

### Lint / Health check

Triggers: "lint", "health check", "fix wikilinks", "find orphans", "stale pages".

Checklist:
- Run the repo's health/lint script(s) if present (preferred).
- Fix high-signal issues:
  - broken `[[wikilinks]]`
  - orphan pages (no inbound links)
  - missing required frontmatter fields
  - duplicated/contradictory metadata
  - staleness (raw updated but wiki summary not updated)
- Record the lint pass in `wiki/log.md`.

## Conventions to enforce

- **Wiki links**: Obsidian-style `[[page-name-without-ext]]`.
- **Filenames**: stable slugs in `kebab-case`.
- **Frontmatter**: require `title`, `tags`, `date_created`, `date_updated`; add source metadata for `wiki/sources/*`.
- **Never silently rewrite raw**: if something in raw is wrong, add a note in wiki; don't mutate sources.

## Quick prompts

- "Ingest `raw/...` into the wiki; update `wiki/sources/`, `wiki/index.md`, and `wiki/log.md`, and add missing concept/entity/topic links."
- "Answer this question using `wiki/` first; only open `raw/` if needed. If the synthesis is reusable, file it under `wiki/topics/` and log it."
- "Run a wiki health check; fix broken links/orphans/frontmatter issues; then summarize what changed."
