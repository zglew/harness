import type { HarnessConfig } from "../config/schema.js";
import { Phase, type ResearchTopic } from "../state/types.js";
import { extractJson } from "../utils/json-parser.js";
import { callAgent } from "./base.js";
import { ANALYZER_SYSTEM, buildAnalyzerPrompt } from "../prompts/analyzer.js";
import { getFileTree, readReadme } from "../utils/workspace.js";

interface RawTopic {
  id: string;
  name: string;
  description: string;
}

export async function runAnalyzer(
  taskDescription: string,
  workDir: string,
  config: HarnessConfig,
  jiraContext?: string,
): Promise<ResearchTopic[]> {
  const fileTree = getFileTree(workDir);
  const readmeContent = readReadme(workDir);
  const prompt = buildAnalyzerPrompt(
    taskDescription,
    fileTree,
    readmeContent,
    jiraContext,
  );

  const result = await callAgent({
    role: "analyzer",
    prompt,
    systemPrompt: ANALYZER_SYSTEM,
    workDir,
    config,
  });

  const rawTopics = extractJson<RawTopic[]>(result.output);

  return rawTopics.map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    phase: Phase.RESEARCHING,
    outputFile: null,
  }));
}
