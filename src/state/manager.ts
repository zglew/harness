import fs from "node:fs";
import path from "node:path";
import type { RunState, RunRecord } from "./types.js";
import type { HarnessConfig } from "../config/schema.js";
import { resolveStateDir } from "../config/loader.js";

export class StateManager {
  private stateDir: string;
  private stateFile: string;
  private historyFile: string;

  constructor(config: HarnessConfig) {
    this.stateDir = resolveStateDir(config.stateDir);
    fs.mkdirSync(this.stateDir, { recursive: true });
    this.stateFile = path.join(this.stateDir, "state.json");
    this.historyFile = path.join(this.stateDir, "history.json");
  }

  writeState(state: RunState): void {
    fs.writeFileSync(this.stateFile, JSON.stringify(state, null, 2), "utf-8");
  }

  readState(): RunState | null {
    if (!fs.existsSync(this.stateFile)) return null;
    try {
      return JSON.parse(fs.readFileSync(this.stateFile, "utf-8")) as RunState;
    } catch {
      return null;
    }
  }

  clearState(): void {
    if (fs.existsSync(this.stateFile)) {
      fs.unlinkSync(this.stateFile);
    }
  }

  appendHistory(record: RunRecord): void {
    const history = this.getHistory();
    history.unshift(record);
    fs.writeFileSync(
      this.historyFile,
      JSON.stringify(history, null, 2),
      "utf-8",
    );
  }

  getHistory(): RunRecord[] {
    if (!fs.existsSync(this.historyFile)) return [];
    try {
      return JSON.parse(
        fs.readFileSync(this.historyFile, "utf-8"),
      ) as RunRecord[];
    } catch {
      return [];
    }
  }

  getRunById(id: string): RunRecord | null {
    const history = this.getHistory();
    return history.find((r) => r.id === id) ?? null;
  }

  getStateDir(): string {
    return this.stateDir;
  }
}
