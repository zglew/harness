import fs from "node:fs";
import path from "node:path";
import type { HarnessConfig } from "../config/schema.js";
import { callAgent } from "./base.js";
import {
  JIRA_CONTEXT_SYSTEM,
  buildJiraContextPrompt,
} from "../prompts/jira-context.js";

export async function runJiraContextAgent(
  ticketKeys: string[],
  workDir: string,
  config: HarnessConfig,
): Promise<string> {
  const result = await callAgent({
    role: "jira_context",
    prompt: buildJiraContextPrompt(ticketKeys),
    systemPrompt: JIRA_CONTEXT_SYSTEM,
    workDir,
    config,
  });

  const researchDir = path.join(workDir, ".harness-research");
  fs.mkdirSync(researchDir, { recursive: true });
  const outputPath = path.join(researchDir, "jira-context.md");
  fs.writeFileSync(outputPath, result.output, "utf-8");

  return result.output;
}
