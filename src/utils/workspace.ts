import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

export function resolveWorkspace(explicit?: string): string {
  if (explicit) return path.resolve(explicit);
  const env = process.env.WORK_DIR;
  if (env) return path.resolve(env);
  return process.cwd();
}

export function validateWorkspace(dir: string): void {
  if (!fs.existsSync(dir)) {
    throw new Error(`Workspace directory does not exist: ${dir}`);
  }
  if (!fs.statSync(dir).isDirectory()) {
    throw new Error(`Workspace path is not a directory: ${dir}`);
  }
}

export function workspaceHasContent(dir: string): boolean {
  if (!fs.existsSync(dir)) return false;
  const entries = fs.readdirSync(dir);
  return entries.some((f) => !f.startsWith(".") && f !== "__pycache__" && f !== "node_modules");
}

export function getFileTree(dir: string, maxDepth = 3): string {
  try {
    const output = execFileSync(
      "find",
      [
        ".",
        "-maxdepth",
        String(maxDepth),
        "-type",
        "f",
        "-not",
        "-path",
        "./.git/*",
        "-not",
        "-path",
        "./node_modules/*",
        "-not",
        "-path",
        "./__pycache__/*",
        "-not",
        "-path",
        "./.venv/*",
        "-not",
        "-path",
        "./venv/*",
      ],
      { cwd: dir, encoding: "utf-8", timeout: 10000 },
    );
    const lines = output.trim().split("\n");
    if (lines.length > 500) {
      return lines.slice(0, 500).join("\n") + `\n... (${lines.length - 500} more files)`;
    }
    return output.trim();
  } catch {
    return "(could not read file tree)";
  }
}

export function readReadme(dir: string): string {
  for (const name of ["README.md", "README.rst", "README.txt", "README"]) {
    const p = path.join(dir, name);
    if (fs.existsSync(p) && fs.statSync(p).isFile()) {
      return fs.readFileSync(p, "utf-8").slice(0, 3000);
    }
  }
  return "";
}
