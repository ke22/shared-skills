# Translation Registry v0.2

This registry is the source of truth for terminology in the
`zh-tw-en-research-presentation` skill.

Status:
- `LOCKED`: canonical translation
- `FUNCTIONAL`: canonical functional translation; no institutional-equivalence claim
- `RESEARCH_DEFINED`: project-defined label anchored in literature
- `CONTEXT_REQUIRED`: resolve only after inspecting actual mechanism / actor / authority

| Chinese | Preferred English | Status | Notes |
|---|---|---|---|
| 家庭照顧者 | family carer | LOCKED | Default for Australian iSupport audience; preserve `caregiver` when referring to studies using that term |
| 以人為中心照護 | person-centred care | LOCKED | Do not use `human-centered care` in dementia-care discourse |
| 失智症 | dementia | LOCKED | |
| 阿茲海默症及相關失智症 | Alzheimer’s disease and related dementias (ADRD) | LOCKED | Use ADRD when the source uses the broader construct |
| 追問 | clarifying questions | LOCKED | Preferred over generic `prompt` |
| 針對性追問 | targeted follow-up questions | LOCKED | |
| 迭代式釐清 | iterative clarification | LOCKED | |
| 具體／易執行建議 | actionable guidance / actionable recommendations | LOCKED | `specific and actionable recommendations` when specificity is central |
| 個人化支持 | personalised support | LOCKED | Australian spelling |
| 符合情境的資訊 | contextually relevant information | LOCKED | |
| 同理支持 | empathy and support | LOCKED | Do not equate with validation |
| 回應照顧者情緒 | acknowledge the carer’s feelings | LOCKED | Use when the actual behavior is acknowledgement |
| 現實導向 | reality orientation (RO) | LOCKED | Term locked; do not infer recommendation status |
| 不正面糾正／爭辯 | avoiding correction and argument / non-confrontational communication | LOCKED | Select by sentence function |
| BPSD | behavioural and psychological symptoms of dementia (BPSD) | LOCKED | Clinical/research discourse |
| 行為改變 | behaviour changes | LOCKED | Carer-facing / iSupport discourse |
| AI 幻覺降低／防範 | hallucination mitigation | LOCKED | Prefer over `hallucination prevention` |
| 去識別化資料 | de-identified data | LOCKED | |
| 自我效能 | self-efficacy | LOCKED | Only when source truly refers to that construct |
| 專家評測 | expert evaluation | LOCKED | |
| 場域 Pilot | field pilot | LOCKED | |
| 場域評估 | field evaluation | LOCKED | |
| 升級處理 | escalation | LOCKED | |
| 升級處理路徑 | escalation pathway | LOCKED | |
| 風險分流 | risk triage | LOCKED | |
| 轉介機制／路徑 | referral mechanism / referral pathway / referral protocol | CONTEXT_REQUIRED | Choose based on actual workflow |
| 專業審核 | expert review / professional review | CONTEXT_REQUIRED | Depends on reviewer identity |
| 臨床審核 | clinical review | CONTEXT_REQUIRED | Only when performed by qualified clinical professionals |
| human-in-the-loop | human-in-the-loop | CONTEXT_REQUIRED | Generic human review |
| clinician-in-the-loop | clinician-in-the-loop | CONTEXT_REQUIRED | Only when qualified clinician has meaningful review / override / escalation role |
| 居服員／照顧服務員 | home care worker | FUNCTIONAL | Taiwan LTC role; not asserted equivalent to Australian role |
| 居家服務督導員／居督 | home care supervisor | FUNCTIONAL | Taiwan LTC role |
| A 單位個管師 | case manager (Taiwan LTC A-unit) | FUNCTIONAL | Prefer over Australian `care manager` |
| 附和同理 | — | CONTEXT_REQUIRED | Split into validation / empathy / acknowledgement / reassurance / agreement as appropriate |
| validation | validation / validating communication | CONTEXT_REQUIRED | Never translate as factual agreement |
| 安撫／安心 | reassurance | CONTEXT_REQUIRED | Use only if source is providing safety / emotional reassurance |
| 轉移注意 | redirection | LOCKED | When actual strategy is redirecting attention/action |
| BUS-15 | 15-item Bot Usability Scale (BUS-15) | LOCKED | Official instrument name |
| Q4TE | Questionnaire for Professional Training Evaluation (Q4TE) | LOCKED | Official instrument name |
| NPS | Net Promoter Score (NPS) | LOCKED | |
| 幻視 | visual hallucinations | LOCKED | Clinical term |
| 譫妄 | delirium | LOCKED | Clinical term |
| 泌尿道感染 | urinary tract infection | LOCKED | Clinical term |

## Research-defined constructs (`RESEARCH_DEFINED`)

Project-defined constructs and their definitions are unpublished and are kept in the private registry
`references/private/project-constructs.md` (gitignored). Rows there use the same columns and the
`RESEARCH_DEFINED` status. See SKILL.md "Research-defined constructs" for the rules.

## Dementia communication distinctions

Do not merge:

- reality orientation
- validation / validating communication
- empathic response
- reassurance
- avoiding correction and argument
- redirection

`Validation ≠ empathy ≠ factual agreement ≠ reality orientation`.
