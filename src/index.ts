import { Command } from "commander";
import { registerRunCommand } from "./commands/run.js";
import { registerHistoryCommand } from "./commands/history.js";
import { registerConfigCommand } from "./commands/config.js";
import { registerDemoCommand } from "./commands/demo.js";
import { registerGlewReviewCommand } from "./commands/glew-review.js";

const program = new Command();

program
  .name("harness")
  .description("Multi-agent workflow orchestrator powered by Claude Code CLI")
  .version("1.0.0");

registerRunCommand(program);
registerHistoryCommand(program);
registerConfigCommand(program);
registerDemoCommand(program);
registerGlewReviewCommand(program);

program.parse();
