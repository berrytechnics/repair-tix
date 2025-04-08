#!/usr/bin/env node

const { program } = require("commander");
const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const package = require("./package.json");

// Helper function to execute commands and log output
function executeCommand(command, options = {}) {
  try {
    console.log(`Executing: ${command}`);
    const output = execSync(command, {
      stdio: options.stdio || "inherit",
      cwd: options.cwd || process.cwd(),
    });
    if (options.stdio === "pipe") {
      return output.toString().trim();
    }
    return true;
  } catch (error) {
    if (options.ignoreError) {
      console.warn(`Command failed but continuing: ${error.message}`);
      return false;
    }
    console.error(`Error executing command: ${error.message}`);
    process.exit(1);
  }
}

// Check if docker is running and the container exists
function isDockerRunning() {
  try {
    const output = execSync("docker ps", { stdio: "pipe" });
    return output.toString().includes("repair-api");
  } catch (error) {
    return false;
  }
}

// Version information
program
  .version(package.version)
  .description("CLI for Electronics Repair Business Management System");

// Run command
program
  .command("run")
  .description("Build and run the application with Docker")
  .action(() => {
    console.log("Starting application...");
    executeCommand("docker-compose down");
    executeCommand("docker-compose build backend frontend");
    executeCommand("docker-compose up -d");
    console.log("Application is running in the background!");
    console.log("- Frontend: http://localhost:3000");
    console.log("- Backend API: http://localhost:4000");
  });

// Cleanup command
program
  .command("cleanup")
  .description("Clean up Docker resources")
  .action(() => {
    console.log("Cleaning up Docker resources...");
    executeCommand("docker-compose down", { ignoreError: true });
    executeCommand("docker system prune -a -f --volumes");
    console.log("Cleanup complete!");
  });

// Database migrations
program
  .command("migrate")
  .description("Run database migrations")
  .action(() => {
    if (isDockerRunning()) {
      console.log("Running migrations inside Docker container...");
      executeCommand("docker exec repair-api npx sequelize-cli db:migrate");
    } else {
      console.log("Running migrations locally...");
      executeCommand("npx sequelize-cli db:migrate", {
        cwd: path.join(process.cwd(), "backend"),
      });
    }
  });

// Undo migrations
program
  .command("migrate:undo")
  .description("Undo the last database migration")
  .option("-a, --all", "Undo all migrations")
  .action((options) => {
    const command = options.all ? "db:migrate:undo:all" : "db:migrate:undo";

    if (isDockerRunning()) {
      console.log(`Undoing migrations inside Docker container...`);
      executeCommand(`docker exec repair-api npx sequelize-cli ${command}`);
    } else {
      console.log(`Undoing migrations locally...`);
      executeCommand(`npx sequelize-cli ${command}`, {
        cwd: path.join(process.cwd(), "backend"),
      });
    }
  });

// Seed database
program
  .command("seed")
  .description("Seed the database with initial data")
  .option("-u, --undo", "Undo all seeds")
  .action((options) => {
    const command = options.undo ? "db:seed:undo:all" : "db:seed:all";

    if (isDockerRunning()) {
      console.log(
        `${
          options.undo ? "Undoing" : "Running"
        } seeds inside Docker container...`
      );
      executeCommand(`docker exec repair-api npx sequelize-cli ${command}`);
    } else {
      console.log(`${options.undo ? "Undoing" : "Running"} seeds locally...`);
      executeCommand(`npx sequelize-cli ${command}`, {
        cwd: path.join(process.cwd(), "backend"),
      });
    }
  });

// Parse command line arguments
program.parse(process.argv);

// Display help if no arguments provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
