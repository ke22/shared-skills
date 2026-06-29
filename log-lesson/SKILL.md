# log-lesson

Capture a dev learning or architecture decision from the current conversation context. Write it to the right file immediately — don't wait until end of project.

**Input**: `/log-lesson` (pitfall) or `/log-lesson adr` (architecture decision)

---

## Step 0: Detect mode

- No argument or `pitfall` → **PITFALL mode** → writes to `LEARNINGS.md`
- `adr` → **ADR mode** → writes to `design.md`

---

## PITFALL mode

### Step 1: Extract from context

Read the recent conversation to identify:
- **What broke / was surprising** — the symptom
- **Why it happened** — the root cause
- **How it was fixed** — the concrete solution

If context is ambiguous, ask ONE question: "What was the root cause?"

### Step 2: Draft entry

Format:

```markdown
## N. {One-line title — what the pitfall is, not what the fix is}

**問題**：{symptom — what the user observed}
**原因**：{root cause — why it happened}
**解法**：{fix — concrete, copy-pasteable if possible}
```

Pick N by counting existing `## N.` headings in `LEARNINGS.md` + 1. If file doesn't exist, N = 1.

### Step 3: Infer tags

Pick 2–4 tags from the existing tag list in `01_Github/LESSONS.md`, or invent new ones if nothing fits. Keep tags lowercase, hyphenated.

### Step 4: Present draft

Show the user:
1. The formatted LEARNINGS.md entry
2. The one-line LESSONS.md row: `| L-{REPO}-{NN} | {summary} | \`tag1\` \`tag2\` | {repo} | [→]({repo}/LEARNINGS.md) §N |`

Ask: **"確認寫入，或調整？"**

### Step 5: Write

On confirm:

1. **LEARNINGS.md** — append the entry. If file doesn't exist, create it with header:
   ```markdown
   # Dev Learnings — {repo-name}

   開發過程遇到的問題與解法紀錄。

   ---
   ```
2. **`01_Github/LESSONS.md`** — append the row to the index table.
3. **Tag list** in LESSONS.md — add any new tags not already listed.

---

## ADR mode

### Step 1: Extract from context

Read the recent conversation to identify:
- **What was being decided** — the context / problem
- **What was chosen** — the decision
- **What was rejected** — the alternatives
- **Why** — the key rationale

If context is ambiguous, ask ONE question: "What did you decide, and what was the main reason?"

### Step 2: Draft entry

Count existing `## DD-NN` entries in `design.md` + 1 for the new ID.

Format:

```markdown
## DD-{NN} — {one-line decision title}

**Status:** proposed（待確認）
**Context:** {why this decision was needed — 1–2 sentences}

### 決策
{what was chosen and why — include what was rejected}

### 影響
{consequences — what this rules out, what it enables}
```

### Step 3: Present draft

Show the formatted DD entry.

Ask: **"確認寫入，或調整？Status 要改成 accepted 嗎？"**

### Step 4: Write

On confirm — append to `design.md` in the current repo. If `design.md` doesn't exist, create it with header:

```markdown
# Design Decisions

決策層紀錄。每條標 status：`proposed`（待拍板）/ `accepted` / `superseded`。

---
```

---

## File location rules

- `LEARNINGS.md` and `design.md` go in the **current repo root** (wherever Claude Code is running)
- `LESSONS.md` is always at `/Users/yulincho/Documents/01_Github/LESSONS.md`
- For repo name in LESSONS.md row: use the current directory's folder name

## Repo ID abbreviation

Derive a short prefix for the LESSONS.md ID from the folder name:
- `world-cup-2026` → `WC`
- `gov-budget-v2` → `GB2`
- `fde-gov-2026` → `FDE`
- General rule: take uppercase initials, drop common words (gov, app, v1, v2 suffix use as number)

---

## Rules

- **One entry per invocation** — don't batch multiple pitfalls in one run; each deserves its own entry
- **Write immediately on confirm** — don't say "I'll write it later"
- **Never skip the draft step** — always show the user before writing
- **If LEARNINGS.md has entries numbered 1–N, new entry is N+1** — keep it sequential
- **Pitfall titles describe the trap, not the fix**: "scrollIntoView 冒泡到父視窗" ✓ · "改用 scrollTop 解決滾動問題" ✗
