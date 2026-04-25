export enum Phase {
  ANALYZING = "analyzing",
  RESEARCHING = "researching",
  PLANNING = "planning",
  IMPLEMENTING = "implementing",
  TESTING = "testing",
  VERIFYING = "verifying",
  DONE = "done",
  FAILED = "failed",
  BLOCKED = "blocked",
}

export interface Subtask {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string;
  phase: Phase;
  attempt: number;
  errorContext: string | null;
  agentOutputs: Record<string, string>;
  dependsOn: string[];
}

export interface ResearchTopic {
  id: string;
  name: string;
  description: string;
  phase: Phase;
  outputFile: string | null;
}

export interface ResearchResult {
  topic: ResearchTopic;
  content: string;
  success: boolean;
}

export interface RunSummary {
  total: number;
  done: number;
  failed: number;
  inProgress: number;
  pending: number;
  blocked: number;
}

export interface JiraContextState {
  status: "" | "fetching" | "done" | "failed";
  tickets: string[];
}

export interface RunState {
  status: "idle" | "running" | "completed" | "failed";
  task: string;
  workspace: string;
  timestamp: string;
  jiraContext: JiraContextState;
  researchPhase: "" | "analyzing" | "researching" | "done";
  researchTopics: Array<{
    id: string;
    name: string;
    description: string;
    phase: string;
    outputFile: string | null;
  }>;
  subtasks: Array<{
    id: string;
    title: string;
    description: string;
    acceptanceCriteria: string;
    phase: string;
    attempt: number;
    maxRetries: number;
    agentOutputs: Record<string, string>;
    dependsOn: string[];
  }>;
  logs: string[];
  summary: RunSummary;
}

export interface SubtaskRecord {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string;
  finalPhase: string;
  attempts: number;
  dependsOn: string[];
  agentOutputs: Record<string, string>;
}

export interface RunRecord {
  id: string;
  prompt: string;
  workspace: string;
  startedAt: string;
  finishedAt: string;
  status: "completed" | "failed";
  researchTopics: Array<{
    id: string;
    name: string;
    description: string;
    phase: string;
    outputFile: string | null;
  }>;
  subtasks: SubtaskRecord[];
  summary: {
    total: number;
    done: number;
    failed: number;
    blocked: number;
  };
}

export interface DagNode {
  id: string;
  dependsOn: string[];
}

export interface DagResult {
  completed: Set<string>;
  failed: Set<string>;
  blocked: Set<string>;
  allPassed: boolean;
}

export type ReviewDecision =
  | { action: "approve" }
  | { action: "revise"; feedback: string }
  | { action: "quit" };

export type HarnessEvent =
  | { type: "phase:start"; phase: string }
  | { type: "agent:start"; role: string; subtaskId?: string }
  | { type: "agent:complete"; role: string; subtaskId?: string; duration: number }
  | { type: "subtask:phase"; subtask: Subtask; phase: Phase }
  | { type: "subtask:done"; subtask: Subtask; success: boolean }
  | { type: "wave:start"; subtasks: Subtask[] }
  | { type: "run:complete"; result: DagResult }
  | { type: "spec:ready"; specPath: string; revision: number }
  | { type: "log"; message: string };
