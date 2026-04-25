import fs from "node:fs";
import path from "node:path";
import type { Command } from "commander";
import chalk from "chalk";
import { loadConfig } from "../config/loader.js";
import { resolveWorkspace } from "../utils/workspace.js";
import { runReviewer } from "../agents/reviewer.js";
import { extractJiraTickets } from "../utils/jira.js";
import { startSpinner, stopSpinner } from "../ui/spinner.js";

const PR_URL_PATTERN =
  /https?:\/\/github\.com\/[\w.-]+\/[\w.-]+\/pull\/\d+/;

function extractPrUrl(text: string): string | null {
  const match = text.match(PR_URL_PATTERN);
  return match ? match[0] : null;
}

export function registerGlewReviewCommand(program: Command): void {
  program
    .command("glew-review")
    .description("Run a Glew Review on a pull request against Jira tickets")
    .argument("<prompt...>", "Review prompt — include a PR link and optionally Jira ticket keys")
    .option("-w, --workspace <path>", "Target directory (default: cwd)")
    .option("-o, --output <path>", "Save review to a file")
    .option("--verbose", "Show full agent output")
    .action(async (promptParts: string[], opts) => {
      const fullPrompt = promptParts.join(" ");

      const prUrl = extractPrUrl(fullPrompt);
      if (!prUrl) {
        console.error(
          chalk.red("\n  Error: No GitHub PR URL found in your prompt."),
        );
        console.error(
          chalk.dim(
            "  Include a link like: https://github.com/owner/repo/pull/123\n",
          ),
        );
        process.exit(1);
      }

      const ticketKeys = extractJiraTickets(fullPrompt);

      const config = await loadConfig();
      const workDir = resolveWorkspace(opts.workspace);

      console.log();
      console.log(chalk.bold("  Glew Review"));
      console.log(chalk.dim("  ─────────────────────────────────"));
      console.log(`  PR:      ${chalk.cyan(prUrl)}`);
      if (ticketKeys.length > 0) {
        console.log(`  Tickets: ${chalk.cyan(ticketKeys.join(", "))}`);
      } else {
        console.log(`  Tickets: ${chalk.dim("none provided")}`);
      }
      console.log();

      // Strip the PR URL and ticket keys from the prompt to get extra context
      let extraContext = fullPrompt
        .replace(PR_URL_PATTERN, "")
        .replace(
          /(?:https?:\/\/[a-zA-Z0-9.-]+\.atlassian\.net\/browse\/)?[A-Z][A-Z0-9_]+-\d+/g,
          "",
        )
        .replace(/\s+/g, " ")
        .trim();

      // Clean up common filler words left over
      extraContext = extraContext
        .replace(/^(?:please\s+)?review\s+(?:the\s+)?(?:following\s+)?(?:pr:?\s*)?/i, "")
        .replace(/(?:here(?:'s| are| is)?\s+the\s+tickets?:?\s*)/gi, "")
        .trim();

      if (!extraContext || extraContext.length < 5) {
        extraContext = undefined as unknown as string;
      }

      startSpinner("Running Glew Review agent...");

      try {
        const review = await runReviewer({
          prUrl,
          ticketKeys: ticketKeys.length > 0 ? ticketKeys : undefined,
          extraContext: extraContext || undefined,
          workDir,
          config,
        });

        stopSpinner(true, "Review complete");

        console.log();
        console.log(review);
        console.log();

        if (opts.output) {
          const outputPath = path.resolve(opts.output);
          fs.writeFileSync(outputPath, review, "utf-8");
          console.log(chalk.dim(`  Review saved to ${outputPath}`));
          console.log();
        }
      } catch (err) {
        stopSpinner(false, "Review failed");
        console.error(chalk.red(`\n  Error: ${err}\n`));
        process.exit(1);
      }
    });
}
