# Harness CLI

A multi-agent workflow orchestrator that takes a natural-language task description and autonomously drives it to completion using a team of specialized Claude AI agents. Built on top of the [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code).

Given a task like _"Build a REST API with input validation and database layer"_, Harness will:

1. **Research** the existing codebase (if any)
2. **Plan** by decomposing the task into subtasks with a dependency graph
3. **Implement** each subtask by writing code
4. **Test** the implementation by writing and running tests
5. **Verify** that acceptance criteria are met

Subtasks run in parallel where dependencies allow, retry up to 3 times on failure, and cascade-block downstream tasks when a dependency fails.

## Prerequisites

- **Node.js 20+**
- **Claude Code CLI** (`claude`) installed and authenticated
- **AWS Bedrock** access with `opus` and `sonnet` model aliases configured

## Installation

```bash
# Clone and install
git clone https://github.com/zglew/harness.git
cd harness
npm install
npm run build

# Link globally so `harness` is available everywhere
npm link
```

## Quick Start

```bash
# Run a task against the current directory
harness run "Build a Python REST API with input validation"

# Run against a specific workspace
harness run "Add authentication middleware" --workspace ~/projects/my-app

# Plan only (see subtasks without executing)
harness run "Refactor the database layer" --dry-run

# Try the demo (no Claude CLI needed)
harness demo
```

## Commands

### `harness run <task>`

The main command. Takes a natural-language task description and executes the full agent pipeline.

```
Options:
  -w, --workspace <path>   Target directory (default: current directory)
  --no-research            Skip the codebase research phase
  --no-jira                Skip Jira context fetching
  --dry-run                Plan only, show subtasks without executing
  --max-retries <n>        Override max retries (default: 3)
  --verbose                Show full agent output
```

### `harness history [run-id]`

Browse past runs or inspect a specific run in detail.

```
Options:
  --json        Output as JSON
  --limit <n>   Show last N runs (default: 20)
```

### `harness config [key] [value]`

View or modify configuration. Supports dotted keys like `models.planner`.

```
Options:
  --global   Edit ~/.harnessrc.json instead of local
  --reset    Reset to defaults
```

```bash
# View all config
harness config

# View a specific key
harness config models.planner

# Change a value
harness config models.implementer sonnet
harness config maxRetries 5

# Set globally (applies to all workspaces)
harness config --global models.verifier opus
```

### `harness demo`

Runs a simulated DAG execution with 5 subtasks and a forced failure on subtask #3 to demonstrate retry logic, cascading blocks, and the terminal UI. No Claude CLI required.

## How It Works

### Agent Roles

Harness uses 7 specialized agent roles, each with its own system prompt and model assignment:

| Role | Model | Purpose |
|------|-------|---------|
| **Planner** | Opus | Decomposes task into subtasks with dependency graph |
| **Implementer** | Sonnet | Writes code to fulfill a subtask |
| **Tester** | Sonnet | Writes and runs tests, reports PASS/FAIL |
| **Verifier** | Opus | Confirms acceptance criteria are met |
| **Analyzer** | Sonnet | Identifies which parts of an existing codebase need research |
| **Researcher** | Opus | Produces deep documentation of a codebase area |
| **Jira Context** | Sonnet | Fetches ticket details, epics, and linked issues from Jira |

Each agent runs as a separate `claude -p` subprocess with no shared state between agents.

### Execution Pipeline

```
                         ┌──────────────────────┐
                         │   Task Description    │
                         └──────────┬───────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
             ┌────────────┐ ┌────────────┐ ┌──────────────┐
             │Jira Context│ │  Analyzer  │ │   (skip if   │
             │ (optional) │ │            │ │ empty workspace)
             └─────┬──────┘ └─────┬──────┘ └──────────────┘
                   │              │
                   │       ┌──────┴──────┐
                   │       ▼             ▼
                   │  ┌──────────┐ ┌──────────┐
                   │  │Researcher│ │Researcher│  ... (parallel)
                   │  └────┬─────┘ └────┬─────┘
                   │       └──────┬─────┘
                   ▼              ▼
              ┌───────────────────────────┐
              │          Planner          │
              │  (receives Jira context   │
              │   + research documents)   │
              └─────────────┬─────────────┘
                            │
                            ▼
              ┌───────────────────────────┐
              │    DAG Execution Engine    │
              │                           │
              │  For each subtask wave:   │
              │  ┌─────────────────────┐  │
              │  │    Implementer      │  │
              │  │         │           │  │
              │  │         ▼           │  │
              │  │      Tester         │  │
              │  │     /      \        │  │
              │  │   PASS    FAIL──┐   │  │
              │  │    │       (retry)   │  │
              │  │    ▼            │   │  │
              │  │  Verifier       │   │  │
              │  │   /      \      │   │  │
              │  │ PASS    FAIL────┘   │  │
              │  │   │                 │  │
              │  │  DONE              │  │
              │  └─────────────────────┘  │
              └───────────────────────────┘
```

### DAG Execution

The Planner outputs subtasks with a `depends_on` field, forming a directed acyclic graph. The DAG engine:

1. Finds all subtasks whose dependencies are satisfied
2. Launches them in parallel as a "wave"
3. Waits for the wave to complete
4. Marks failed subtasks and cascades BLOCKED to their dependents
5. Repeats until no more subtasks can run

### Retry Logic

Each subtask gets up to 3 attempts (configurable). On failure:
- The error context from the tester or verifier is fed back to the implementer
- The implementer uses this feedback to fix the code on the next attempt
- If all retries exhaust, the subtask is marked FAILED and downstream dependents are BLOCKED

