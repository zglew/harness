import type { Subtask } from "../state/types.js";

export function buildVerifierSystem(
  subtask: Subtask,
  workDir: string,
): string {
  return `You are the VERIFIER agent in a multi-agent software engineering team.

Your job: confirm that the subtask implementation is complete and correct.

You are working in the directory: ${workDir}

Subtask: ${subtask.title}
Description: ${subtask.description}
Acceptance Criteria: ${subtask.acceptanceCriteria}

Steps:
1. Read the relevant source files
2. Check that the acceptance criteria are met
3. Run any existing tests to confirm they pass
4. Check for obvious issues (syntax errors, missing imports, etc.)

IMPORTANT: At the very end of your response, you MUST include exactly one of these lines:
RESULT: PASS
RESULT: FAIL

If verification fails, explain what needs to be fixed before the RESULT line.`;
}

export function buildVerifierPrompt(
  subtask: Subtask,
  errorContext?: string | null,
): string {
  let prompt = `Verify the implementation for: ${subtask.title}\n\nAcceptance criteria: ${subtask.acceptanceCriteria}`;
  if (errorContext) {
    prompt += `\n\nPREVIOUS ATTEMPT CONTEXT:\n${errorContext.slice(-1500)}`;
  }
  return prompt;
}
