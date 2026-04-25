# Harness CLI

Multi-agent workflow orchestrator CLI that decomposes tasks, generates execution specs for human review, and runs implement/test/verify pipelines via the Claude Code CLI.

## Quick Reference

- **Language:** TypeScript (ESM, strict mode)
- **Runtime:** Node.js 20+
- **Build:** `npx tsup` (bundles to `dist/index.js` with shebang)
- **Type check:** `npx tsc --noEmit`
- **Dev run:** `npm run dev -- <command>` (uses tsx, no build needed)
- **Global binary:** `harness` (via `npm link`)

## Architecture

```
src/
  index.ts            CLI entry point (Commander.js)
  commands/           CLI command handlers — wire UI to engine
  agents/             Agent modules — each calls base.ts + parses response
  prompts/            System prompts — pure text, no execution logic
  engine/             Core logic — DAG executor, pipeline, orchestrator, spec generator
  state/              Types + StateManager (state.json, history.json)
  config/             Zod schema, defaults, cosmiconfig loader
  ui/                 Terminal output — logger, spinners, status, summary, review prompt
  utils/              Helpers — subprocess spawn, JSON parsing, Jira regex, workspace ops
```

Each directory has a `README.md` explaining its responsibility, key patterns, and how to add new modules.

## Key Patterns

### Adding a new agent
1. Create prompt in `src/prompts/<name>.ts` (export system prompt + builder function)
2. Create agent in `src/agents/<name>.ts` (import prompt, call `callAgent()` from `base.ts`, parse response)
3. Add `<name>` to models and timeouts in `src/config/schema.ts` and `src/config/defaults.ts`
4. Wire into a command or the orchestrator

### Adding a new command
1. Create `src/commands/<name>.ts` exporting `registerXCommand(program: Command)`
2. Import and register in `src/index.ts`

### Agent execution model
All agents run as `claude -p <prompt> --model <model> --output-format text` subprocesses via `src/agents/base.ts`. Agents share no memory — they communicate only through the workspace filesystem. The `callAgent()` function handles model selection, timeouts, and MCP config injection.

### Event-driven orchestrator
`src/engine/orchestrator.ts` emits typed `HarnessEvent` objects. The UI layer in `src/commands/run.ts` subscribes to these events. The engine never writes to stdout directly.

### Spec review loop
After planning, the orchestrator generates a markdown spec and pauses for human review. The review handler is injected via `OrchestratorOptions.reviewHandler` — the `run` command passes `interactiveReview()` from `src/ui/review.ts`, but this could be swapped for an API-based reviewer. Use `--auto-approve` to skip.

### Config resolution
cosmiconfig searches: `.harnessrc.json` in cwd → home dir. CLI flags override file config. Zod validates at load time. Access the merged config via `loadConfig()` from `src/config/loader.ts`.

## State files

- `~/.harness/state.json` — live run state (overwritten on phase transitions)
- `~/.harness/history.json` — completed runs (prepended, newest first)
- `<workspace>/.harness/specs/<run-id>.md` — approved execution specs
- `<workspace>/.harness/spec-draft.md` — latest draft spec (overwritten each planning cycle)
- `<workspace>/.harness-research/*.md` — research documents from analyzer/researcher phase

## Commands

| Command | Description |
|---------|-------------|
| `harness run <task>` | Full pipeline: research → plan → review → execute |
| `harness glew-review <prompt...>` | Standalone code review (PR + Jira AC traceability) |
| `harness history [run-id]` | Browse or inspect past runs |
| `harness config [key] [value]` | View/set configuration |
| `harness demo` | Simulated DAG run (no Claude CLI needed) |

## Conventions

- All imports use `.js` extensions (ESM requirement)
- Types live in `src/state/types.ts` — shared across the entire codebase
- Config types come from `src/config/schema.ts` (Zod-inferred)
- Prompt files export either a `const SYSTEM` string or a `buildXSystem()` / `buildXPrompt()` function
- Agent modules are thin: import prompt → call `callAgent()` → parse → return typed data
- Agents that return PASS/FAIL use `parseResult()` from `src/utils/json-parser.ts`
- Agents that return JSON use `extractJson()` from `src/utils/json-parser.ts`
