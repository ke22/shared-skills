# 來源地圖

這個 skill 以使用者提供的研究報告與下列外部來源為基礎。更新方法論或解釋為什麼 failure-driven evolution 需要 eval、contract 與 governance 時，優先使用這些來源。

## Skill 封裝與契約

- Agent Skills documentation: https://learn.microsoft.com/en-us/agent-framework/agents/skills
  - 可攜式 skill 是 instructions、scripts 與 resources 的封裝。
  - Progressive disclosure 讓執行時只載入必要 context。
  - `SKILL.md` 變長時，細節應放到 resources。
- Model Context Protocol tools specification: https://modelcontextprotocol.io/specification/2025-11-25/server/tools
  - Tool 應有名稱、描述、input schema、可選 output schema 與安全考量。
  - 敏感操作應保留 human-in-the-loop。

## 從失敗學習與 trace-based improvement

- Reflexion: https://arxiv.org/abs/2303.11366
  - Language agents 可以用 verbal feedback 與 episodic memory 改善行為，不一定要立刻更新權重。
- OpenAI evaluation best practices: https://developers.openai.com/api/docs/guides/evaluation-best-practices
  - Eval-driven development、production logs、continuous evaluation、task-specific datasets 與 human calibration 是核心實務。
- OpenAI trace grading: https://developers.openai.com/api/docs/guides/trace-grading
  - Trace grading 可評估端到端決策、tool calls 與 reasoning steps，用來定位 agent 成功或失敗的位置。

## Skill 效益與治理

- SkillsBench: https://arxiv.org/abs/2602.12670
  - Curated skills 提升平均 pass rate；self-generated skills 平均沒有幫助。
  - 少量 focused modules 的 skill 勝過 comprehensive documentation。

## 本地來源

- `C:\Users\allan\Downloads\deep-research-report (5).md`
  - 提供 failure-to-skill lifecycle synthesis、taxonomy candidates、治理風險與 SkillOps framing。
