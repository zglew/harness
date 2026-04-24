import chalk from "chalk";
import Table from "cli-table3";
import { Phase, type Subtask } from "../state/types.js";

const PHASE_COLOR: Record<string, (s: string) => string> = {
  [Phase.DONE]: chalk.green,
  [Phase.FAILED]: chalk.red,
  [Phase.BLOCKED]: chalk.dim,
  [Phase.PLANNING]: chalk.white,
  [Phase.IMPLEMENTING]: chalk.yellow,
  [Phase.TESTING]: chalk.cyan,
  [Phase.VERIFYING]: chalk.magenta,
};

export function printSummary(
  subtasks: Subtask[],
  startTime: number,
): void {
  const width = 60;
  console.log("\n" + "=".repeat(width));
  console.log("  FINAL RESULTS");
  console.log("=".repeat(width));

  const table = new Table({
    head: ["ID", "Title", "Status", "Attempts"],
    style: { head: ["cyan"] },
  });

  for (const st of subtasks) {
    const colorFn = PHASE_COLOR[st.phase] ?? chalk.white;
    table.push([st.id, st.title, colorFn(st.phase), String(st.attempt)]);
  }

  console.log(table.toString());

  const done = subtasks.filter((st) => st.phase === Phase.DONE).length;
  const failed = subtasks.filter((st) => st.phase === Phase.FAILED).length;
  const blocked = subtasks.filter((st) => st.phase === Phase.BLOCKED).length;
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
  const mins = Math.floor(Number(elapsed) / 60);
  const secs = Number(elapsed) % 60;

  console.log(
    `\n  Total: ${subtasks.length} | Done: ${chalk.green(String(done))} | Failed: ${chalk.red(String(failed))} | Blocked: ${chalk.dim(String(blocked))}`,
  );
  console.log(`  Duration: ${mins}m ${secs}s`);
  console.log("=".repeat(width) + "\n");
}
