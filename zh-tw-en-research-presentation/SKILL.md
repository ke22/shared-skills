---
name: zh-tw-en-research-presentation
description: >
  Translate or incrementally update Traditional Chinese research presentations and PPTX
  decks into professional English for international academic, clinical, and HCI audiences.
  Use for slide copy, diagrams, charts, revision-to-revision deck migration, and layout-safe
  delivery, with safeguards for dementia care, Taiwan long-term care roles, generative AI,
  research constructs, evidence strength, and presentation readability.
metadata:
  short-description: Translate and update zh-TW research slides
---

# zh-TW → EN Research Presentation Translation

## Purpose

Use this skill for Traditional Chinese → English translation of research slides, project decks,
research summaries, figure labels, system diagrams, and presentation scripts involving:

- dementia care / long-term care
- HCI / service design / human-centered AI
- conversational AI / generative AI systems
- Taiwan LTC institutional roles
- field pilots, expert evaluation, research scales, and quantitative results

Primary target audience for this configuration:
**Australian iSupport / dementia-care researchers, clinicians, and digital-health researchers.**

This is a **high-stakes cross-disciplinary translation task**.

Quality priority:

1. Clinical and conceptual accuracy
2. Claim / evidence fidelity
3. Terminology consistency
4. Institutional-role clarity
5. Audience alignment
6. Presentation readability

Never improve fluency by changing the source claim.

---

## Required references

Before translating domain-specific content, consult:

- `references/translation_registry.md`
- `references/qa_checklist.md`

For calibration examples, consult:

- `references/examples.md`

When editing a PPTX file or updating a new Chinese deck against an earlier English deck, also consult:

- `references/pptx_incremental_update.md`

The registry has four term states:

- `LOCKED`: use the canonical translation.
- `FUNCTIONAL`: use the canonical functional translation while preserving Taiwan-specific institutional identity.
- `RESEARCH_DEFINED`: use the project label consistently, but do not present it as an established external construct.
- `CONTEXT_REQUIRED`: inspect context; do not infer a clinical, professional, or governance status.

---

# Workflow

## Step 1 — Classify the source segment

Assign one or more domains:

- `CLINICAL_DEMENTIA`
- `CAREGIVER_COMMUNICATION`
- `TAIWAN_LTC_ROLE`
- `HCI_AI`
- `RESEARCH_CONSTRUCT`
- `METHODS_MEASUREMENT`
- `SYSTEM_GOVERNANCE`
- `PRESENTATION_COPY`

If a sentence crosses domains, preserve the terminology rules of the highest-risk domain.

Risk priority:

`CLINICAL_DEMENTIA`
→ `SYSTEM_GOVERNANCE`
→ `METHODS_MEASUREMENT`
→ `TAIWAN_LTC_ROLE`
→ `RESEARCH_CONSTRUCT`
→ `HCI_AI`
→ `PRESENTATION_COPY`

---

## Step 2 — Detect protected meaning

Before translating, identify source elements that must not drift:

- actor / subject
- recipient / target
- time
- quantity
- negation
- comparison
- causal relation
- certainty / uncertainty
- recommendation strength
- risk level
- measurement name
- sample size
- before/after values
- institutional role
- research construct
- clinical term

If Chinese omits a subject, tense, singular/plural, causal link, or actor, **do not invent one unless required by English grammar**.
When English requires a choice, use the least committal phrasing compatible with the source.

---

## Step 3 — Resolve terminology

Check the registry.

### LOCKED
Use the canonical label unless quoting an external source that uses another term.

### FUNCTIONAL
Use the functional English label, but do not imply one-to-one equivalence with an Australian institutional role.

For first use, add a short explanation only when needed for comprehension.

Example:
`home care worker (a formal frontline care role in Taiwan's LTC system)`

### RESEARCH_DEFINED
Use the project label consistently.
Do not describe it as an established clinical or HCI construct unless the source explicitly does so.

### CONTEXT_REQUIRED
Do not resolve by nearest-English-term guessing.
Inspect who performs the action, their qualifications, and what authority they have.

---

## Step 4 — Translate faithfully

Translate the source meaning before polishing.

### Never add unsupported claims

Do not upgrade:

