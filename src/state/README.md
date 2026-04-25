# state/

TypeScript types and state persistence.

## Files

### `types.ts`
All shared types for the project. This is the single source of truth for data shapes:

- **Enums:** `Phase` (analyzing, researching, planning, implementing, testing, verifying, done, failed, blocked)
- **Core types:** `Subtask`, `ResearchTopic`, `ResearchResult`
- **State types:** `RunState`, `RunSummary`, `JiraContextState` — shape of `state.json`
- **History types:** `RunRecord`, `SubtaskRecord` — shape of `history.json` entries
- **Engine types:** `DagNode`, `DagResult` — used by `engine/dag.ts`
- **Event types:** `HarnessEvent` — discriminated union emitted by the orchestrator
- **Review types:** `ReviewDecision` — approve / revise / quit

### `manager.ts`
`StateManager` class that reads/writes JSON state files:

- `writeState(state)` — writes `state.json` (sync, to avoid race conditions from parallel agents)
- `readState()` — reads `state.json`
- `clearState()` — removes `state.json`
- `appendHistory(record)` — prepends to `history.json`
- `getHistory()` — reads `history.json`
- `getRunById(id)` — finds a specific run in history

State directory defaults to `~/.harness/` (configurable via `stateDir` in config). Created automatically on first use.