### Research Phase

When the workspace contains existing code, Harness runs a research phase before planning:

1. **Analyzer** scans the file tree and identifies relevant areas to research
2. **Researcher** agents run in parallel, each producing a markdown document about one area
3. The combined research is passed to the Planner so it can reference specific files, functions, and patterns

Research documents are saved to `.harness-research/` in the workspace.

### Jira Integration

If the task description contains Jira ticket keys (e.g., `PROJ-123`), Harness automatically:

1. Detects the ticket keys via regex
2. Runs a Jira Context agent that fetches the ticket, parent epic, linked issues, and subtasks via Atlassian MCP tools
3. Passes the compiled requirements to the Planner and research phase

Requires Atlassian MCP tools to be configured. Set the MCP config path:

```bash
harness config claude.mcpConfig /path/to/mcp-config.json
```

## Configuration

Harness uses [cosmiconfig](https://github.com/cosmiconfig/cosmiconfig) for configuration discovery. It searches for:

- `.harnessrc.json` in the workspace directory (project-level)
- `.harnessrc.json` in your home directory (user-level)
- `harness.config.js` or `.harnessrc.yaml`

**Precedence** (lowest to highest): built-in defaults < `~/.harnessrc.json` < `./.harnessrc.json` < CLI flags

### Default Configuration

```json
{
  "models": {
    "analyzer": "sonnet",
    "researcher": "opus",
    "jira_context": "sonnet",
    "planner": "opus",
    "implementer": "sonnet",
    "tester": "sonnet",
    "verifier": "opus"
  },
  "timeouts": {
    "analyzer": 120,
    "researcher": 600,
    "jira_context": 180,
    "planner": 300,
    "implementer": 300,
    "tester": 600,
    "verifier": 600
  },
  "maxRetries": 3,
  "stateDir": "~/.harness",
  "claude": {
    "dangerouslySkipPermissions": true
  }
}
```

### Model Configuration

Opus is used for reasoning-heavy roles (planning, verification, research) and Sonnet for speed-sensitive roles (implementation, testing). Override per-role:

```bash
harness config models.planner opus
harness config models.implementer sonnet
```

### Timeouts

Timeouts are in seconds. Research and testing get longer defaults since they involve reading/running code:

```bash
harness config timeouts.researcher 900
harness config timeouts.tester 600
```

## State & History

All state is stored in `~/.harness/` (configurable via `stateDir`):

- **`state.json`** — Live state of the current run, updated on every phase transition
- **`history.json`** — Array of completed runs (newest first), with full subtask details and agent outputs

## Project Structure

```
src/
  index.ts                  CLI entry point (Commander setup)

  commands/
    run.ts                  `harness run` — main workflow command
    history.ts              `harness history` — browse past runs
    config.ts               `harness config` — view/set configuration
    demo.ts                 `harness demo` — simulated DAG execution

  agents/
    base.ts                 callAgent() — spawns `claude -p` as subprocess
    planner.ts              Task decomposition, JSON response parsing
    implementer.ts          Code generation for a subtask
    tester.ts               Test writing/execution, PASS/FAIL parsing
    verifier.ts             Acceptance criteria verification, PASS/FAIL parsing
    analyzer.ts             Codebase topic identification for research
    researcher.ts           Deep codebase area documentation
    jira-context.ts         Jira ticket context gathering

  prompts/
    planner.ts              Planner system prompt + user prompt builder
    implementer.ts          Implementer system prompt builder (subtask + workdir)
    tester.ts               Tester system prompt builder
    verifier.ts             Verifier system prompt builder
    analyzer.ts             Analyzer system prompt + user prompt builder
    researcher.ts           Researcher system prompt builder (topic + workdir)
    jira-context.ts         Jira context system prompt

  engine/
    dag.ts                  Generic DAG executor (dependency-aware parallel waves)
    pipeline.ts             Subtask pipeline (implement -> test -> verify + retries)
    orchestrator.ts         Top-level flow (jira -> research -> plan -> execute)

  state/
    types.ts                TypeScript interfaces and enums
    manager.ts              StateManager (reads/writes state.json + history.json)

  config/
    schema.ts               Zod validation schema for .harnessrc.json
    defaults.ts             Default configuration values
    loader.ts               cosmiconfig discovery + CLI flag merging

  ui/
    logger.ts               Timestamped, colored log output + buffer
    spinner.ts              Ora spinner wrappers for agent calls
    status.ts               Subtask status table display
    summary.ts              Final results table (cli-table3)

  utils/
    jira.ts                 Jira ticket key regex extraction
    json-parser.ts          Robust JSON extraction from LLM responses
    workspace.ts            Workspace validation, file tree, README reading
    process.ts              Child process spawn with timeout + cleanup
```

### Architecture Principles

- **Separation of concerns** — Agents know nothing about UI. The engine knows nothing about terminal output. The orchestrator emits events; the UI subscribes.
- **Prompts are data** — Each agent's system prompt lives in its own file under `prompts/`, separate from execution logic. Static prompts are exported as constants; dynamic prompts as builder functions.
- **Generic DAG engine** — `executeDag<T>()` accepts any node type with an `id` and `dependsOn` field, plus a runner function. It's testable without spawning real agents.
- **Config validation at load time** — Zod schemas catch bad config before any agents run.

## Development

```bash
# Run from source (no build step)
npm run dev -- run "your task" --workspace /tmp/test

# Type check
npm run lint

# Build
npm run build

# Run tests
npm test
```
