import chalk from "chalk";

export class Logger {
  private buffer: string[] = [];
  public verbose = false;

  private timestamp(): string {
    return new Date().toLocaleTimeString("en-US", { hour12: false });
  }

  log(msg: string): void {
    const line = `[${this.timestamp()}] ${msg}`;
    this.buffer.push(line);
    console.log(`  ${line}`);
  }

  success(msg: string): void {
    const line = `[${this.timestamp()}] ${msg}`;
    this.buffer.push(line);
    console.log(`  ${chalk.green("+")} ${line}`);
  }

  error(msg: string): void {
    const line = `[${this.timestamp()}] ${msg}`;
    this.buffer.push(line);
    console.log(`  ${chalk.red("x")} ${line}`);
  }

  warn(msg: string): void {
    const line = `[${this.timestamp()}] ${msg}`;
    this.buffer.push(line);
    console.log(`  ${chalk.yellow("!")} ${line}`);
  }

  debug(msg: string): void {
    if (!this.verbose) return;
    const line = `[${this.timestamp()}] ${msg}`;
    this.buffer.push(line);
    console.log(`  ${chalk.dim(line)}`);
  }

  getBuffer(): string[] {
    return this.buffer.slice(-100);
  }

  clear(): void {
    this.buffer = [];
  }
}
