import type { HarnessConfig } from "../config/schema.js";
import { spawnWithTimeout } from "../utils/process.js";

export interface AgentCallOptions {
  role: string;
  prompt: string;
  systemPrompt: string;
  workDir: string;
  config: HarnessConfig;
}

export interface AgentResult {
  output: string;
  exitCode: number;
  duration: number;
}

export async function callAgent(options: AgentCallOptions): Promise<AgentResult> {
  const { role, prompt, systemPrompt, workDir, config } = options;

  const fullPrompt = `${systemPrompt}\n\n---\n\n${prompt}`;
  const model =
    config.models[role as keyof typeof config.models] ?? "sonnet";
  const timeout =
    config.timeouts[role as keyof typeof config.timeouts] ?? 300;

  const args = [
    "-p",
    fullPrompt,
    "--output-format",
    "text",
    "--model",
    model,
  ];

  if (config.claude.dangerouslySkipPermissions) {
    args.push("--dangerously-skip-permissions");
  }

  if (config.claude.mcpConfig && role === "jira_context") {
    args.push("--mcp-config", config.claude.mcpConfig);
  }

  const result = await spawnWithTimeout("claude", args, {
    cwd: workDir,
    timeout,
  });

  if (result.exitCode !== 0) {
    throw new Error(
      `${role} agent exited with code ${result.exitCode}: ${result.stderr}`,
    );
  }

  return {
    output: result.stdout,
    exitCode: result.exitCode,
    duration: result.duration,
  };
}
