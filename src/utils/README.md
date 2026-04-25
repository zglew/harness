# utils/

Shared helpers with no business logic. Used across agents, engine, and commands.

## Files

| File | Exports | Used by |
|------|---------|---------|
| `process.ts` | `spawnWithTimeout(cmd, args, { cwd, timeout })` — spawns a child process with a timeout (in seconds), returns `{ stdout, stderr, exitCode, duration }`. Also `killAllActive()` for SIGINT cleanup. | `agents/base.ts`, `commands/run.ts` |
| `json-parser.ts` | `extractJson<T>(response)` — robust JSON extraction from LLM responses (tries full parse, then array/object boundary detection). `parseResult(response)` — scans from bottom for `RESULT: PASS` or `RESULT: FAIL`. | `agents/planner.ts`, `agents/analyzer.ts`, `agents/tester.ts`, `agents/verifier.ts` |
| `jira.ts` | `extractJiraTickets(text)` — regex extraction of Jira ticket keys (e.g., `PROJ-123`) from any string, including full Atlassian URLs. | `engine/orchestrator.ts`, `commands/glew-review.ts` |
| `workspace.ts` | `resolveWorkspace(explicit?)` — resolves workspace from arg, `WORK_DIR` env, or cwd. `validateWorkspace(dir)` — checks existence. `workspaceHasContent(dir)` — checks for non-dot files. `getFileTree(dir)` — runs `find` for file listing. `readReadme(dir)` — reads README if present. | `commands/run.ts`, `agents/analyzer.ts`, `engine/orchestrator.ts` |
