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

  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      "service.name": "ai-sessions",
    }),
    logRecordProcessor: new BatchLogRecordProcessor(
      new OTLPLogExporter({
        url: `https://eu.i.posthog.com/i/v1/logs?token=${projectToken}`,
      }),
    ),
  });

  sdk.start();

  console.log("OpenTelemetry logging initialized for PostHog");
}
