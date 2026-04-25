# commands/

CLI command handlers. Each file exports a `registerXCommand(program: Command)` function that adds a subcommand to the Commander.js program.

## Files

| File | Command | Description |
|------|---------|-------------|
| `run.ts` | `harness run <task>` | Main workflow — wires orchestrator to UI, handles SIGINT cleanup |
| `glew-review.ts` | `harness glew-review <prompt...>` | Standalone code review — parses PR URL + Jira keys from natural language prompt |
| `history.ts` | `harness history [run-id]` | Reads history.json, formats as table or detail view |
| `config.ts` | `harness config [key] [value]` | Shows/sets config, supports dotted keys, --global flag |
| `demo.ts` | `harness demo` | Simulated DAG execution with forced failure + cascade |

## Pattern

```typescript
export function registerXCommand(program: Command): void {
  program
    .command("x")
    .description("...")
    .argument(...)
    .option(...)
    .action(async (...) => {
      // Load config, resolve workspace, call agents/engine, format output
    });
}
```

Registration happens in `src/index.ts`.

## Adding a new command

1. Create `<name>.ts` here following the pattern above
2. Import and call `registerXCommand(program)` in `src/index.ts`
