import type { Command } from "commander";
import chalk from "chalk";
import { Phase, type Subtask } from "../state/types.js";
import { loadConfig } from "../config/loader.js";
import { StateManager } from "../state/manager.js";
import { printStatus } from "../ui/status.js";
import { printSummary } from "../ui/summary.js";

const DEMO_SUBTASKS: Subtask[] = [
  {
    id: "1",
    title: "Create data model",
    description: "Define the core data model classes",
    acceptanceCriteria: "Data model classes exist with required fields",
    phase: Phase.PLANNING,
    attempt: 0,
    errorContext: null,
    agentOutputs: {},
    dependsOn: [],
  },
  {
    id: "2",
    title: "Build database layer",
    description: "Implement connection pooling and schema init",
    acceptanceCriteria: "DB layer connects and creates schema",
    phase: Phase.PLANNING,
    attempt: 0,
    errorContext: null,
    agentOutputs: {},
    dependsOn: ["1"],
  },
  {
    id: "3",
    title: "Implement REST API",
    description: "Create Flask endpoints for CRUD operations",
    acceptanceCriteria: "All endpoints return correct responses",
    phase: Phase.PLANNING,
    attempt: 0,
    errorContext: null,
    agentOutputs: {},
    dependsOn: ["1"],
  },
  {
    id: "4",
    title: "Add input validation",
    description: "Validate and sanitize all request inputs",
    acceptanceCriteria: "Invalid inputs return 400 errors",
    phase: Phase.PLANNING,
    attempt: 0,
    errorContext: null,
    agentOutputs: {},
    dependsOn: ["3"],
  },
  {
    id: "5",
    title: "Integration test suite",
    description: "End-to-end tests against running application",
    acceptanceCriteria: "All integration tests pass",
    phase: Phase.PLANNING,
    attempt: 0,
    errorContext: null,
    agentOutputs: {},
    dependsOn: ["2", "3", "4"],
  },
];

const TASK_DESCRIPTION =
  "Build a Python microservice with REST API, database layer, and input validation";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function timestamp(): string {
  return new Date().toLocaleTimeString("en-US", { hour12: false });
}

function log(msg: string): void {
  console.log(`  [${timestamp()}] ${msg}`);
}

async function simulatePass(subtask: Subtask): Promise<void> {
  subtask.attempt = 1;

  subtask.phase = Phase.IMPLEMENTING;
  log(`[${subtask.id}] IMPLEMENTING: ${subtask.title}`);
  await sleep(2000);
  subtask.agentOutputs.implementer = `Created implementation for ${subtask.title}.\nAll files written successfully.`;
  log(`[${subtask.id}] Implementation complete`);

  subtask.phase = Phase.TESTING;
  log(`[${subtask.id}] TESTING: ${subtask.title}`);
  await sleep(2000);
  subtask.agentOutputs.tester = `Running tests for ${subtask.title}...\n\ntest_basic ... ok\ntest_edge_case ... ok\n\n------\nRan 2 tests in 0.3s\n\nOK\n\nRESULT: PASS`;
  log(`[${subtask.id}] Tests ${chalk.green("PASSED")}`);

  subtask.phase = Phase.VERIFYING;
  log(`[${subtask.id}] VERIFYING: ${subtask.title}`);
  await sleep(2000);
  subtask.agentOutputs.verifier = `Verifying ${subtask.title}...\n\nChecking acceptance criteria:\n- All criteria met: YES\n\nRESULT: PASS`;
  log(`[${subtask.id}] Verification ${chalk.green("PASSED")}`);

  subtask.phase = Phase.DONE;
  log(`[${subtask.id}] ${chalk.green("DONE")}`);
}

