#!/usr/bin/env node

const { program } = require("commander");
const { execSync, spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const package = require("./package.json");

// ANSI color codes for terminal output
const colors = {
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
};

// Helper function for colorized logging
function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Helper function to execute commands and log output
function executeCommand(command, options = {}) {
  try {
    log(`Executing: ${command}`, "green");
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
      log(`Command failed but continuing: ${error.message}`, "yellow");
      return false;
    }
    log(`Error executing command: ${error.message}`, "red");
    process.exit(1);
  }
}

// Check if .env files exist, create from examples if not
function setupEnvFiles() {
  const backendEnvPath = path.join(process.cwd(), "backend", ".env");
  const frontendEnvPath = path.join(process.cwd(), "frontend", ".env");
  const backendEnvExamplePath = path.join(
    process.cwd(),
    "backend",
    ".env.example"
  );
  const frontendEnvExamplePath = path.join(
    process.cwd(),
    "frontend",
    ".env.example"
  );

  if (!fs.existsSync(backendEnvPath) && fs.existsSync(backendEnvExamplePath)) {
    log("Creating backend/.env from example", "yellow");
    fs.copyFileSync(backendEnvExamplePath, backendEnvPath);
  }

  if (
    !fs.existsSync(frontendEnvPath) &&
    fs.existsSync(frontendEnvExamplePath)
  ) {
    log("Creating frontend/.env from example", "yellow");
    fs.copyFileSync(frontendEnvExamplePath, frontendEnvPath);
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

// Main application commands
program
  .command("dev")
  .description("Start development environment with live logs")
  .option("-d, --detached", "Run in detached mode (no logs)")
  .action((options) => {
    log("Starting development environment...", "green");

    // Set up environment files
    setupEnvFiles();

    // Build and start containers
    log("Building and starting containers in development mode...", "green");
    executeCommand("docker-compose up --build -d");

    // Show logs if not in detached mode
    if (!options.detached) {
      log(
        "Showing logs (Ctrl+C to exit logs, containers will keep running)",
        "green"
      );

      // Use spawn to handle the logs in a way that allows for proper Ctrl+C handling
      const logs = spawn("docker-compose", ["logs", "-f"], {
        stdio: "inherit",
      });

      // Handle SIGINT (Ctrl+C) to allow graceful exit while keeping containers running
      process.on("SIGINT", () => {
        log("Exiting logs. Containers are still running.", "yellow");
        logs.kill();
        process.exit(0);
      });
    } else {
      log("Development environment is running in detached mode", "green");
      log("Use 'docker-compose logs -f' to view logs if needed", "yellow");
    }
  });

program
  .command("start")
  .description("Build and run the application in production mode")
  .action(() => {
    log("Starting application in production mode...", "blue");
    executeCommand("docker-compose down");
    executeCommand("NODE_ENV=production docker-compose up --build -d");
    log("Production application is running in the background!", "blue");
    log("- Frontend: http://localhost:3000");
    log("- Backend API: http://localhost:4000");
  });

program
  .command("stop")
  .description("Stop running containers without removing them")
  .action(() => {
    log("Stopping containers...", "yellow");
    executeCommand("docker-compose stop");
    log(
      "Containers stopped. Use 'npm run dev' or 'npm run start' to start them again.",
      "green"
    );
  });

program
  .command("cleanup")
  .description(
    "Clean up Docker resources (removes all containers, volumes, and images)"
  )
  .action(() => {
    log("Cleaning up Docker resources...", "yellow");
    executeCommand("docker-compose down", { ignoreError: true });
    executeCommand("docker system prune -a -f --volumes");
    log("Cleanup complete!", "green");
  });

// Database management commands
program
  .command("db")
  .description("Database management commands")
  .addHelpText(
    "after",
    `
  Examples:
    $ repair-manager db:migrate       # Run all pending migrations
    $ repair-manager db:migrate:undo  # Undo the last migration
    $ repair-manager db:reset         # Reset the database (undo all, then migrate)
    $ repair-manager db:seed          # Seed the database
  `
  );

program
  .command("db:migrate")
  .description("Run database migrations")
  .action(() => {
    if (isDockerRunning()) {
      log("Running migrations inside Docker container...", "green");
      executeCommand("docker exec repair-api npx sequelize-cli db:migrate");
    } else {
      log("Running migrations locally...", "green");
      executeCommand("npx sequelize-cli db:migrate", {
        cwd: path.join(process.cwd(), "backend"),
      });
    }
  });

program
  .command("db:migrate:undo")
  .description("Undo the last database migration")
  .option("-a, --all", "Undo all migrations")
  .action((options) => {
    const command = options.all ? "db:migrate:undo:all" : "db:migrate:undo";

    if (isDockerRunning()) {
      log(`Undoing migrations inside Docker container...`, "green");
      executeCommand(`docker exec repair-api npx sequelize-cli ${command}`);
    } else {
      log(`Undoing migrations locally...`, "green");
      executeCommand(`npx sequelize-cli ${command}`, {
        cwd: path.join(process.cwd(), "backend"),
      });
    }
  });

program
  .command("db:reset")
  .description("Reset database (undo all migrations, then migrate)")
  .action(() => {
    log("Resetting database...", "yellow");

    if (isDockerRunning()) {
      executeCommand(
        "docker exec repair-api npx sequelize-cli db:migrate:undo:all"
      );
      executeCommand("docker exec repair-api npx sequelize-cli db:migrate");
      log("Database reset complete!", "green");
    } else {
      executeCommand("npx sequelize-cli db:migrate:undo:all", {
        cwd: path.join(process.cwd(), "backend"),
      });
      executeCommand("npx sequelize-cli db:migrate", {
        cwd: path.join(process.cwd(), "backend"),
      });
      log("Database reset complete!", "green");
    }
  });

program
  .command("db:seed")
  .description("Seed the database with initial data")
  .option("-u, --undo", "Undo all seeds")
  .action((options) => {
    const command = options.undo ? "db:seed:undo:all" : "db:seed:all";

    if (isDockerRunning()) {
      log(
        `${
          options.undo ? "Undoing" : "Running"
        } seeds inside Docker container...`,
        "green"
      );
      executeCommand(`docker exec repair-api npx sequelize-cli ${command}`);
    } else {
      log(`${options.undo ? "Undoing" : "Running"} seeds locally...`, "green");
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
