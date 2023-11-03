import execa from "execa";
import { logger } from "./logger.js";

export default async function exec(cmd, args) {
  const execProcess = execa(cmd, args);

  // Log stdout
  execProcess.stdout.on("data", (data) => {
    const lines = data.toString().split("\n");
    lines.forEach((line) => {
      if (line.length > 0) {
        logger.info(line);
      }
    });
  });

  return execProcess;
}
