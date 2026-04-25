import type { Command } from "commander";
import { loadConfig } from "../config/loader.js";
import { resolveWorkspace, validateWorkspace } from "../utils/workspace.js";
import { Orchestrator } from "../engine/orchestrator.js";
import { Logger } from "../ui/logger.js";
import { printHeader } from "../ui/status.js";
import { printSummary } from "../ui/summary.js";
import { interactiveReview } from "../ui/review.js";
import { killAllActive } from "../utils/process.js";
import type { HarnessEvent, Subtask } from "../state/types.js";

export function registerRunCommand(program: Command): void {
  program
    .command("run")
    .description("Run the multi-agent workflow on a task")
    .argument("<task>", "Natural-language task description")
    .option("-w, --workspace <path>", "Target directory (default: cwd)")
    .option("--no-research", "Skip the research phase")
    .option("--no-jira", "Skip Jira context fetching")
    .option("--dry-run", "Plan only, show subtasks without executing")
    .option("--auto-approve", "Skip interactive plan review")
    .option("--max-retries <n>", "Override max retries", parseInt)
    .option("--verbose", "Show full agent output")
    .action(async (task: string, opts) => {
      const logger = new Logger();
      if (opts.verbose) logger.verbose = true;

      const config = await loadConfig({
        overrides: {
          ...(opts.maxRetries ? { maxRetries: opts.maxRetries } : {}),
        },
      });

      const workDir = resolveWorkspace(opts.workspace);

      if (opts.workspace) {
        validateWorkspace(workDir);
      }

      printHeader(task, workDir);

      const startTime = Date.now();
      let subtasks: Subtask[] = [];

      const orchestrator = new Orchestrator({
        task,
        workDir,
        config,
        skipResearch: !opts.research,
        skipJira: !opts.jira,
        dryRun: opts.dryRun,
        autoApprove: opts.autoApprove,
        reviewHandler: opts.autoApprove ? undefined : interactiveReview,
      });

      orchestrator.on("event", (event: HarnessEvent) => {
        switch (event.type) {
          case "log":
            logger.log(event.message);
            break;
          case "subtask:done":
            subtasks = [event.subtask, ...subtasks.filter((s) => s.id !== event.subtask.id)];
            break;
          case "run:complete":
            break;
        }
      });

      // Graceful shutdown
      const cleanup = () => {
        logger.warn("Interrupted — killing active agents...");
        killAllActive();
        process.exit(1);
      };
      process.on("SIGINT", cleanup);
      process.on("SIGTERM", cleanup);

      try {
        const success = await orchestrator.run();
        // Collect subtasks from state for summary
        const stateManager = await import("../state/manager.js");
        const sm = new stateManager.StateManager(config);
        const state = sm.readState();
        if (state && state.subtasks.length > 0 && !opts.dryRun) {
          printSummary(
            state.subtasks.map((st) => ({
              ...st,
              phase: st.phase as any,
              acceptanceCriteria: st.acceptanceCriteria,
              errorContext: null,
              agentOutputs: st.agentOutputs,
            })),
            startTime,
          );
        }
        process.exit(success ? 0 : 1);
      } catch (err) {
        logger.error(`Fatal error: ${err}`);
        process.exit(1);
      } finally {
        process.off("SIGINT", cleanup);
        process.off("SIGTERM", cleanup);
      }
    });
}
