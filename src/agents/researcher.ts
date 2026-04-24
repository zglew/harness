import fs from "node:fs";
import path from "node:path";
import type { HarnessConfig } from "../config/schema.js";
import { Phase, type ResearchTopic, type ResearchResult } from "../state/types.js";
import { callAgent } from "./base.js";
import {
  buildResearcherSystem,
  buildResearcherPrompt,
} from "../prompts/researcher.js";

export async function runResearcher(
  topic: ResearchTopic,
  workDir: string,
  config: HarnessConfig,
): Promise<ResearchResult> {
  try {
    const result = await callAgent({
      role: "researcher",
      prompt: buildResearcherPrompt(topic),
      systemPrompt: buildResearcherSystem(topic, workDir),
      workDir,
      config,
    });

    const researchDir = path.join(workDir, ".harness-research");
    fs.mkdirSync(researchDir, { recursive: true });
    const outputPath = path.join(researchDir, `${topic.name}.md`);
    fs.writeFileSync(outputPath, result.output, "utf-8");

    topic.outputFile = outputPath;
    topic.phase = Phase.DONE;

    return { topic, content: result.output, success: true };
  } catch (err) {
    topic.phase = Phase.FAILED;
    return {
      topic,
      content: String(err),
      success: false,
    };
  }
}
