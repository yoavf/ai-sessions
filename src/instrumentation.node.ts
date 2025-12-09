import { logs } from "@opentelemetry/api-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  BatchLogRecordProcessor,
  LoggerProvider,
} from "@opentelemetry/sdk-logs";

export function registerOTel() {
  const projectToken = process.env.POSTHOG_PROJECT_TOKEN;

  if (!projectToken) {
    console.warn(
      "POSTHOG_PROJECT_TOKEN not set - OpenTelemetry logging disabled",
    );
    return;
  }

  const resource = resourceFromAttributes({
    "service.name": "ai-sessions",
  });

  const logExporter = new OTLPLogExporter({
    url: "https://eu.i.posthog.com/i/v1/logs",
    headers: {
      Authorization: `Bearer ${projectToken}`,
    },
  });

  const loggerProvider = new LoggerProvider({
    resource,
    processors: [new BatchLogRecordProcessor(logExporter)],
  });

  // Register globally so logs.getLogger() uses our provider
  logs.setGlobalLoggerProvider(loggerProvider);
}
