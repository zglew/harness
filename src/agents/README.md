# agents/

Agent modules — each one wraps a specific Claude Code CLI agent role.

## Pattern

Every agent module follows the same structure:

1. Import its system prompt from `../prompts/<name>.ts`
2. Import `callAgent()` from `./base.ts`
3. Export an async function that:
   - Builds the prompt using the prompt builder
   - Calls `callAgent()` with the role name, prompt, system prompt, workDir, and config
   - Parses the response (JSON extraction, PASS/FAIL parsing, or raw text)
   - Returns typed data

## Files

| File | Role | Returns |
|------|------|---------|
| `base.ts` | Core `callAgent()` — spawns `claude -p` subprocess | `AgentResult` (output, exitCode, duration) |
| `planner.ts` | Decomposes task into subtasks | `Subtask[]` |
| `implementer.ts` | Writes code for a subtask | `string` (raw output) |
| `tester.ts` | Writes and runs tests | `{ output, passed }` |
| `verifier.ts` | Checks acceptance criteria | `{ output, passed }` |
| `analyzer.ts` | Identifies research topics from workspace | `ResearchTopic[]` |
| `researcher.ts` | Documents a codebase area | `ResearchResult` |
| `jira-context.ts` | Fetches Jira ticket context | `string` (markdown doc) |
| `reviewer.ts` | PR code review with AC traceability | `string` (Glew Review markdown) |

## Adding a new agent

1. Create the prompt in `../prompts/<name>.ts`
2. Create `<name>.ts` here following the pattern above
3. Add the role to `models` and `timeouts` in `../config/schema.ts` and `../config/defaults.ts`
4. Wire it into a command or the orchestrator

## base.ts details

`callAgent()` handles:
- Model selection from config (`config.models[role]`)
- Timeout from config (`config.timeouts[role]`)
- `--dangerously-skip-permissions` flag (configurable)
- MCP config injection for the `jira_context` role
- Error handling (non-zero exit code → thrown Error)

The prompt is assembled as: `systemPrompt + "\n\n---\n\n" + prompt` and passed to `claude -p`.
