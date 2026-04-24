import type { HarnessConfig } from "../config/schema.js";
import type { Subtask } from "../state/types.js";
import { callAgent } from "./base.js";
import {
  buildVerifierSystem,
  buildVerifierPrompt,
} from "../prompts/verifier.js";
import { parseResult } from "../utils/json-parser.js";

export interface VerifierResult {
  output: string;
  passed: boolean;
}

export async function runVerifier(
  subtask: Subtask,
  workDir: string,
  config: HarnessConfig,
): Promise<VerifierResult> {
  const result = await callAgent({
    role: "verifier",
    prompt: buildVerifierPrompt(subtask, subtask.errorContext),
    systemPrompt: buildVerifierSystem(subtask, workDir),
    workDir,
    config,
  });

  return {
    output: result.output,
    passed: parseResult(result.output),
  };
}
