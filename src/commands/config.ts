import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Command } from "commander";
import chalk from "chalk";
import { loadConfig } from "../config/loader.js";

export function registerConfigCommand(program: Command): void {
  program
    .command("config")
    .description("Show or set configuration")
    .argument("[key]", "Configuration key to show or set")
    .argument("[value]", "Value to set")
    .option("--global", "Edit ~/.harnessrc.json instead of local")
    .option("--reset", "Reset to defaults")
    .action(async (key: string | undefined, value: string | undefined, opts) => {
      if (opts.reset) {
        const target = opts.global
          ? path.join(os.homedir(), ".harnessrc.json")
          : path.join(process.cwd(), ".harnessrc.json");

        if (fs.existsSync(target)) {
          fs.unlinkSync(target);
          console.log(`  Removed ${target}`);
        } else {
          console.log(`  No config file found at ${target}`);
        }
        return;
      }

      const config = await loadConfig();

      if (!key) {
        console.log(`\n  ${chalk.bold("Current Configuration")}\n`);
        console.log(JSON.stringify(config, null, 2));
        console.log();
        return;
      }

      if (value !== undefined) {
        const target = opts.global
          ? path.join(os.homedir(), ".harnessrc.json")
          : path.join(process.cwd(), ".harnessrc.json");

        let existing: Record<string, unknown> = {};
        if (fs.existsSync(target)) {
          try {
            existing = JSON.parse(fs.readFileSync(target, "utf-8"));
          } catch {
            // start fresh
          }
        }

        // Support dotted keys like "models.planner"
        const parts = key.split(".");
        let obj: Record<string, unknown> = existing;
        for (let i = 0; i < parts.length - 1; i++) {
          if (typeof obj[parts[i]] !== "object" || obj[parts[i]] === null) {
            obj[parts[i]] = {};
          }
          obj = obj[parts[i]] as Record<string, unknown>;
        }

        // Try to parse value as number or boolean
        let parsed: unknown = value;
        if (value === "true") parsed = true;
        else if (value === "false") parsed = false;
        else if (!isNaN(Number(value))) parsed = Number(value);

        obj[parts[parts.length - 1]] = parsed;

        fs.writeFileSync(target, JSON.stringify(existing, null, 2), "utf-8");
        console.log(`  Set ${key} = ${parsed} in ${target}`);
      } else {
        // Show specific key
        const parts = key.split(".");
        let val: unknown = config;
        for (const part of parts) {
          if (val && typeof val === "object") {
            val = (val as Record<string, unknown>)[part];
          } else {
            val = undefined;
            break;
          }
        }
        if (val === undefined) {
          console.log(`  Key not found: ${key}`);
        } else {
          console.log(`  ${key} = ${JSON.stringify(val)}`);
        }
      }
    });
}
