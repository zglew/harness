import ora, { type Ora } from "ora";

let activeSpinner: Ora | null = null;

export function startSpinner(text: string): Ora {
  if (activeSpinner) activeSpinner.stop();
  activeSpinner = ora({ text, spinner: "dots" }).start();
  return activeSpinner;
}

export function stopSpinner(success?: boolean, text?: string): void {
  if (!activeSpinner) return;
  if (success === true) {
    activeSpinner.succeed(text);
  } else if (success === false) {
    activeSpinner.fail(text);
  } else {
    activeSpinner.stop();
  }
  activeSpinner = null;
}

export async function withSpinner<T>(
  text: string,
  fn: () => Promise<T>,
): Promise<T> {
  const spinner = startSpinner(text);
  try {
    const result = await fn();
    spinner.succeed();
    return result;
  } catch (err) {
    spinner.fail();
    throw err;
  }
}
