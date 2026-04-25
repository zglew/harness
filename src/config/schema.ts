import { z } from "zod";

export const HarnessConfigSchema = z.object({
  models: z
    .object({
      analyzer: z.string().default("opus"),
      researcher: z.string().default("opus"),
      jira_context: z.string().default("sonnet"),
      planner: z.string().default("opus"),
      implementer: z.string().default("opus"),
      tester: z.string().default("opus"),
      verifier: z.string().default("opus"),
      reviewer: z.string().default("opus"),
    })
    .default({}),

  timeouts: z
    .object({
      analyzer: z.number().default(120),
      researcher: z.number().default(600),
      jira_context: z.number().default(180),
      planner: z.number().default(300),
      implementer: z.number().default(300),
      tester: z.number().default(600),
      verifier: z.number().default(600),
      reviewer: z.number().default(600),
    })
    .default({}),

  maxRetries: z.number().min(1).max(10).default(3),
  defaultWorkspace: z.string().optional(),

  stateDir: z.string().default("~/.harness"),

  claude: z
    .object({
      dangerouslySkipPermissions: z.boolean().default(true),
      mcpConfig: z.string().optional(),
    })
    .default({}),
});

export type HarnessConfig = z.infer<typeof HarnessConfigSchema>;