- `可能 / 有望` → `will`
- `有助於` → `causes`
- `顯示` → `proves`
- `初步結果` → `evidence of effectiveness`
- `期待` → `demonstrated effectiveness`
- `改善` → `significantly improved` unless statistical significance is explicitly reported

### Preserve evidence strength

Prefer:

- `may`
- `suggests`
- `participants reported`
- `initial field feedback indicates`
- `was associated with`
- `increased from X to Y`

when those match the source.

---

## Step 5 — Apply audience conventions

Default to Australian / British spelling when writing original prose for this audience:

- personalised
- behaviour
- organisation
- person-centred

Do not alter:

- official scale names
- paper titles
- product names
- quoted terminology
- source-specific US spelling when referring directly to a cited construct

For the Australian iSupport audience, prefer `family carer` in original project prose.
Preserve `caregiver` when naming or describing studies that use that term.

---

## Step 6 — Presentation pass

Only after semantic QA, make the English concise and slide-friendly.

Allowed:
- remove redundant Chinese-style nominalisation
- shorten repeated framing
- convert noun-heavy phrases into clear verbs
- split long sentences
- make headings parallel
- replace literal but awkward English with idiomatic academic/presentation English

Not allowed:
- add mechanisms
- add causal claims
- strengthen outcomes
- remove qualifying conditions
- merge distinct constructs
- replace a Taiwan role with an assumed Australian equivalent

Label substantial rewriting internally as `CONTROLLED_REFORMULATION`.

### PPTX update mode

When both a revised Chinese deck and an earlier English deck are available:

- Treat the revised Chinese deck as the authority for content, structure, and current layout.
- Treat the earlier English deck as translation memory and a reusable-element source, not as source truth.
- Read `references/pptx_incremental_update.md` before modifying the deck.
- Prefer an incremental update when the decks can be mapped reliably; rebuild only when the reference explains why migration is unsafe or inefficient.

---

# Domain rules

## Dementia care / clinical language

Clinical terms have low translation freedom.

Examples:

- 幻視 → `visual hallucinations`
- 譫妄 → `delirium`
- 泌尿道感染 → `urinary tract infection`
- BPSD → `behavioural and psychological symptoms of dementia (BPSD)`

Do not replace clinical terms with casual paraphrases in professional slides.
If accessibility is needed, retain the clinical term and add a brief explanation.

### BPSD vs behaviour changes

Use `BPSD` for clinical/research classification.

Use `behaviour changes` for carer-facing / iSupport-style communication when the source is not explicitly making a clinical classification.

Do not mechanically treat them as synonyms.

---

## Dementia communication strategies

Keep these concepts distinct:

- `reality orientation`
- `validation / validating communication`
- `empathic response`
- `reassurance`
- `avoiding correction and argument`
- `redirection`

Never translate validation as factual agreement.

Never collapse:
`validation = empathy = agreement = reality orientation`.

If the Chinese phrase `附和同理` appears, do not map it to a single locked term.
Resolve what the interaction actually does.

---

## Clarifying-question mechanism

Default mappings:

- 追問 → `clarifying questions`
- 針對性追問 → `targeted follow-up questions`
- 迭代式釐清 → `iterative clarification`

Use `probing` only when the source truly means deeper exploratory probing rather than clarification.

Clarifying questions should preserve the intended mechanism:
context-aware, intent-specific, user-friendly, neutral, and non-leading.

---

## Actionability

Preferred:

- `actionable guidance`
- `actionable recommendations`
- `specific and actionable recommendations`

Avoid literal phrasing such as:
- `easy-to-execute advice`
- `easy-to-follow suggestions`
unless the source specifically evaluates ease of execution.

---

## Taiwan LTC roles

Default functional labels:

- 居服員 / 照顧服務員 → `home care worker`
- 居家服務督導員 / 居督 → `home care supervisor`
- A 單位個管師 → `case manager (Taiwan LTC A-unit)`

Do not silently replace them with Australian roles.

---

## AI safety and governance

Preferred distinctions:

- AI 幻覺降低 / 防範 → `hallucination mitigation`
- 風險分流 → `risk triage`
- 升級處理 → `escalation`
- 升級處理路徑 → `escalation pathway`
- 轉介路徑 → `referral pathway`
- 專業審核 → `expert review` or `professional review`, depending on actor
- 臨床審核 → `clinical review` only if performed by qualified clinical professionals

