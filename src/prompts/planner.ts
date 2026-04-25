export const PLANNER_SYSTEM = `You are the PLANNER agent in a multi-agent software engineering team.

Your job: take a high-level task description and decompose it into a list of ordered subtasks.

IMPORTANT: You must respond with ONLY valid JSON — no markdown, no explanation, no code fences.

The JSON must be an array of objects with these fields:
- "id": a short identifier like "1", "2", "3"
- "title": a brief title for the subtask
- "description": what needs to be done in detail
- "acceptance_criteria": how to know this subtask is complete
- "depends_on": a list of subtask IDs this task depends on. Use an empty list [] if it can start immediately. This enables parallel execution of independent subtasks.

Identify which subtasks are truly independent and can run in parallel vs which have real dependencies.
Create as many subtasks as the task genuinely requires — do not artificially limit the count. Simple tasks may need 2-3, complex tasks may need 10+. Be practical and specific.

Example response:
[{"id":"1","title":"Create data model","description":"Define a Customer class with name and account fields","acceptance_criteria":"Customer class exists with required fields","depends_on":[]},{"id":"2","title":"Build API endpoint","description":"Create REST endpoint using the data model","acceptance_criteria":"GET /customers returns data","depends_on":["1"]},{"id":"3","title":"Add input validation","description":"Validate request parameters","acceptance_criteria":"Invalid input returns 400","depends_on":["1"]}]`;

export function buildPlannerPrompt(
  taskDescription: string,
  options?: {
    researchContext?: string;
    jiraContext?: string;
    previousSpec?: string;
    revisionFeedback?: string;
  },
): string {
  let prompt = `Decompose this task into subtasks:\n\n${taskDescription}`;

  if (options?.jiraContext) {
    prompt += `\n\n--- JIRA REQUIREMENTS ---\n\n${options.jiraContext}`;
    prompt +=
      "\n\nThe above Jira context contains the ticket requirements, acceptance criteria, epic context, and related issues. Use this to inform your plan — ensure every acceptance criterion is addressed by at least one subtask.";
  }

  if (options?.researchContext) {
    prompt += `\n\n--- CODEBASE RESEARCH ---\n\n${options.researchContext}`;
    prompt +=
      "\n\nUse the research above to inform your plan. Reference specific files, functions, and patterns found in the research.";
  }

  if (options?.previousSpec && options?.revisionFeedback) {
    prompt += `\n\n--- PREVIOUS PLAN (REVISION REQUESTED) ---\n\n${options.previousSpec}`;
    prompt += `\n\n--- REVIEWER FEEDBACK ---\n\n${options.revisionFeedback}`;
    prompt +=
      "\n\nThe reviewer has requested changes to the plan above. Incorporate their feedback and produce an updated set of subtasks. Address every point in the feedback.";
  }

  return prompt;
}
