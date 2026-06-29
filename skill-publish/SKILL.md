# skill-publish

Sync a newly created Claude Code skill to the shared-skills repo, update SKILLS.md, create a Notion sub-page, and push — so every new skill is instantly available across all repos and documented in Notion.

**Triggers**: `/skill-publish`, "publish skill", "sync skill to shared-skills", "add this skill to shared", after writing a new `SKILL.md`, "新增 skill 到 shared"

---

## Step 0: Detect the new skill

Look for the skill to publish:

1. If the user named a skill explicitly (e.g. `/skill-publish fe-polish`), use that name.
2. Otherwise scan `.claude/skills/*/SKILL.md` in the current repo and find the most recently modified one.
3. If still ambiguous, ask: **"Which skill folder should I publish?"**

Confirm: show the user the skill name and its one-line description before proceeding.

---

## Step 1: Read the skill metadata

From the skill's `SKILL.md`, extract:

| Field | Where to find it |
|---|---|
| `name` | folder name (e.g. `fe-polish`) |
| `description` | first paragraph or subtitle after the `#` heading |
| `triggers` | **Triggers**: line near the top |
| `category` | infer from purpose — see table below |

**Category mapping**:
- Cloudflare platform (Workers, Pages, KV, D1, AI, Wrangler, email, Turnstile) → `Cloudflare`
- Spectra workflow steps (propose / apply / verify / archive / …) → `Spectra`
- OpenClaw reflective practice (daily / weekly / monthly / log) → `OpenClaw`
- Research, writing, scoping, front-end polish → `Research & Writing`
- Workspace, skill management, project setup → `Workspace`
- Anything else → propose a new category to the user

---

## Step 2: Copy to shared-skills

```sh
SKILL_NAME=<name>
SRC=".claude/skills/$SKILL_NAME"
DST="/Users/yulincho/Documents/01_Github/shared-skills/$SKILL_NAME"
```

- If `$DST` already exists: **ask the user** "Overwrite existing `$SKILL_NAME` in shared-skills?" before proceeding.
- If `$SRC` doesn't exist: check `~/.claude/skills/$SKILL_NAME` as fallback.

```sh
cp -r "$SRC" "$DST"
```

---

## Step 3: Update SKILLS.md

File: `/Users/yulincho/Documents/01_Github/shared-skills/SKILLS.md`

Add a row to the correct category table:

```
| `<name>` | <trigger phrase(s)> | <one-line description> |
```

If the category doesn't exist yet, add a new `## <Category>` section with the table header before appending the row.

---

## Step 4: Symlink into global skills (if not already there)

```sh
ln -sf "/Users/yulincho/Documents/01_Github/shared-skills/$SKILL_NAME" \
       "$HOME/.claude/skills/$SKILL_NAME"
```

Skip silently if the symlink already exists and points to the right target.

---

## Step 5: Create Notion sub-page

Parent: **Skills Package** page (`38e35900-ea06-8176-ad04-e656fd33e7ee`)

Use `notion-create-pages` to create a page titled `<name>` with this structure (in Traditional Chinese):

```
## 觸發時機
<when to invoke — phrase patterns, situations, user intent>

## 輸入格式
`/<name>` 或 `/<name> <argument>`
<explain what arguments are accepted, if any>

## 工作流程
1. <step 1>
2. <step 2>
…

## 輸出
<what it produces — files written, Notion pages created, terminal output, etc.>

## 設計邏輯
<why this skill exists — the problem it solves, the design principle behind it>

## 注意事項
- <edge case or gotcha 1>
- <edge case or gotcha 2>
```

Derive the content from the skill's `SKILL.md` — don't fabricate details not present there.

---

## Step 6: Commit and push shared-skills

```sh
cd /Users/yulincho/Documents/01_Github/shared-skills
git add .
git commit -m "feat: add <skill-name> skill"
git push
```

---

## Step 7: Report

Print a confirmation block:

```
✅ Copied      shared-skills/<name>/
✅ SKILLS.md   added row under <Category>
✅ Symlinked   ~/.claude/skills/<name>
✅ Notion      sub-page created: <name>
✅ Pushed      ke22/shared-skills (main)
```

---

## Rules

- **Never overwrite** without confirming with the user.
- **Derive Notion content from SKILL.md** — do not invent steps or descriptions.
- **One skill per invocation** — don't batch; each skill deserves its own commit and Notion page.
- **Category first** — always categorise before writing to SKILLS.md; a wrong category is harder to fix than a missing row.
- **Symlink, don't copy, for global install** — this keeps global and shared-skills in sync automatically.
