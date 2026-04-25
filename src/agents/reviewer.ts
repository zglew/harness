import type { HarnessConfig } from "../config/schema.js";
import { callAgent } from "./base.js";
import { REVIEWER_SYSTEM, buildReviewerPrompt } from "../prompts/reviewer.js";

export interface ReviewerOptions {
  prUrl: string;
  ticketKeys?: string[];
  extraContext?: string;
  workDir: string;
  config: HarnessConfig;
}

export async function runReviewer(options: ReviewerOptions): Promise<string> {
  const prompt = buildReviewerPrompt({
    prUrl: options.prUrl,
    ticketKeys: options.ticketKeys,
    extraContext: options.extraContext,
  });

  const result = await callAgent({
    role: "reviewer",
    prompt,
    systemPrompt: REVIEWER_SYSTEM,
    workDir: options.workDir,
    config: options.config,
  });

  return result.output;
}
