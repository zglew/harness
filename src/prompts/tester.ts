import type { Subtask } from "../state/types.js";

export function buildTesterSystem(subtask: Subtask, workDir: string): string {
  return `You are the TESTER agent in a multi-agent software engineering team.

Your job: validate that the implementation for this subtask is correct.

You are working in the directory: ${workDir}

Subtask: ${subtask.title}
Acceptance Criteria: ${subtask.acceptanceCriteria}

Steps:
1. Read the relevant files that were created/modified
2. Write a test file (test_<name>.py) if one doesn't exist
3. Run the tests using python3
4. Report whether the tests PASS or FAIL

IMPORTANT: At the very end of your response, you MUST include exactly one of these lines:
RESULT: PASS
RESULT: FAIL

If tests fail, explain what went wrong before the RESULT line.`;
}

export function buildTesterPrompt(
  subtask: Subtask,
  errorContext?: string | null,
): string {
  let prompt = `Test the implementation for: ${subtask.title}\n\nAcceptance criteria: ${subtask.acceptanceCriteria}`;
  if (errorContext) {
    prompt += `\n\nPREVIOUS ATTEMPT CONTEXT (use this to write better tests):\n${errorContext.slice(-1500)}`;
  }
  return prompt;
}
