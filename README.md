# shared-skills

A portable collection of Claude Code skills (slash commands) ready to drop into any repo.

## What's inside

29 skills across 4 categories:

| Category | Skills |
|---|---|
| ☁️ Cloudflare | `agents-sdk` `cloudflare` `cloudflare-email-service` `durable-objects` `sandbox-sdk` `turnstile-spin` `web-perf` `workers-best-practices` `wrangler` |
| 🗂 Spectra | `spectra-propose` `spectra-apply` `spectra-ask` `spectra-analyze` `spectra-ingest` `spectra-commit` `spectra-debug` `spectra-discuss` `spectra-audit` `spectra-archive` `spectra-verify` `spectra-drift` |
| 🦞 OpenClaw | `openclaw-daily` `openclaw-weekly` `openclaw-monthly` `log-lesson` |
| 📚 Research & Writing | `discuss` `llm-wiki` `project-bootstrap` `fe-polish` |

See [SKILLS.md](./SKILLS.md) for the full list with triggers and descriptions.

---

## Install

### Option A — add all skills globally (available in every repo)

```sh
git clone https://github.com/ke22/shared-skills.git
cd shared-skills

# Symlink each skill into ~/.claude/skills/
for skill in */; do
  skill="${skill%/}"
  [ -f "$skill/SKILL.md" ] && ln -sf "$(pwd)/$skill" ~/.claude/skills/$skill
done
```

### Option B — add selected skills to a single repo

```sh
git clone https://github.com/ke22/shared-skills.git /tmp/shared-skills

# Copy (or symlink) just the skills you want
mkdir -p .claude/skills
cp -r /tmp/shared-skills/fe-polish .claude/skills/
cp -r /tmp/shared-skills/log-lesson .claude/skills/
# ... repeat for each skill
```

### Option C — git submodule (keeps skills in sync)

```sh
git submodule add https://github.com/ke22/shared-skills.git .claude/shared-skills

# Then symlink what you need
ln -s "$(pwd)/.claude/shared-skills/fe-polish" .claude/skills/fe-polish
```

---

## Invoke a skill

Once installed, type the skill name as a slash command in Claude Code:

```
/fe-polish
/log-lesson
/spectra-propose add dark mode toggle
/project-bootstrap
```

---

## Skill anatomy

Each skill is a folder with a `SKILL.md` file (the instructions) and optional supporting files:

```
skill-name/
├── SKILL.md          # Triggers, workflow, and instructions
├── references/       # Long docs loaded on demand
├── scripts/          # Deterministic shell scripts
└── assets/           # Templates, examples
```

---

## Categories

### ☁️ Cloudflare
Technology skills for building on the Cloudflare platform. All bias toward retrieving the latest docs rather than relying on pre-trained knowledge — Cloudflare APIs change fast.

### 🗂 Spectra
Structured software development workflow: Propose → Apply → Verify → Archive. Requires the `spectra` CLI.

### 🦞 OpenClaw
A learning-compounding system. Convert daily conversations into reusable skills, do weekly retrospectives, run monthly A/B experiments on your tooling.

### 📚 Research & Writing
Pre-work skills that sharpen direction before expensive downstream work begins.
