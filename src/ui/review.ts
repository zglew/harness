import fs from "node:fs";
import readline from "node:readline";
import chalk from "chalk";
import Table from "cli-table3";
import type { ReviewDecision, Subtask } from "../state/types.js";

function parseSpecSubtasks(specContent: string): Array<{ id: string; title: string; deps: string }> {
  const rows: Array<{ id: string; title: string; deps: string }> = [];
  const regex = /^\[(\S+)\]\s+(.+?)(?:\s+-->\s+\[(.+?)\]|\s+\(no dependencies\))$/gm;
  let match;
  while ((match = regex.exec(specContent)) !== null) {
    rows.push({
      id: match[1],
      title: match[2],
      deps: match[3] ?? "-",
    });
  }
  return rows;
}

export function printSpecPreview(specPath: string, revision: number): void {
  const content = fs.readFileSync(specPath, "utf-8");
  const subtasks = parseSpecSubtasks(content);

  console.log();
  console.log(chalk.bold(`  Plan ready (revision ${revision})`));
  console.log(chalk.dim(`  Full spec: ${specPath}`));
  console.log();

  if (subtasks.length > 0) {
    const table = new Table({
      head: ["ID", "Title", "Depends On"],
      style: { head: ["cyan"] },
    });
    for (const st of subtasks) {
      table.push([st.id, st.title, st.deps]);
    }
    console.log(table.toString());
    console.log();
  }
}

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function promptMultiline(header: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log(chalk.dim(`  ${header}`));
  console.log(chalk.dim("  (enter a blank line to submit)"));
  console.log();

  return new Promise((resolve) => {
    const lines: string[] = [];
    rl.on("line", (line) => {
      if (line === "" && lines.length > 0) {
        rl.close();
        resolve(lines.join("\n"));
      } else {
        lines.push(line);
      }
    });
  });
}

export async function interactiveReview(specPath: string, revision: number): Promise<ReviewDecision> {
  printSpecPreview(specPath, revision);

  while (true) {
    const answer = await prompt(
      `  ${chalk.green("[a]")}pprove  ${chalk.yellow("[r]")}evise  ${chalk.red("[q]")}uit > `,
    );

    switch (answer.toLowerCase()) {
      case "a":
      case "approve":
        return { action: "approve" };

      case "q":
      case "quit":
        return { action: "quit" };

      case "r":
      case "revise": {
        const feedback = await promptMultiline(
          "Describe the changes you want (what to add, remove, or change):",
        );
        if (!feedback) {
          console.log(chalk.dim("  No feedback provided, try again."));
          continue;
        }
        return { action: "revise", feedback };
      }

      default:
        console.log(chalk.dim("  Enter a, r, or q"));
    }
  }
}
