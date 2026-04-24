import type { Command } from "commander";
import chalk from "chalk";
import Table from "cli-table3";
import { loadConfig } from "../config/loader.js";
import { StateManager } from "../state/manager.js";

export function registerHistoryCommand(program: Command): void {
  program
    .command("history")
    .description("Show past runs or details of a specific run")
    .argument("[run-id]", "Show details for a specific run")
    .option("--json", "Output as JSON")
    .option("--limit <n>", "Show last N runs", parseInt, 20)
    .action(async (runId: string | undefined, opts) => {
      const config = await loadConfig();
      const sm = new StateManager(config);

      if (runId) {
        const record = sm.getRunById(runId);
        if (!record) {
          console.error(`Run not found: ${runId}`);
          process.exit(1);
        }

        if (opts.json) {
          console.log(JSON.stringify(record, null, 2));
          return;
        }

        console.log(`\n  ${chalk.bold("Run:")} ${record.id}`);
        console.log(`  ${chalk.bold("Task:")} ${record.prompt}`);
        console.log(`  ${chalk.bold("Status:")} ${record.status === "completed" ? chalk.green(record.status) : chalk.red(record.status)}`);
        console.log(`  ${chalk.bold("Workspace:")} ${record.workspace}`);
        console.log(`  ${chalk.bold("Started:")} ${record.startedAt}`);
        console.log(`  ${chalk.bold("Finished:")} ${record.finishedAt}`);
        console.log();

        const table = new Table({
          head: ["ID", "Title", "Status", "Attempts"],
          style: { head: ["cyan"] },
        });

        for (const st of record.subtasks) {
          const statusColor =
            st.finalPhase === "done"
              ? chalk.green
              : st.finalPhase === "failed"
                ? chalk.red
                : chalk.dim;
          table.push([
            st.id,
            st.title,
            statusColor(String(st.finalPhase)),
            String(st.attempts),
          ]);
        }

        console.log(table.toString());
        console.log(
          `\n  Total: ${record.summary.total} | Done: ${chalk.green(String(record.summary.done))} | Failed: ${chalk.red(String(record.summary.failed))} | Blocked: ${chalk.dim(String(record.summary.blocked))}\n`,
        );
      } else {
        const history = sm.getHistory().slice(0, opts.limit);

        if (opts.json) {
          console.log(JSON.stringify(history, null, 2));
          return;
        }

        if (history.length === 0) {
          console.log("\n  No runs found.\n");
          return;
        }

        const table = new Table({
          head: ["ID", "Task", "Status", "Subtasks", "Date"],
          style: { head: ["cyan"] },
          colWidths: [25, 40, 12, 10, 22],
          wordWrap: true,
        });

        for (const record of history) {
          const statusColor =
            record.status === "completed" ? chalk.green : chalk.red;
          table.push([
            record.id,
            record.prompt.slice(0, 60) + (record.prompt.length > 60 ? "..." : ""),
            statusColor(record.status),
            `${record.summary.done}/${record.summary.total}`,
            record.startedAt.replace("T", " ").slice(0, 19),
          ]);
        }

        console.log(`\n  ${chalk.bold("Run History")} (last ${history.length})\n`);
        console.log(table.toString());
        console.log();
      }
    });
}
