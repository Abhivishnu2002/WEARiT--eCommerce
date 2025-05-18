const winston = require("winston")
const path = require("path")
const fs = require("fs")
const logDir = "logs"
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir)
}

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
)

const createLogger = (module) => {
  return winston.createLogger({
    level: process.env.LOG_LEVEL || "info",
    format: logFormat,
    defaultMeta: { service: module },
    transports: [
      new winston.transports.File({
        filename: path.join(logDir, "error.log"),
        level: "error",
      }),
      new winston.transports.File({
        filename: path.join(logDir, "combined.log"),
      }),
      new winston.transports.File({
        filename: path.join(logDir, `${module}.log`),
      }),
    ],
  })
}

if (process.env.NODE_ENV !== "production") {
  winston.loggers.add("console", {
    level: "debug",
    format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    transports: [new winston.transports.Console()],
  })
}

module.exports = { createLogger }
