import type { HarnessConfig } from "./schema.js";

export const DEFAULT_CONFIG: HarnessConfig = {
  models: {
    analyzer: "opus",
    researcher: "opus",
    jira_context: "sonnet",
    planner: "opus",
    implementer: "opus",
    tester: "opus",
    verifier: "opus",
  },
  timeouts: {
    analyzer: 120,
    researcher: 600,
    jira_context: 180,
    planner: 300,
    implementer: 300,
    tester: 600,
    verifier: 600,
  },
  maxRetries: 3,
  stateDir: "~/.harness",
  claude: {
    dangerouslySkipPermissions: true,
  },
};
