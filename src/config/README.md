# config/

Configuration schema, defaults, and loading.

## Files

### `schema.ts`
Zod schema (`HarnessConfigSchema`) that validates `.harnessrc.json` at load time. Also exports the inferred `HarnessConfig` type used throughout the codebase.

Config shape:
- `models` — model alias per agent role (e.g., `"opus"`, `"sonnet"`)
- `timeouts` — seconds per agent role
- `maxRetries` — retry limit for subtask pipeline (1-10)
- `defaultWorkspace` — optional default workspace path
- `stateDir` — where state.json/history.json live (default: `~/.harness`)
- `claude.dangerouslySkipPermissions` — pass `--dangerously-skip-permissions` to claude CLI
- `claude.mcpConfig` — path to MCP config file (used by jira_context and reviewer agents)

When adding a new agent role, add it to both `models` and `timeouts` objects here with a `.default()` value.

### `defaults.ts`
Hardcoded `DEFAULT_CONFIG` object — the fallback when no `.harnessrc.json` exists. Should mirror the Zod defaults in `schema.ts`.

### `loader.ts`
Uses cosmiconfig to discover config files. Search order:
1. Explicit `--config` path (if provided)
2. `.harnessrc.json` / `.harnessrc.yaml` / `harness.config.js` in cwd, walking up
3. Same search in home directory

Exports:
- `loadConfig(options?)` — returns a fully validated `HarnessConfig`
- `resolveStateDir(stateDir)` — expands `~` to home directory
