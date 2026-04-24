import type { DagNode, DagResult } from "../state/types.js";

export interface DagCallbacks<T extends DagNode> {
  onWaveStart?: (ready: T[]) => void;
  onNodeComplete?: (node: T, success: boolean) => void;
  onNodeBlocked?: (node: T, failedDep: string) => void;
}

export async function executeDag<T extends DagNode>(
  nodes: T[],
  runner: (node: T) => Promise<boolean>,
  callbacks: DagCallbacks<T> = {},
): Promise<DagResult> {
  const completed = new Set<string>();
  const failed = new Set<string>();
  const blocked = new Set<string>();

  while (true) {
    // Block nodes whose deps have failed or are blocked
    for (const node of nodes) {
      if (completed.has(node.id) || failed.has(node.id) || blocked.has(node.id))
        continue;

      const failedDep = node.dependsOn.find(
        (d) => failed.has(d) || blocked.has(d),
      );
      if (failedDep) {
        blocked.add(node.id);
        callbacks.onNodeBlocked?.(node, failedDep);
      }
    }

    // Find ready nodes: not done/failed/blocked, all deps completed
    const ready = nodes.filter(
      (n) =>
        !completed.has(n.id) &&
        !failed.has(n.id) &&
        !blocked.has(n.id) &&
        n.dependsOn.every((d) => completed.has(d)),
    );

    if (ready.length === 0) break;

    callbacks.onWaveStart?.(ready);

    const results = await Promise.allSettled(
      ready.map(async (node) => {
        const success = await runner(node);
        return { node, success };
      }),
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        const { node, success } = result.value;
        if (success) {
          completed.add(node.id);
        } else {
          failed.add(node.id);
        }
        callbacks.onNodeComplete?.(node, result.value.success);
      } else {
        // Shouldn't happen if runner catches its own errors
        const nodeId = ready[results.indexOf(result)]?.id;
        if (nodeId) failed.add(nodeId);
      }
    }
  }

  return {
    completed,
    failed,
    blocked,
    allPassed: completed.size === nodes.length,
  };
}
