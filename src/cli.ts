import { runCli } from "./app.js";

const exitCode = await runCli();

if (exitCode !== 0) {
  process.exit(exitCode);
}
