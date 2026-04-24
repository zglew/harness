import type { HarnessConfig } from "../config/schema.js";
import { Phase, type Subtask } from "../state/types.js";
import { extractJson } from "../utils/json-parser.js";
import { callAgent } from "./base.js";
import { PLANNER_SYSTEM, buildPlannerPrompt } from "../prompts/planner.js";

interface RawSubtask {
  id: string;
  title: string;
  description: string;
  acceptance_criteria: string;
  depends_on?: string[];
}

export async function runPlanner(
  taskDescription: string,
  workDir: string,
  config: HarnessConfig,
  options?: { researchContext?: string; jiraContext?: string },
): Promise<Subtask[]> {
  const prompt = buildPlannerPrompt(taskDescription, options);

  const result = await callAgent({
    role: "planner",
    prompt,
    systemPrompt: PLANNER_SYSTEM,
    workDir,
    config,
  });

  const rawSubtasks = extractJson<RawSubtask[]>(result.output);

  return rawSubtasks.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    acceptanceCriteria: item.acceptance_criteria,
    phase: Phase.PLANNING,
    attempt: 0,
    errorContext: null,
    agentOutputs: {},
    dependsOn: item.depends_on ?? [],
  }));
}
