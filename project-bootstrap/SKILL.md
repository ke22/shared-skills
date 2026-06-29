---
name: project-bootstrap
description: "Pre-repo planning assistant. Turns rough project notes into a clear plan before you create a repo or Notion page — works for work, school, personal, research, design, coding, and AI-workflow projects. Generates a project brief, folder structure, AGENTS.md, README, task list, prompts, and evaluation checklist."
license: MIT
metadata:
  author: yulincho
  version: "1.0"
---

Bootstrap a new project **before** the repo or Notion page exists. Take rough notes, keywords, or half-formed ideas and turn them into a clear, ready-to-start project package.

The goal is to start clearly — **not** to build a perfect system. Keep every output simple and short. Do not over-engineer.

**Input**: Whatever the user gives — a sentence, a pile of notes, a keyword. Examples:

- `/project-bootstrap I want to start a project about CNA daily chart building with AI`
- `/project-bootstrap thesis paper database`
- `/project-bootstrap` (then ask the user what they want to start)

---

## Process

Work through these six questions. Infer answers from the user's input where you can; ask only for what's genuinely missing and blocking. Do not interrogate — one short round of clarification at most.

1. **Domain** — Work · School · Personal · Cross-domain
2. **Project type** — Research · Design · Coding · AI agent · Data visualization · Knowledge management · Workflow · Learning · Creative
3. **Main goal** — one sentence: what does "done" look like?
4. **Final output** — the concrete artifact (chart system, thesis chapter, repo, Notion DB, prototype…)
5. **Tools needed** — what it runs on (Notion, a repo, Python, design files, MCP, data sources…)
6. **First tasks** — the first concrete moves

If the user's input already answers most of these, skip ahead and confirm your inferences in the summary rather than asking.

---

## Choosing the structure

Match the structure to the project type — don't force a code repo onto a planning project:

| Project type                       | Recommended home    | Backbone files / pages |
| ---------------------------------- | ------------------- | ---------------------- |
| Coding / AI agent                  | Git repo            | `README.md`, `AGENTS.md`, `tasks.md`, `prompts.md` |
| Research / thesis / knowledge mgmt | Notion or repo      | `research-question.md`, `paper-database.md`, `concepts.md`, `cases.md` |
| Design / data visualization        | Repo or design file | `brief.md`, `templates.md`, `data-sources.md` |
| Work / workflow                    | Notion or repo      | `workflow.md`, `data-sources.md`, `prompts.md` |
| Learning / personal                | Notion              | `goals.md`, `resources.md`, `log.md` |

Every project, regardless of type, gets: **`project-brief.md`**, **`tasks.md`**, **`evaluation.md`**.

The `templates/` directory holds starting points for the common files. Adapt them to the project — copy the relevant ones, fill them with the user's specifics, and drop the ones that don't apply.

---

## Output

Return a single **project package** with these sections, in order:

1. **Project summary** — domain, type, goal, final output (2–4 lines).
2. **Recommended structure** — the folder/page layout, as a tree.
3. **First 5 tasks** — concrete, ordered, each a real next action.
4. **Files / pages to create** — list, with a one-line purpose each.
5. **AI agent instructions** — a short `AGENTS.md` draft (only if it's a coding/agent project).
6. **Evaluation checklist** — 4–6 checks for "is this project on track / good?"

After presenting the package, ask the user whether to **write the files to disk** (a new folder) or keep it as a plan to paste into Notion. Only create files if they say yes.

---

## Templates and examples

- `templates/` — `project-brief.md`, `repo-structure.md`, `agents.md`, `readme.md`, `tasks.md`, `prompts.md`, `evaluation.md`. Use as scaffolds.
- `examples/` — worked packages: `thesis-project.md`, `cna-workflow.md`, `personal-ai-learning.md`. Read one that's close to the user's project to calibrate tone and depth.

---

## Rules

- Keep it simple. A starter, not a system.
- Prefer the user's own words; don't invent scope they didn't ask for.
- Ask at most one short round of questions, only for blocking gaps.
- Don't write files until the user confirms where the project should live.
