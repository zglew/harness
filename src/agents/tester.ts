import type { HarnessConfig } from "../config/schema.js";
import type { Subtask } from "../state/types.js";
import { callAgent } from "./base.js";
import { buildTesterSystem, buildTesterPrompt } from "../prompts/tester.js";
import { parseResult } from "../utils/json-parser.js";

export interface TesterResult {
  output: string;
  passed: boolean;
}

export async function runTester(
  subtask: Subtask,
  workDir: string,
  config: HarnessConfig,
): Promise<TesterResult> {
  const result = await callAgent({
    role: "tester",
    prompt: buildTesterPrompt(subtask, subtask.errorContext),
    systemPrompt: buildTesterSystem(subtask, workDir),
    workDir,
    config,
  });

  return {
    output: result.output,
    passed: parseResult(result.output),
  };
}
