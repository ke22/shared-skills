---
name: discuss
description: "Research topic scoping discussion — clarify focus before running /research-orchestrator"
model: claude-sonnet-4-6
metadata:
  version: "1.0"
  pipeline: research-agent-pipeline
---

Run a multi-turn scoping discussion for one research topic and write `<topic-dir>/discuss.md` when the user confirms the direction. This skill runs BEFORE `/research-orchestrator` to sharpen focus so the downstream agents search with intent.

**Input**: topic directory path relative to the project root (e.g. `01_gov-ai-cases`). Required. Error and stop if not provided.

**Output**: `<topic-dir>/discuss.md` — written only when the user explicitly confirms the proposed direction.

---

## Step 1 — Load existing artifacts

Check for and read the following files if they exist (paths relative to project root):

- `<topic-dir>/sources.md`
- `<topic-dir>/analysis.md`

For each file found, read its contents silently and then list it to the user:

```
Loaded: sources.md
Loaded: analysis.md
```

If neither file exists, continue silently — this is normal for a fresh topic.

---

## Step 2 — Derive human-readable topic name

Map the directory name to its canonical label using this table:

| Directory name | Label |
|---|---|
| `01_gov-ai-cases` | 政府導入 AI 案例分析 |
| `02_gov-ai-risk` | 政府導入 AI 風險治理 |
| `03_enterprise-sovereign-ai` | 企業主權 AI 案例與分析 |
| `04_fde-cases` | Forward Deployment Engineer 案例與分析 |

If the directory name is not in the table, use the directory name itself as the label.

---

## Step 3 — Opening message with 2 scoping questions

Send a single opening message. This is the first user-visible output. The message must:

1. Name the topic using its human-readable label from Step 2.
2. Ask **exactly 2** scoping questions. Default question pair:
   - **Q1 (geographic focus)**: e.g. "要聚焦在哪些地區或國家？（例：亞洲、台灣、全球比較）"
   - **Q2 (audience/purpose, time horizon, or angle exclusions)**: choose the most useful given the topic. Examples:
     - Audience: "這份研究主要給誰看？（政策制定者、企業決策層、學術讀者）"
     - Time horizon: "時間範圍要聚焦在哪個年份區間？"
     - Angle exclusions: "有哪些角度或面向你希望這次不要涵蓋？"

Do not ask more than 2 questions in the opening message.

---

## Step 4 — Multi-turn discussion loop (Assumptions mode)

After the user replies, enter the multi-turn loop. Each user response triggers exactly one AI reply structured as follows:

**A. Propose an angle interpretation** — synthesize the user's answers into a concrete research direction. Be specific: name the geographic scope, the angle, the lens (e.g. risk, adoption, ROI, governance), and what the pipeline should find.

**B. Then do one of the following** (choose based on how complete the picture is):

- **Ask a follow-up question** if there is still material ambiguity (e.g. "你提到政府案例 — 要包含失敗案例還是只看成功導入？"). Ask only ONE follow-up per turn.
- **Propose convergence** if the direction is clear enough for the pipeline to run. Signal this explicitly:

  > 「我認為方向已經夠清楚了。以下是我的解讀：
  > [1-2 sentences describing the confirmed direction]
  > 你同意這個方向嗎？還是想調整？」

Do not propose convergence before the user has answered at least one round of questions.

**Loop continues** until convergence is accepted (Step 5) or the user ends the session without accepting.

---

## Step 5 — Convergence: write discuss.md

**Convergence trigger**: The user has accepted the proposed direction. Accept triggers include:

- Any of these words/phrases (case-insensitive, anywhere in the message): `確認`, `yes`, `confirmed`, `ok`, `好`, `好的`, `accept`
- The user explicitly stating they agree with the proposed direction in their own words (e.g. "對，就這樣", "沒問題", "就照你說的")

When convergence is triggered:

1. **Atomically write** `<topic-dir>/discuss.md` using the format specified below.
2. **Display** the confirmation message:

   ```
   ✓ Written to `<topic-dir>/discuss.md`
   ```

3. **Do not** write any other files.

**If the session ends without the user accepting** (e.g. user types `/exit`, closes the session, or redirects without confirming): do NOT write `discuss.md`. The file must only be created on explicit acceptance.

---

## discuss.md format

Write the file as flat markdown. All section headers are required. Do not use JSON or YAML.

```markdown
# Research Direction: <topic human-readable label>

## Confirmed Direction
<1-2 sentences: what the pipeline should focus on. REQUIRED — must be non-empty.>

## Key Angles
- <angle 1>
- <angle 2>
- (up to 4 angles total)

## Scope Exclusions
- <what to skip>
- (if nothing to exclude, write a single line: "(none)")

## Seed Queries
- <specific English search query 1>
- <specific English search query 2>
- (3-5 total; write them in English; make them concrete enough to paste into a search engine)
```

**Rules for each section**:

- `## Confirmed Direction`: must be 1-2 sentences. Must be non-empty. Summarize what the research pipeline should focus on.
- `## Key Angles`: 2-4 bullet points. Each is a distinct lens or sub-topic the pipeline should cover.
- `## Scope Exclusions`: 1+ bullets of what to skip. If the user never mentioned exclusions, write `(none)`.
- `## Seed Queries`: 3-5 English search query strings. These are passed directly to the search agents. Make them specific: include named organizations, regions, year ranges where applicable.

---

## Behavior constraints

- **Do not write discuss.md until convergence is accepted.** A partially-discussed direction must not be saved.
- **Do not write any other files** during the discussion (no sources.md, no analysis.md, no notes).
- **Do not run web searches** during the discussion. This is a scoping conversation, not a research pass.
- **Do not skip the opening questions** (Step 3). Even if the topic seems self-evident, ask the 2 scoping questions — the user's answers sharpen the Seed Queries.
- **Respond in the same language the user uses.** If the user writes in Chinese, respond in Chinese. If in English, in English. The discuss.md file is always written in the format above regardless of conversation language.
- **One question per turn** after the opening. Do not stack multiple follow-up questions in a single reply.
