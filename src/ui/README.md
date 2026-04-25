# ui/

Terminal output — everything that writes to stdout. The engine layer never imports from here; only command handlers do.

## Files

| File | Purpose |
|------|---------|
| `logger.ts` | `Logger` class — timestamped, colored log lines. Maintains an in-memory buffer (last 100 lines) for state.json. Has a `verbose` mode for debug output. |
| `spinner.ts` | Ora spinner wrappers — `startSpinner()`, `stopSpinner()`, `withSpinner()`. Only one spinner active at a time. |
| `status.ts` | `printStatus(subtasks)` — renders the subtask phase table with color-coded status. `printHeader(task, workDir)` — prints the run header. |
| `summary.ts` | `printSummary(subtasks, startTime)` — final results table using cli-table3 with done/failed/blocked counts and elapsed time. |
| `review.ts` | `interactiveReview(specPath, revision)` — the human-in-the-loop review prompt. Shows spec preview table, then prompts approve/revise/quit. Returns a `ReviewDecision`. Uses readline for input. |

## Dependencies

- `chalk` — colors
- `ora` — spinners
- `cli-table3` — ASCII tables
- `readline` — stdin prompting (Node.js built-in)
