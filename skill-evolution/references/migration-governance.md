# Migration governance

這份文件定義 rename、deprecate、merge、split 或 retire 這個 skill 前必須具備的證據。

## Rename

- 記錄舊名稱、新名稱、原因、routing compatibility plan、package path 影響、registry 影響，以及已檢查的 references。

## Deprecate

- 記錄 deprecation reason、replacement skill 或 fallback workflow、effective date、removal date、user-facing notice、rollback condition 與 eval impact。

## Merge

- 記錄 source skills、target skill、boundary rationale、trigger conflict resolution、follow-through policy conflict resolution、eval migration 與 wrapper updates。

## Split

- 記錄 original skill、新 target skills、routing boundary、handoff rules、eval redistribution plan 與 compatibility aliases。

## Compatibility

- 檢查 package paths、skill names、aliases、catalog entries、README links、registry entries、wrappers、local references 與 benchmark workspaces。

## Migration Evidence

- 保存 `migration_type`、`from`、`to`、`effective_date`、`compatibility_policy`、`references_checked`、`evals_updated`、`wrappers_updated` 與 `release_gate_result`。
