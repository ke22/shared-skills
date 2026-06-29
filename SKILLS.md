# Shared Skills Package

Canonical index of Claude Code skills used across all repos.

Global install: `~/.claude/skills/`
Per-repo: symlink or copy a skill subfolder into `.claude/skills/<name>/`

---

## Cloudflare

| Skill | Trigger | Description |
|---|---|---|
| `agents-sdk` | building stateful agents, Durable Workflows, WebSocket, MCP servers | Cloudflare Agents SDK — stateful agents, durable workflows, real-time apps |
| `cloudflare` | any Cloudflare platform task | Consolidated Cloudflare skill — Workers, Pages, KV, D1, R2, AI, WAF |
| `cloudflare-email-service` | email sending/routing, Cloudflare Email, SPF/DKIM | Cloudflare Email Service — transactional email via Workers binding or REST API |
| `durable-objects` | stateful edge, coordinated Durable Objects | Build stateful, coordinated apps on Cloudflare's edge |
| `sandbox-sdk` | secure isolated code execution, Cloudflare sandbox | Cloudflare Sandbox SDK — isolated code execution environments |
| `turnstile-spin` | set up Turnstile, CAPTCHA, bot protection | End-to-end Turnstile integration: widget + managed siteverify Worker |
| `web-perf` | web performance, Core Web Vitals, Lighthouse | Web performance audit — LCP, CLS, FID, caching, asset optimisation |
| `workers-best-practices` | Workers APIs, types, wrangler.toml | Cloudflare Workers best practices — types, config, fetch patterns |
| `wrangler` | wrangler CLI flags, deploy, dev, tail | Wrangler CLI — flags, subcommands, secrets, bindings |

## Spectra (Project workflow)

| Skill | Trigger | Description |
|---|---|---|
| `spectra-propose` | create a change proposal, new feature spec | Create a complete Spectra change proposal from requirement to validated artifacts |
| `spectra-apply` | implement tasks from Spectra change | Implement tasks from a Spectra change |
| `spectra-ask` | query openspec, ask about a change | Query openspec/documents and answer questions |
| `spectra-analyze` | analyze Spectra change | Analyze a Spectra change in a fork context |
| `spectra-ingest` | update existing Spectra change from external context | Update an existing Spectra change from a plan file or conversation |
| `spectra-commit` | commit files for Spectra change | Commit files related to a specific Spectra change |
| `spectra-debug` | debug systematically, four-phase debug | Systematic debug using a four-phase workflow |
| `spectra-discuss` | focused discussion, reach a conclusion | Focused discussion about a topic and reach a conclusion |
| `spectra-audit` | security audit, changed code review | Audit changed code for security sharp edges (report-only fork) |
| `spectra-archive` | archive completed change | Archive a completed change |
| `spectra-verify` | verify a code change works | Verify that a code change does what it's supposed to |
| `spectra-drift` | detect drift between spec and code | Detect drift between spec and implementation |

## OpenClaw (Reflective practice)

| Skill | Trigger | Description |
|---|---|---|
| `openclaw-daily` | 每天/daily, 把今天的努力儲存, log skills | Convert today's effort into reusable skill improvements |
| `openclaw-weekly` | 每週/weekly retro, rolling 7-day recap | Weekly retro — commands used, blind spots, next-week actions |
| `openclaw-monthly` | 每月/monthly, A/B experiments, long-term defaults | Monthly A/B experiment on tools/settings, output long-term defaults |
| `log-lesson` | log-lesson, pitfall, ADR, architecture decision | Capture a dev learning or architecture decision from the current conversation |

## Research & Writing

| Skill | Trigger | Description |
|---|---|---|
| `discuss` | research topic scoping, before /research-orchestrator | Multi-turn scoping discussion — writes discuss.md when direction confirmed |
| `llm-wiki` | build a wiki from documents, compounding knowledge base | Turn documents into a persistent, compounding wiki |
| `project-bootstrap` | new project, before repo or Notion page exists | Bootstrap a new project from rough notes into scaffold files |
| `fe-polish` | front-end final polish, before publish, WCAG | Seven-phase front-end polish — adaptive experience, WCAG, SEO, browser compat |

## Workspace

| Skill | Trigger | Description |
|---|---|---|
| `skill-publish` | publish skill, sync skill to shared-skills, after writing new SKILL.md | Sync a new skill to shared-skills, update SKILLS.md, create Notion sub-page, and push |

---

## Broken symlinks (need repair)

These were symlinked from `2026_FDE+Gov/.claude/skills/` but the target folder no longer exists.
Remove or re-point from `~/.claude/skills/`:

- `analyze-agent`
- `factcheck-agent`
- `report-agent`
- `research-orchestrator`
- `review-agent`
- `routine-update`
- `search-agent`
- `wiki-builder`

---

## Adding a skill to a repo

```sh
# Option A — symlink from global
ln -s ~/.claude/skills/<name> .claude/skills/<name>

# Option B — copy (for offline / portable use)
cp -r ~/.claude/skills/<name> .claude/skills/<name>
```
