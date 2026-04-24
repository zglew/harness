import { Phase, type Subtask } from "../state/types.js";
import type { HarnessConfig } from "../config/schema.js";
import { runImplementer } from "../agents/implementer.js";
import { runTester } from "../agents/tester.js";
import { runVerifier } from "../agents/verifier.js";

export interface PipelineCallbacks {
  onPhaseChange: (subtask: Subtask, phase: Phase) => void;
  onLog: (message: string) => void;
}

export async function runSubtaskPipeline(
  subtask: Subtask,
  workDir: string,
  config: HarnessConfig,
  callbacks: PipelineCallbacks,
): Promise<boolean> {
  const maxRetries = config.maxRetries;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    subtask.attempt = attempt;

    // --- Implement ---
    subtask.phase = Phase.IMPLEMENTING;
    callbacks.onPhaseChange(subtask, Phase.IMPLEMENTING);
    callbacks.onLog(
      `[${subtask.id}] Implementing: ${subtask.title} (attempt ${attempt}/${maxRetries})`,
    );

    try {
      const implResponse = await runImplementer(subtask, workDir, config);
      subtask.agentOutputs.implementer = implResponse.slice(-3000);
    } catch (err) {
      subtask.errorContext = String(err);
      subtask.agentOutputs.implementer = `ERROR: ${err}`;
      callbacks.onLog(`[${subtask.id}] Implementer error: ${err}`);
      continue;
    }

    // --- Test ---
    subtask.phase = Phase.TESTING;
    callbacks.onPhaseChange(subtask, Phase.TESTING);
    callbacks.onLog(`[${subtask.id}] Testing: ${subtask.title}`);

    try {
      const testResult = await runTester(subtask, workDir, config);
      subtask.agentOutputs.tester = testResult.output.slice(-3000);

      if (!testResult.passed) {
        subtask.errorContext = testResult.output.slice(-3000);
        callbacks.onLog(`[${subtask.id}] Tests FAILED — will retry`);
        continue;
      }
    } catch (err) {
      subtask.errorContext = String(err);
      subtask.agentOutputs.tester = `ERROR: ${err}`;
      callbacks.onLog(`[${subtask.id}] Tester error: ${err}`);
      continue;
    }

    callbacks.onLog(`[${subtask.id}] Tests PASSED`);

    // --- Verify ---
    subtask.phase = Phase.VERIFYING;
    callbacks.onPhaseChange(subtask, Phase.VERIFYING);
    callbacks.onLog(`[${subtask.id}] Verifying: ${subtask.title}`);

    try {
      const verifyResult = await runVerifier(subtask, workDir, config);
      subtask.agentOutputs.verifier = verifyResult.output.slice(-3000);

      if (!verifyResult.passed) {
        subtask.errorContext = verifyResult.output.slice(-3000);
        callbacks.onLog(`[${subtask.id}] Verification FAILED — will retry`);
        continue;
      }
    } catch (err) {
      subtask.errorContext = String(err);
      subtask.agentOutputs.verifier = `ERROR: ${err}`;
      callbacks.onLog(`[${subtask.id}] Verifier error: ${err}`);
      continue;
    }

    callbacks.onLog(`[${subtask.id}] Verification PASSED`);
    subtask.phase = Phase.DONE;
    callbacks.onPhaseChange(subtask, Phase.DONE);
    return true;
  }

  subtask.phase = Phase.FAILED;
  callbacks.onPhaseChange(subtask, Phase.FAILED);
  callbacks.onLog(`[${subtask.id}] FAILED after ${maxRetries} attempts`);
  return false;
}
