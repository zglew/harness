# engine/

Core execution logic — orchestration, DAG execution, subtask pipeline, and spec generation.

## Files

### `orchestrator.ts`
The main entry point for a run. Sequences the high-level phases:
1. Jira context fetching (if ticket keys detected)
2. Research phase (analyzer → parallel researchers)
3. Planning (calls planner agent, may loop with revision feedback)
4. Spec generation + human review gate
5. DAG execution (implement → test → verify per subtask)
6. History persistence

Extends `EventEmitter` and emits typed `HarnessEvent` objects — the UI layer subscribes to these. Never writes to stdout directly.

Key constructor option: `reviewHandler` — an async function `(specPath, revision) => ReviewDecision` that controls the human-in-the-loop review. The `run` command injects `interactiveReview()` from the UI layer; `--auto-approve` skips it.

### `dag.ts`
Generic dependency-aware parallel executor. Operates on any `T extends DagNode` (must have `id` and `dependsOn`).

Algorithm:
1. Block nodes whose deps have failed/blocked
2. Find ready nodes (all deps completed)
3. Execute wave in parallel via `Promise.allSettled`
4. Record results, repeat

Decoupled from agents — receives a `runner: (node) => Promise<boolean>` function.

### `pipeline.ts`
Subtask pipeline: implement → test → verify with retry loop.

For each attempt (up to `config.maxRetries`):
- Run implementer → if error, retry
- Run tester → if FAIL, store error context, retry
- Run verifier → if FAIL, store error context, retry
- If PASS, mark DONE and return true

This is the `runner` function passed to the DAG engine.

### `spec.ts`
Generates human-readable markdown specs from planner output. Handles:
- `generateSpec(subtasks, metadata)` — produces the markdown content
- `saveDraftSpec(content, workDir)` — writes to `.harness/spec-draft.md`
- `saveSpec(content, workDir, runId)` — writes approved spec to `.harness/specs/<runId>.md`
- `readDraftSpec(workDir)` — reads current draft

## Data flow

```
orchestrator.run()
  → runPlanner()          → Subtask[]
  → generateSpec()        → markdown string
  → reviewHandler()       → approve / revise (loops back to planner) / quit
  → executeDag(subtasks, runSubtaskPipeline)
    → for each wave: Promise.allSettled(subtasks.map(pipeline))
  → stateManager.appendHistory()
```
