import { cosmiconfig } from "cosmiconfig";
import os from "node:os";
import path from "node:path";
import { HarnessConfigSchema, type HarnessConfig } from "./schema.js";

const explorer = cosmiconfig("harness", {
  searchPlaces: [
    ".harnessrc.json",
    ".harnessrc.yaml",
    ".harnessrc.yml",
    "harness.config.js",
    "harness.config.cjs",
  ],
});

export function resolveStateDir(stateDir: string): string {
  if (stateDir.startsWith("~")) {
    return path.join(os.homedir(), stateDir.slice(1));
  }
  return path.resolve(stateDir);
}

export interface LoadConfigOptions {
  configPath?: string;
  overrides?: Partial<HarnessConfig>;
}

export async function loadConfig(
  options: LoadConfigOptions = {},
): Promise<HarnessConfig> {
  let fileConfig: Record<string, unknown> = {};

  if (options.configPath) {
    const result = await explorer.load(options.configPath);
    if (result) fileConfig = result.config as Record<string, unknown>;
  } else {
    // Search from cwd upward, then check home dir
    const result = await explorer.search();
    if (result) {
      fileConfig = result.config as Record<string, unknown>;
    } else {
      const homeResult = await explorer.search(os.homedir());
      if (homeResult)
        fileConfig = homeResult.config as Record<string, unknown>;
    }
  }

  const merged = { ...fileConfig, ...options.overrides };
  return HarnessConfigSchema.parse(merged);
}
