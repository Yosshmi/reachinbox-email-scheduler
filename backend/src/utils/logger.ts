type LogData = Record<string, unknown>;

function write(level: "info" | "error", message: string, data?: LogData): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...data,
  };

  const output = JSON.stringify(entry);
  if (level === "error") console.error(output);
  else console.log(output);
}

export const logger = {
  info: (message: string, data?: LogData) => write("info", message, data),
  error: (message: string, data?: LogData) => write("error", message, data),
};
