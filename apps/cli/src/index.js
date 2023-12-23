import fs from "fs-extra";
import { program } from "commander";
import { logger } from "./helpers/logger.js";
import { initHistory } from "./tasks/history/init.js";
import { updateHistory } from "./tasks/history/update.js";

// Load environment variables from monorepo root

const pkg = await fs.readJson("./package.json");
const contexts = await fs.readdir("./src/contexts");

// disable no-console rule in this file
/* eslint-disable no-console */

program
  .description("OSM for Cities")
  .version(pkg.version)
  .configureOutput({
    writeErr: (str) => process.stdout.write(`[ERR] ${str}`),
  });

program
  .command("init-history")
  .option("-l, --local <local_history_path>", "Use local history file")
  .option("-s, --s3", "Persist files to an AWS S3 bucket", false)
  .option(
    "-O, --overwrite",
    "Overwrite existing history file, if exists",
    false
  )
  .description(
    "Extract the history of the area covered by osmforcities, from remote planet full history or a local file."
  )
  .action(initHistory);

program
  .command("update-history")
  .option("-s, --s3", "Persist files to an AWS S3 bucket", false)
  .description(
    "Apply daily diffs to presets history file and update it to present day"
  )
  .option("-r, --recursive", "Repeat updates to present day", false)
  .action(updateHistory);

program
  .command("list-contexts")
  .description("List available contexts")
  .action(async () => {
    const contexts = await fs.readdir("./src/contexts");

    // Print available contexts
    console.log("Available contexts: ");
    contexts.forEach((context) => {
      console.log(`- ${context}`);
    });
  });

program
  .command("context")
  .option("-s, --s3", "Download history from AWS S3 bucket, if exists", false)
  .option("-r, --recursive", "Repeat updates to present day", false)
  .option(
    "-O, --overwrite",
    "Overwrite history from remote repository, if exists",
    false
  )
  .option(
    "-f, --force",
    "Force the execution of the action, even if it's not safe",
    false
  )
  .argument("<name>", "Context name", (contextName) => {
    // Check if context exists, it should be a folder in ./src/contexts
    if (!contexts.includes(contextName)) {
      program.error(
        `Context not found, run 'list-contexts' command to see available contexts.`
      );
    }
    return contextName;
  })
  .argument(
    "<action>",
    "Action type, must be 'setup', 'update' or 'reset-git-remote'",
    (actionType) => {
      const allowedActions = ["setup", "update", "reset-git-remote"];
      // Check if action is valid
      if (!allowedActions.includes(actionType)) {
        program.error(
          `Action not found, must be one of: ${allowedActions.join(", ")}.`
        );
      }
      return actionType;
    }
  )
  .action(async (contextName, actionType, options) => {
    // Execute the action
    const context = await import(
      `./contexts/${contextName}/actions/${actionType}.js`
    );
    await context.default(options);
  });

/**
 * Handle unhandled rejections
 */
process.on("unhandledRejection", function (error) {
  // Convert error to object, copying its properties
  const errorOutput = {
    ...error,
  };

  // If error is an instance of Error, add stack and name to output
  if (error instanceof Error) {
    errorOutput.stack = error.stack;
    errorOutput.name = error.name;
  }

  logger.error(JSON.stringify(errorOutput, null, 2));
});

// Parse the arguments
program.parse();
