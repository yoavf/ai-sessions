import { logs, SeverityNumber } from "@opentelemetry/api-logs";

type LogAttributes = Record<string, string | number | boolean | undefined>;

const logger = logs.getLogger("ai-sessions");

function emit(
  severityNumber: SeverityNumber,
  severityText: string,
  message: string,
  attributes?: LogAttributes,
) {
  // Always log to console for local dev and Vercel logs
  const consoleMethod =
    severityNumber >= SeverityNumber.ERROR
      ? console.error
      : severityNumber >= SeverityNumber.WARN
        ? console.warn
        : console.log;

  if (attributes && Object.keys(attributes).length > 0) {
    consoleMethod(message, attributes);
  } else {
    consoleMethod(message);
  }

  // Emit to OpenTelemetry (will be sent to PostHog if configured)
  // Filter out undefined values before emitting
  const filteredAttributes: Record<string, string | number | boolean> = {};
  if (attributes) {
    for (const [key, value] of Object.entries(attributes)) {
      if (value !== undefined) {
        filteredAttributes[key] = value;
      }
    }
  }

  logger.emit({
    severityNumber,
    severityText,
    body: message,
    ...(Object.keys(filteredAttributes).length > 0
      ? { attributes: filteredAttributes }
      : {}),
  });
}

export const log = {
  debug(message: string, attributes?: LogAttributes) {
    emit(SeverityNumber.DEBUG, "DEBUG", message, attributes);
  },

  info(message: string, attributes?: LogAttributes) {
    emit(SeverityNumber.INFO, "INFO", message, attributes);
  },

  warn(message: string, attributes?: LogAttributes) {
    emit(SeverityNumber.WARN, "WARN", message, attributes);
  },

  error(message: string, attributes?: LogAttributes) {
    emit(SeverityNumber.ERROR, "ERROR", message, attributes);
  },
};
