import { spawn, type ChildProcess } from "node:child_process";

export interface SpawnResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
}

const activeProcesses = new Set<ChildProcess>();

export function killAllActive(): void {
  for (const proc of activeProcesses) {
    proc.kill("SIGTERM");
  }
  activeProcesses.clear();
}

export function spawnWithTimeout(
  command: string,
  args: string[],
  options: {
    cwd: string;
    timeout: number;
  },
): Promise<SpawnResult> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const proc = spawn(command, args, {
      cwd: options.cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });

    activeProcesses.add(proc);

    const chunks: Buffer[] = [];
    const errChunks: Buffer[] = [];

    proc.stdout.on("data", (data: Buffer) => chunks.push(data));
    proc.stderr.on("data", (data: Buffer) => errChunks.push(data));

    const timer = setTimeout(() => {
      proc.kill("SIGTERM");
      activeProcesses.delete(proc);
      reject(new Error(`Process timed out after ${options.timeout}s`));
    }, options.timeout * 1000);

    proc.on("close", (code) => {
      clearTimeout(timer);
      activeProcesses.delete(proc);
      resolve({
        stdout: Buffer.concat(chunks).toString("utf-8").trim(),
        stderr: Buffer.concat(errChunks).toString("utf-8").trim(),
        exitCode: code ?? 1,
        duration: (Date.now() - start) / 1000,
      });
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      activeProcesses.delete(proc);
      reject(err);
    });
  });
}
