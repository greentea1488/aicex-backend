import pino from "pino";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execAsync = promisify(exec);
const isProd = process.env.NODE_ENV === "production";

// Log directory
const logsDir = path.resolve(__dirname, "..", "..", "logs");
console.log(logsDir);

// Ensure logs directory exists
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Get the current date for daily log files
const getCurrentDate = () => {
  const now = new Date();
  return now.toISOString().split("T")[0]; // YYYY-MM-DD
};

// Daily log file destination
const dailyLogFile = path.join(logsDir, `${getCurrentDate()}.log`);

// Production log transport (minified)
const prodTransport = pino.transport({
  target: "pino/file",
  options: {
    destination: dailyLogFile,
    mkdir: true,
  },
});

// Development log transport (pretty)
const devTransport = pino.transport({
  target: "pino-pretty",
  options: {
    colorize: true,
    translateTime: "yyyy-mm-dd HH:MM:ss.l",
    ignore: "pid,hostname",
  },
});

// Create the logger
export const logger = pino(
  {
    level: isProd ? "info" : "debug",
    formatters: {
      level: label => ({ level: label }), // This is safe because it's not passed to the transport
    },
    timestamp: () => `,"time":"${new Date().toISOString()}"`,
  },
  isProd ? prodTransport : devTransport
);

export type Logger = typeof logger;