async function simulateFail(subtask: Subtask, maxRetries: number): Promise<void> {
  const errors: Record<number, string> = {
    1: "ConnectionRefusedError: [Errno 61] Connection refused\n\nThe test tried to start the Flask app but the database connection failed.\n\nRESULT: FAIL",
    2: "psycopg2.OperationalError: could not connect to server\n\nAll 3 connection attempts timed out.\n\nRESULT: FAIL",
    3: "ERROR: Database health check failed\nExpected: {'status': 'ok'}\nGot: {'status': 'error', 'detail': 'connection refused'}\n\nRESULT: FAIL",
  };

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    subtask.attempt = attempt;

    subtask.phase = Phase.IMPLEMENTING;
    log(`[${subtask.id}] IMPLEMENTING: ${subtask.title} (attempt ${attempt}/${maxRetries})`);
    await sleep(2000);
    subtask.agentOutputs.implementer = `Attempt ${attempt}: Implementing REST API endpoints...${attempt > 1 ? "\nFixed import error from previous attempt." : ""}`;
    log(`[${subtask.id}] Implementation complete (attempt ${attempt})`);

    subtask.phase = Phase.TESTING;
    log(`[${subtask.id}] TESTING: ${subtask.title}`);
    await sleep(2500);
    subtask.agentOutputs.tester = errors[attempt] ?? errors[3];
    log(`[${subtask.id}] Tests ${chalk.red("FAILED")} (attempt ${attempt}/${maxRetries})`);
  }

  subtask.phase = Phase.FAILED;
  log(`[${subtask.id}] ${chalk.red(`FAILED after ${maxRetries} attempts`)}`);
}

export function registerDemoCommand(program: Command): void {
  program
    .command("demo")
    .description("Run a simulated DAG execution with a forced failure")
    .action(async () => {
      const config = await loadConfig();
      const startTime = Date.now();

      const subtasks = DEMO_SUBTASKS.map((st) => ({ ...st, agentOutputs: {} }));

      const width = 60;
      console.log("\n" + "=".repeat(width));
      console.log("  DEMO MODE — Multi-Agent Workflow Harness");
      console.log("=".repeat(width) + "\n");

      log(`Task: ${TASK_DESCRIPTION}`);
      log("DEMO MODE — Simulating DAG execution with forced failure on subtask #3");
      await sleep(1000);

      log("PHASE 1: PLANNING");
      await sleep(1500);

      for (const st of subtasks) {
        const deps = st.dependsOn.length > 0
          ? ` (depends on: #${st.dependsOn.join(", #")})`
          : " (independent)";
        log(`  [${st.id}] ${st.title}${deps}`);
      }
      await sleep(1000);

      log("PHASE 2-4: DAG EXECUTION");

      // Wave 1: #1
      log("Launching 1 subtask(s) in parallel:\n  [1] Create data model (no dependencies)");
      await simulatePass(subtasks[0]);
      printStatus(subtasks);
      await sleep(500);

      // Wave 2: #2 and #3
      log("Launching 2 subtask(s) in parallel:\n  [2] Build database layer (after #1)\n  [3] Implement REST API (after #1)");
      await Promise.all([
        simulatePass(subtasks[1]),
        simulateFail(subtasks[2], config.maxRetries),
      ]);
      printStatus(subtasks);
      await sleep(1000);

      // Cascade failures
      log("Cascading failures from subtask #3...");
      subtasks[3].phase = Phase.BLOCKED;
      log(`[4] ${chalk.dim("BLOCKED — dependency [3] failed")}`);
      subtasks[4].phase = Phase.BLOCKED;
      log(`[5] ${chalk.dim("BLOCKED — dependency [3] failed")}`);
      printStatus(subtasks);

      await sleep(1000);
      printSummary(subtasks, startTime);

      // Save to history
      const sm = new StateManager(config);
      sm.appendHistory({
        id: `run_demo_${Date.now()}`,
        prompt: TASK_DESCRIPTION,
        workspace: "(demo)",
        startedAt: new Date(startTime).toISOString(),
        finishedAt: new Date().toISOString(),
        status: "failed",
        researchTopics: [],
        subtasks: subtasks.map((st) => ({
          id: st.id,
          title: st.title,
          description: st.description,
          acceptanceCriteria: st.acceptanceCriteria,
          finalPhase: st.phase,
          attempts: st.attempt,
          dependsOn: st.dependsOn,
          agentOutputs: st.agentOutputs,
        })),
        summary: {
          total: subtasks.length,
          done: subtasks.filter((st) => st.phase === Phase.DONE).length,
          failed: subtasks.filter((st) => st.phase === Phase.FAILED).length,
          blocked: subtasks.filter((st) => st.phase === Phase.BLOCKED).length,
        },
      });

      log("Demo run saved to history.");
    });
}
