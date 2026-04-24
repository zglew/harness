export function extractJson<T = unknown>(response: string): T {
  try {
    return JSON.parse(response) as T;
  } catch {
    // Try to find JSON array boundaries
    const start = response.indexOf("[");
    const end = response.lastIndexOf("]") + 1;
    if (start !== -1 && end > start) {
      return JSON.parse(response.slice(start, end)) as T;
    }

    // Try to find JSON object boundaries
    const objStart = response.indexOf("{");
    const objEnd = response.lastIndexOf("}") + 1;
    if (objStart !== -1 && objEnd > objStart) {
      return JSON.parse(response.slice(objStart, objEnd)) as T;
    }

    throw new Error(`Could not extract valid JSON from response:\n${response.slice(0, 500)}`);
  }
}

export function parseResult(response: string): boolean {
  const lines = response.trim().split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line === "RESULT: PASS") return true;
    if (line === "RESULT: FAIL") return false;
  }
  return false;
}
