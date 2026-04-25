# prompts/

System prompts and user prompt builders for each agent role. Pure text — no execution logic.

## Pattern

Each file exports one or both of:

- **Static system prompt** — `export const ROLE_SYSTEM = \`...\`` for agents with fixed instructions
- **Builder function** — `export function buildRoleSystem(context): string` for agents that need runtime values injected (subtask details, workspace path, etc.)
- **Prompt builder** — `export function buildRolePrompt(options): string` for constructing the user-side prompt with optional context sections

## Files

| File | Exports |
|------|---------|
| `planner.ts` | `PLANNER_SYSTEM`, `buildPlannerPrompt(task, { researchContext?, jiraContext?, previousSpec?, revisionFeedback? })` |
| `implementer.ts` | `buildImplementerSystem(subtask, workDir)`, `buildImplementerPrompt(subtask, errorContext?)` |
| `tester.ts` | `buildTesterSystem(subtask, workDir)`, `buildTesterPrompt(subtask, errorContext?)` |
| `verifier.ts` | `buildVerifierSystem(subtask, workDir)`, `buildVerifierPrompt(subtask, errorContext?)` |
| `analyzer.ts` | `ANALYZER_SYSTEM`, `buildAnalyzerPrompt(task, fileTree, readme, jiraContext?)` |
| `researcher.ts` | `buildResearcherSystem(topic, workDir)`, `buildResearcherPrompt(topic)` |
| `jira-context.ts` | `JIRA_CONTEXT_SYSTEM`, `buildJiraContextPrompt(ticketKeys)` |
| `reviewer.ts` | `REVIEWER_SYSTEM`, `buildReviewerPrompt({ prUrl, ticketKeys?, extraContext? })` |

## Conventions

- Prompts that require PASS/FAIL output include: `"IMPORTANT: At the very end of your response, you MUST include exactly one of these lines: RESULT: PASS / RESULT: FAIL"`
- Prompts that require JSON output include: `"IMPORTANT: You must respond with ONLY valid JSON — no markdown, no explanation, no code fences."`
- The planner prompt supports revision cycles via `previousSpec` + `revisionFeedback` parameters
- Error context from retries is appended as `"PREVIOUS ATTEMPT FAILED. Error context: ..."` by the prompt builders, not by the caller

## Adding a new prompt

1. Create `<name>.ts` exporting the system prompt and any builder functions
2. The corresponding agent in `../agents/<name>.ts` imports from here
