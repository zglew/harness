import fs from "node:fs";
import path from "node:path";
import { EventEmitter } from "node:events";
import { Phase, type Subtask, type ResearchTopic, type HarnessEvent, type ReviewDecision } from "../state/types.js";
import type { HarnessConfig } from "../config/schema.js";
import { executeDag } from "./dag.js";
import { runSubtaskPipeline } from "./pipeline.js";
import { runPlanner } from "../agents/planner.js";
import { runAnalyzer } from "../agents/analyzer.js";
import { runResearcher } from "../agents/researcher.js";
import { runJiraContextAgent } from "../agents/jira-context.js";
import { extractJiraTickets } from "../utils/jira.js";
import { workspaceHasContent } from "../utils/workspace.js";
import { StateManager } from "../state/manager.js";
import { generateSpec, saveDraftSpec, saveSpec } from "./spec.js";

export interface OrchestratorOptions {
  task: string;
  workDir: string;
  config: HarnessConfig;
  skipResearch?: boolean;
  skipJira?: boolean;
  dryRun?: boolean;
  autoApprove?: boolean;
  reviewHandler?: (specPath: string, revision: number) => Promise<ReviewDecision>;
}

export class Orchestrator extends EventEmitter {
  private subtasks: Subtask[] = [];
  private researchTopics: ResearchTopic[] = [];
  private jiraContext = "";
  private jiraStatus: "" | "fetching" | "done" | "failed" = "";
  private jiraTickets: string[] = [];
  private researchPhase: "" | "analyzing" | "researching" | "done" = "";
  private stateManager: StateManager;

  constructor(private options: OrchestratorOptions) {
    super();
    this.stateManager = new StateManager(options.config);
  }

  private log(message: string): void {
    this.emit("event", { type: "log", message } satisfies HarnessEvent);
  }

  private writeState(): void {
    this.stateManager.writeState({
      status: "running",
      task: this.options.task,
      workspace: this.options.workDir,
      timestamp: new Date().toLocaleTimeString("en-US", { hour12: false }),
      jiraContext: { status: this.jiraStatus, tickets: this.jiraTickets },
      researchPhase: this.researchPhase,
      researchTopics: this.researchTopics.map((rt) => ({
        id: rt.id,
        name: rt.name,
        description: rt.description,
        phase: rt.phase,
        outputFile: rt.outputFile,
      })),
      subtasks: this.subtasks.map((st) => ({
        id: st.id,
        title: st.title,
        description: st.description,
        acceptanceCriteria: st.acceptanceCriteria,
        phase: st.phase,
        attempt: st.attempt,
        maxRetries: this.options.config.maxRetries,
        agentOutputs: st.agentOutputs,
        dependsOn: st.dependsOn,
      })),
      logs: [],
      summary: {
        total: this.subtasks.length,
        done: this.subtasks.filter((st) => st.phase === Phase.DONE).length,
        failed: this.subtasks.filter((st) => st.phase === Phase.FAILED).length,
        inProgress: this.subtasks.filter(
          (st) =>
            st.phase === Phase.IMPLEMENTING ||
            st.phase === Phase.TESTING ||
            st.phase === Phase.VERIFYING,
        ).length,
        pending: this.subtasks.filter((st) => st.phase === Phase.PLANNING).length,
        blocked: this.subtasks.filter((st) => st.phase === Phase.BLOCKED).length,
      },
    });
  }

