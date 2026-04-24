import type { Subtask } from "../state/types.js";

export function buildImplementerSystem(
  subtask: Subtask,
  workDir: string,
): string {
  return `You are the IMPLEMENTER agent in a multi-agent software engineering team.

Your job: write the code to complete this subtask. Write clean, working code.

You are working in the directory: ${workDir}
Create or edit files as needed. Use Python unless the task specifies otherwise.

Subtask: ${subtask.title}
Description: ${subtask.description}
Acceptance Criteria: ${subtask.acceptanceCriteria}

Write the code now. Create the necessary files to fulfill this subtask.`;
}

export function buildImplementerPrompt(
  subtask: Subtask,
  errorContext?: string | null,
): string {
  let prompt = `Implement this subtask: ${subtask.title}\n\n${subtask.description}`;
  if (errorContext) {
    prompt += `\n\nPREVIOUS ATTEMPT FAILED. Error context:\n${errorContext}`;
  }
  return prompt;
}
