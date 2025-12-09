import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { NodeSDK } from "@opentelemetry/sdk-node";

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
    "service.version": process.env.npm_package_version || "1.0.0",
    "deployment.environment": process.env.NODE_ENV || "development",
  });

  const logExporter = new OTLPLogExporter({
    url: "https://eu.i.posthog.com/i/v1/logs",
    headers: {
      Authorization: `Bearer ${projectToken}`,
    },
  });

  const sdk = new NodeSDK({
    resource,
    logRecordProcessor: new BatchLogRecordProcessor(logExporter),
  });

  sdk.start();
}