  async run(): Promise<boolean> {
    const { task, workDir, config, skipResearch, skipJira, dryRun, autoApprove, reviewHandler } = this.options;
    const startedAt = new Date().toISOString();
    const runId = `run_${startedAt.replace(/[-T:]/g, "").slice(0, 15)}`;

    fs.mkdirSync(workDir, { recursive: true });

    // Clean old research
    const researchDir = path.join(workDir, ".harness-research");
    if (fs.existsSync(researchDir)) {
      fs.rmSync(researchDir, { recursive: true });
    }

    this.writeState();

    // Phase 0a: Jira Context
    if (!skipJira) {
      const ticketKeys = extractJiraTickets(task);
      if (ticketKeys.length > 0) {
        this.jiraTickets = ticketKeys;
        this.jiraStatus = "fetching";
        this.writeState();
        this.log(`Jira context — detected tickets: ${ticketKeys.join(", ")}`);

        try {
          this.jiraContext = await runJiraContextAgent(ticketKeys, workDir, config);
          this.jiraStatus = this.jiraContext ? "done" : "failed";
        } catch (err) {
          this.log(`Jira context phase failed (continuing without): ${err}`);
          this.jiraStatus = "failed";
        }
        this.writeState();
      }
    }

    // Phase 0b: Research
    let researchContext = "";
    if (!skipResearch && workspaceHasContent(workDir)) {
      this.log("RESEARCH PHASE");
      try {
        researchContext = await this.runResearchPhase(task, workDir, config);
      } catch (err) {
        this.log(`Research phase failed (continuing without): ${err}`);
      }
    } else if (!skipResearch) {
      this.log("Skipping research phase (empty or new workspace)");
    }

    // Phase 1: Plan + Review Loop
    this.emit("event", { type: "phase:start", phase: "planning" } satisfies HarnessEvent);
    this.log("PHASE 1: PLANNING");

    let revision = 1;
    let previousSpec: string | undefined;
    let revisionFeedback: string | undefined;

    while (true) {
      this.subtasks = await runPlanner(task, workDir, config, {
        researchContext,
        jiraContext: this.jiraContext,
        previousSpec,
        revisionFeedback,
      });

      this.log(`Planner created ${this.subtasks.length} subtasks (revision ${revision}):`);
      for (const st of this.subtasks) {
        const deps = st.dependsOn.length > 0
          ? ` (depends on: #${st.dependsOn.join(", #")})`
          : " (independent)";
        this.log(`  [${st.id}] ${st.title}${deps}`);
      }
      this.writeState();

      // Generate spec
      const specContent = generateSpec(this.subtasks, {
        task,
        workspace: workDir,
        createdAt: new Date().toISOString(),
        revision,
        jiraTickets: this.jiraTickets,
        researchTopics: this.researchTopics.map((rt) => rt.name),
      });

      const draftPath = saveDraftSpec(specContent, workDir);
      this.emit("event", { type: "spec:ready", specPath: draftPath, revision } satisfies HarnessEvent);

      // Review gate
      if (autoApprove || !reviewHandler) {
        this.log(autoApprove ? "Auto-approved." : "No review handler — proceeding.");
        saveSpec(specContent, workDir, runId);
        break;
      }

      const decision = await reviewHandler(draftPath, revision);

      if (decision.action === "approve") {
        this.log("Plan approved by reviewer.");
        saveSpec(specContent, workDir, runId);
        break;
      }

      if (decision.action === "quit") {
        this.log("Review cancelled — aborting.");
        return false;
      }

      // Revise
      this.log(`Revision requested: ${decision.feedback}`);
      previousSpec = specContent;
      revisionFeedback = decision.feedback;
      revision++;
    }

    if (dryRun) {
      this.log("Dry run — stopping after planning.");
      return true;
    }

    // Phase 2-4: DAG Execution
    this.emit("event", { type: "phase:start", phase: "execution" } satisfies HarnessEvent);
    this.log("PHASE 2-4: DAG EXECUTION — IMPLEMENT -> TEST -> VERIFY");

    const dagResult = await executeDag(
      this.subtasks,
      (subtask) =>
        runSubtaskPipeline(subtask, workDir, config, {
          onPhaseChange: (st, phase) => {
            this.emit("event", { type: "subtask:phase", subtask: st, phase } satisfies HarnessEvent);
            this.writeState();
          },
          onLog: (msg) => this.log(msg),
        }),
      {
        onWaveStart: (ready) => {
          this.emit("event", { type: "wave:start", subtasks: ready } satisfies HarnessEvent);
          this.log(
            `Launching ${ready.length} subtask(s) in parallel:\n` +
              ready
                .map(
                  (st) =>
                    `  [${st.id}] ${st.title}${st.dependsOn.length ? ` (after #${st.dependsOn.join(", #")})` : " (no dependencies)"}`,
                )
                .join("\n"),
          );
        },
        onNodeComplete: (node, success) => {
          this.emit("event", {
            type: "subtask:done",
            subtask: node,
            success,
          } satisfies HarnessEvent);
          this.writeState();
        },
        onNodeBlocked: (node, failedDep) => {
          node.phase = Phase.BLOCKED;
          this.log(`[${node.id}] BLOCKED — dependency [${failedDep}] failed`);
          this.writeState();
        },
      },
    );

    this.emit("event", { type: "run:complete", result: dagResult } satisfies HarnessEvent);

    if (dagResult.allPassed) {
      this.log("All subtasks completed successfully!");
    } else {
      this.log("Some subtasks failed. Check the output above for details.");
    }

    // Save history
    this.stateManager.appendHistory({
      id: runId,
      prompt: task,
      workspace: workDir,
      startedAt,
      finishedAt: new Date().toISOString(),
      status: dagResult.allPassed ? "completed" : "failed",
      researchTopics: this.researchTopics.map((rt) => ({
        id: rt.id,
        name: rt.name,
        description: rt.description,
        phase: rt.phase,
        outputFile: rt.outputFile,
      })),
      subtasks: this.subtasks.map((st) => ({
        id: st.id,
        title: st.title,
        description: st.description,
        acceptanceCriteria: st.acceptanceCriteria,
        finalPhase: st.phase,
        attempts: st.attempt,
        dependsOn: st.dependsOn,
        agentOutputs: st.agentOutputs,
      })),
      summary: {
        total: this.subtasks.length,
        done: this.subtasks.filter((st) => st.phase === Phase.DONE).length,
        failed: this.subtasks.filter((st) => st.phase === Phase.FAILED).length,
        blocked: this.subtasks.filter((st) => st.phase === Phase.BLOCKED).length,
      },
    });

    // Update final state
    const finalState = this.stateManager.readState();
    if (finalState) {
      finalState.status = dagResult.allPassed ? "completed" : "failed";
      this.stateManager.writeState(finalState);
    }

    return dagResult.allPassed;
  }

  private async runResearchPhase(
    task: string,
    workDir: string,
    config: HarnessConfig,
  ): Promise<string> {
    this.researchPhase = "analyzing";
    this.writeState();
    this.log("Analyzing codebase to identify research topics...");

    const topics = await runAnalyzer(task, workDir, config, this.jiraContext || undefined);
    this.researchTopics = topics;

    this.log(`Analyzer identified ${topics.length} research topics:`);
    for (const topic of topics) {
      this.log(`  [${topic.id}] ${topic.name}: ${topic.description}`);
    }

    this.researchPhase = "researching";
    this.writeState();
    this.log(`Launching ${topics.length} research agents in parallel...`);

    const results = await Promise.allSettled(
      topics.map((topic) => runResearcher(topic, workDir, config)),
    );

    const successful: string[] = [];
    const failedTopics: string[] = [];

    for (const result of results) {
      if (result.status === "fulfilled") {
        if (result.value.success) {
          successful.push(result.value.content);
        } else {
          failedTopics.push(result.value.topic.name);
        }
      }
    }

    this.researchPhase = "done";
    this.writeState();

    if (failedTopics.length > 0) {
      this.log(`Warning: ${failedTopics.length} research agent(s) failed: ${failedTopics.join(", ")}`);
    }
    this.log(`Research phase complete: ${successful.length}/${topics.length} topics researched`);

    let combined = "# Codebase Research\n\nThe following research documents were produced by analyzing the target codebase.\n\n";
    for (let i = 0; i < successful.length; i++) {
      const topic = topics[i];
      combined += `---\n\n# Research: ${topic.name}\n\n${successful[i]}\n\n`;
    }

    return combined;
  }
}
