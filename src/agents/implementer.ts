import type { HarnessConfig } from "../config/schema.js";
import type { Subtask } from "../state/types.js";
import { callAgent } from "./base.js";
import {
  buildImplementerSystem,
  buildImplementerPrompt,
} from "../prompts/implementer.js";

export async function runImplementer(
  subtask: Subtask,
  workDir: string,
  config: HarnessConfig,
): Promise<string> {
  const result = await callAgent({
    role: "implementer",
    prompt: buildImplementerPrompt(subtask, subtask.errorContext),
    systemPrompt: buildImplementerSystem(subtask, workDir),
    workDir,
    config,
  });

  return result.output;
}
