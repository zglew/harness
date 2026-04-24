import chalk from "chalk";
import { Phase, type Subtask } from "../state/types.js";

const PHASE_DISPLAY: Record<string, { label: string; color: (s: string) => string }> = {
  [Phase.PLANNING]: { label: "    ", color: chalk.dim },
  [Phase.IMPLEMENTING]: { label: " >> ", color: chalk.yellow },
  [Phase.TESTING]: { label: " ?? ", color: chalk.cyan },
  [Phase.VERIFYING]: { label: " ~~ ", color: chalk.magenta },
  [Phase.DONE]: { label: " OK ", color: chalk.green },
  [Phase.FAILED]: { label: " !! ", color: chalk.red },
  [Phase.BLOCKED]: { label: " -- ", color: chalk.dim },
};

export function printStatus(subtasks: Subtask[], message?: string): void {
  const width = 60;
  console.log("\n" + "=".repeat(width));
  console.log("  AGENT HARNESS — STATUS");
  console.log("=".repeat(width));

  for (const st of subtasks) {
    const display = PHASE_DISPLAY[st.phase] ?? { label: " ?? ", color: chalk.white };
    const retryInfo = st.attempt > 1
      ? chalk.dim(` (attempt ${st.attempt})`)
      : "";
    console.log(
      `  [${display.color(display.label)}] [${st.id}] ${st.title} — ${display.color(st.phase)}${retryInfo}`,
    );
  }

  if (message) {
    console.log(`\n  >> ${message}`);
  }
  console.log("=".repeat(width) + "\n");
}

export function printHeader(task: string, workDir: string): void {
  const width = 60;
  console.log("\n" + "=".repeat(width));
  console.log("  MULTI-AGENT WORKFLOW HARNESS");
  console.log("=".repeat(width));
  console.log(`\n  Task: ${task}`);
  console.log(`  Workspace: ${workDir}\n`);
}