### Human-in-the-loop terminology

Do not automatically translate 專業審核 as `clinician-in-the-loop`.

Use:
- `human-in-the-loop` for generic human review
- `professional oversight` for qualified non-clinical professional governance
- `clinician-in-the-loop` only when a clinician actually reviews / overrides / escalates at the relevant decision point

If authority is unclear, flag:
`GOVERNANCE_ROLE_UNCLEAR`.

---

# Research-defined constructs

Project-defined constructs (labels a research team coined for its own study) are unpublished, so they live in a private registry: `references/private/project-constructs.md` (gitignored, not in the public repo). If that file exists, load it and use its labels consistently.

Rules for any project-defined construct:

- Use the registry label consistently, but never present it as an established external construct, a standard clinical term, or a validated scale or trait.
- When first introduced in academic prose, give a descriptive definition before or alongside the label.
- Do not equate it with a related published construct (for example, a project "information gap" is not automatically the KTA `know-do gap`) unless the source says so.
- If the private registry is missing, or a term reads like a project construct but has no entry, do not invent a label: flag `RESEARCH_CONSTRUCT_UNDEFINED` and ask.

---

# Methods and measurement

Protected official names:

- `15-item Bot Usability Scale (BUS-15)`
- `Questionnaire for Professional Training Evaluation (Q4TE)`
- `Net Promoter Score (NPS)`

Do not infer a scale from a nearby chart label.

If slide body text and figure labels conflict, emit:
`SOURCE_INCONSISTENCY`

Do not silently fix the source.

Example:
- body: `SUS`
- chart: `BUS-15`

Output a warning and request human verification.

### Quantitative claims

Always preserve:

- N / n
- study stage
- comparison condition
- before/after values
- scale name
- statistical test
- significance status

Example:

Source:
`照顧服務信心度從 4.20 提升至 4.80`（illustrative values）

Allowed:
`Mean care confidence increased from 4.20 to 4.80.`

Not allowed:
`The intervention significantly improved self-efficacy.`

---

# Ambiguity and inconsistency gates

Flag instead of guessing when:

- a research construct has no defined English label
- a Taiwan role has unclear responsibilities
- `clinical`, `professional`, and `expert` are being used interchangeably
- a figure conflicts with body text
- a scale name is uncertain
- a clinical strategy could mean two different concepts
- a causal relation is not explicit
- a translation would require inventing subject, actor, or authority

Use one of:

- `TERM_UNRESOLVED`
- `CONSTRUCT_UNRESOLVED`
- `ROLE_EQUIVALENCE_RISK`
- `SOURCE_INCONSISTENCY`
- `CLAIM_STRENGTH_RISK`
- `CLINICAL_MEANING_RISK`
- `GOVERNANCE_ROLE_UNCLEAR`

---

# Output modes

## Mode A — TRANSLATE

Return:

1. Final English
2. Optional brief terminology note only when a non-obvious term was resolved

Do not expose internal reasoning.

## Mode B — TRANSLATE + QA

Return:

1. Final English
2. QA findings grouped by:
   - terminology
   - addition / omission
   - claim strength
   - construct drift
   - role equivalence
   - clinical meaning
   - source inconsistency
3. unresolved items requiring human confirmation

## Mode C — REVIEW EXISTING ENGLISH

Given Chinese source + existing English:

1. classify each issue
2. mark severity: `critical / major / minor`
3. propose corrected English
4. explain only the minimum needed to justify the change

## Mode D — UPDATE EXISTING PPTX

Given a revised Chinese deck and an earlier English deck:

1. compare the two revisions before translating
2. reuse validated English and editable elements where their source meaning is unchanged
3. translate and rebuild only changed, new, or incompatible content
4. preserve a consistent semantic typography system without per-text-box shrinking
5. return the updated deck plus source inconsistencies or unresolved items requiring human confirmation

---

# Final QA

Before returning final English, run the checklist in `references/qa_checklist.md`.

A translation fails QA if it is fluent but changes:
- who did what
- how certain the claim is
- what role someone holds
- what construct is being discussed
- what clinical concept is named
- what the data actually show
