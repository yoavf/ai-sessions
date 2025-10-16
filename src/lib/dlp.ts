import { DlpServiceClient } from "@google-cloud/dlp";

// Initialize DLP client
// Supports both file path (local dev) and JSON content (Vercel)
let dlp: DlpServiceClient | null = null;

if (process.env.GOOGLE_CLOUD_PROJECT) {
  try {
    // If GOOGLE_APPLICATION_CREDENTIALS_JSON is set (Vercel), parse it as JSON
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      const credentials = JSON.parse(
        process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
      );
      dlp = new DlpServiceClient({ credentials });
    } else {
      // Otherwise use Application Default Credentials or GOOGLE_APPLICATION_CREDENTIALS file path
      dlp = new DlpServiceClient();
    }
  } catch (error) {
    console.error("Failed to initialize DLP client:", error);
    dlp = null;
  }
}

export interface SensitiveDataFinding {
  infoType: string;
  likelihood: string;
  quote: string;
  location: {
    byteRange: { start: number; end: number };
  };
}

export interface DlpScanResult {
  hasSensitiveData: boolean;
  findings: SensitiveDataFinding[];
  categories: string[];
  scrubbedContent?: string; // If scrubbing was performed, this contains the cleaned content
}

// DLP has a 512KB limit per request
const DLP_MAX_BYTES = 512 * 1024; // 524,288 bytes

// Info types that should be scrubbed instead of blocking upload
// NOTE: We now pre-scrub emails and IPs with regex before DLP, so these won't appear in DLP results
// PHONE_NUMBER is scrubbed because DLP often flags internal IDs (like tool call IDs) as phone numbers
// All credential types (tokens, passwords, keys) are scrubbed to allow developers to share transcripts
const SCRUB_TYPES = new Set([
  "IP_ADDRESS",
  "EMAIL_ADDRESS",
  "PHONE_NUMBER",
  "MAC_ADDRESS",
  // Credentials & Secrets (scrub instead of block)
  "AUTH_TOKEN",
  "AZURE_AUTH_TOKEN",
  "AWS_CREDENTIALS",
  "BASIC_AUTH_HEADER",
  "ENCRYPTION_KEY",
  "GCP_API_KEY",
  "GCP_CREDENTIALS",
  "HTTP_COOKIE",
  "JSON_WEB_TOKEN",
  "OAUTH_CLIENT_SECRET",
  "PASSWORD",
  "WEAK_PASSWORD_HASH",
  "XSRF_TOKEN",
]);

// Regex patterns for pre-scrubbing (before DLP)
// Note: We use lookbehind/lookahead to ensure we're not breaking escape sequences like \t, \n, etc.
// Match emails, but not if preceded by backslash (to avoid breaking JSON escapes)
const EMAIL_REGEX = /(?<!\\)[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}/g;
// Match IPv4, but not if preceded by backslash
const IPV4_REGEX =
  /(?<!\\)(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)/g;
// Match IPv6, but not if preceded by backslash
const IPV6_REGEX = /(?<!\\)(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}/g;

/**
 * Pre-scrub emails and IP addresses before sending to DLP.
 * This is more reliable than DLP detection and saves API costs.
 */
function preScrubEmailsAndIPs(content: string): string {
  let scrubbed = content;
  let _emailCount = 0;
  let _ipCount = 0;

  // Replace all emails
  scrubbed = scrubbed.replace(EMAIL_REGEX, (_match) => {
    _emailCount++;
    return "[REDACTED-EMAIL_ADDRESS]";
  });

  // Replace all IPv4 addresses
  scrubbed = scrubbed.replace(IPV4_REGEX, (_match) => {
    _ipCount++;
    return "[REDACTED-IP_ADDRESS]";
  });

  // Replace all IPv6 addresses
  scrubbed = scrubbed.replace(IPV6_REGEX, (_match) => {
    _ipCount++;
    return "[REDACTED-IP_ADDRESS]";
  });

  return scrubbed;
}

/**
 * Scrubs sensitive data from JSONL content by parsing each line,
 * replacing sensitive values, and re-serializing.
 * This ensures JSON structure remains valid after replacement.
 */
function scrubContent(
  content: string,
  findings: SensitiveDataFinding[],
): string {
  // Build a map of sensitive values to replace
  const valuesToRedact = new Map<string, string>();
  for (const finding of findings) {
    if (finding.quote) {
      valuesToRedact.set(finding.quote, `[REDACTED-${finding.infoType}]`);
    }
  }

  // Process line by line to maintain JSONL structure
  const lines = content.split("\n");
  let _scrubCount = 0;
  const scrubbedLines = lines.map((line, _index) => {
    if (!line.trim()) return line;

    try {
      // Parse the JSON line
      const parsed = JSON.parse(line);

      // Recursively scrub all string values in the object
      const scrubbed = scrubObject(parsed, valuesToRedact);

      // Re-serialize
      const serialized = JSON.stringify(scrubbed);

      // Check if anything was actually scrubbed
      if (serialized !== JSON.stringify(parsed)) {
        _scrubCount++;
      }

      return serialized;
    } catch (_e) {
      // If line isn't valid JSON, do simple text replacement
      let scrubbedLine = line;
      for (const [original, replacement] of valuesToRedact.entries()) {
        if (scrubbedLine.includes(original)) {
          scrubbedLine = scrubbedLine.split(original).join(replacement);
        }
      }
      return scrubbedLine;
    }
  });

  return scrubbedLines.join("\n");
}

/**
 * Recursively scrub sensitive values from an object
 */
function scrubObject(
  obj: unknown,
  valuesToRedact: Map<string, string>,
): unknown {
  if (typeof obj === "string") {
    // Check if this string contains any sensitive values
    let result = obj;
    for (const [original, replacement] of valuesToRedact.entries()) {
      result = result.split(original).join(replacement);
    }
    return result;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => scrubObject(item, valuesToRedact));
  }

  if (obj !== null && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = scrubObject(value, valuesToRedact);
    }
    return result;
  }

  return obj;
}

/**
 * Truncates oversized string values in an object to prevent individual lines
 * from exceeding DLP size limits. Adds a marker when truncation occurs.
 */
function truncateOversizedValues(
  obj: unknown,
  maxSize: number = 100000, // 100KB per field
): unknown {
  if (typeof obj === "string") {
    const size = Buffer.byteLength(obj, "utf8");
    if (size > maxSize) {
      // Truncate to maxSize and add marker
      const truncated = obj.substring(0, Math.floor(maxSize / 2));
      return `${truncated}\n\n[... truncated ${size - maxSize} bytes ...]`;
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => truncateOversizedValues(item, maxSize));
  }

  if (obj !== null && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = truncateOversizedValues(value, maxSize);
    }
    return result;
  }

  return obj;
}

/**
 * Scans content for sensitive data using Google Cloud DLP
 * Returns findings if sensitive data is detected
 * Handles large files by chunking them into smaller pieces
 * Automatically scrubs IP addresses (and other configured types) instead of blocking
 */
export async function scanForSensitiveData(
  content: string,
): Promise<DlpScanResult> {
  // Pre-scrub emails and IPs with regex (more reliable and cheaper than DLP)
  const preScrubbed = preScrubEmailsAndIPs(content);
  const hasPreScrubbing = preScrubbed !== content;

  // If DLP is not configured, return pre-scrubbed content if any
  if (!dlp || !process.env.GOOGLE_CLOUD_PROJECT) {
    console.warn("DLP not configured, skipping sensitive data scan");
    if (hasPreScrubbing) {
      return {
        hasSensitiveData: false,
        findings: [],
        categories: [],
        scrubbedContent: preScrubbed,
      };
    }
    return {
      hasSensitiveData: false,
      findings: [],
      categories: [],
    };
  }

  try {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT;
    // Use pre-scrubbed content for DLP scanning
    const contentBytes = Buffer.byteLength(preScrubbed, "utf8");

    // Build the inspect config (shared across all chunks)
    // Note: Some detectors are region-specific. Using 'us' region for broader detector support.
    const inspectConfig = {
      infoTypes: [
        // Credentials & Secrets (widely available)
        { name: "AUTH_TOKEN" },
        { name: "AZURE_AUTH_TOKEN" },
        { name: "AWS_CREDENTIALS" },
        { name: "BASIC_AUTH_HEADER" },
        { name: "ENCRYPTION_KEY" },
        { name: "GCP_API_KEY" },
        { name: "GCP_CREDENTIALS" },
        { name: "HTTP_COOKIE" },
        { name: "JSON_WEB_TOKEN" },
        { name: "OAUTH_CLIENT_SECRET" },
        { name: "PASSWORD" },
        { name: "WEAK_PASSWORD_HASH" },
        { name: "XSRF_TOKEN" },

        // Personal Identifiable Information
        { name: "CREDIT_CARD_NUMBER" },
        { name: "EMAIL_ADDRESS" },
        { name: "IP_ADDRESS" },
        { name: "MAC_ADDRESS" },
        { name: "PHONE_NUMBER" },
        { name: "US_DRIVERS_LICENSE_NUMBER" },
        { name: "US_PASSPORT" },
        { name: "US_SOCIAL_SECURITY_NUMBER" },
      ],
      minLikelihood: "LIKELY" as const, // POSSIBLE, LIKELY, VERY_LIKELY
      limits: {
        maxFindingsPerRequest: 100,
      },
      includeQuote: true,
    };

    // If content is small enough, scan it directly
    if (contentBytes <= DLP_MAX_BYTES) {
      const request = {
        parent: `projects/${projectId}/locations/us`,
        inspectConfig,
        item: {
          value: preScrubbed,
        },
      };

      const response = await dlp.inspectContent(request);
      const findings = response[0]?.result?.findings || [];

      if (findings.length === 0) {
        return {
          hasSensitiveData: false,
          findings: [],
          categories: [],
        };
      }

      // Map findings
      const mappedFindings: SensitiveDataFinding[] = findings.map((f) => ({
        infoType: f.infoType?.name || "UNKNOWN",
        likelihood: String(f.likelihood || "UNKNOWN"),
        quote: f.quote || "",
        location: {
          byteRange: {
            start: Number(f.location?.byteRange?.start || 0),
            end: Number(f.location?.byteRange?.end || 0),
          },
        },
      }));

      // Separate scrub-able and block-able findings
      const scrubFindings = mappedFindings.filter((f) =>
        SCRUB_TYPES.has(f.infoType),
      );
      const blockFindings = mappedFindings.filter(
        (f) => !SCRUB_TYPES.has(f.infoType),
      );

      // Extract unique categories
      const _categories = [
        ...new Set(mappedFindings.map((f) => f.infoType).filter(Boolean)),
      ] as string[];

      // If there are findings that should block, return them
      if (blockFindings.length > 0) {
        return {
          hasSensitiveData: true,
          findings: blockFindings,
          categories: blockFindings.map((f) => f.infoType),
        };
      }

      // Only scrub-able findings - scrub them from pre-scrubbed content
      if (scrubFindings.length > 0) {
        const scrubbedContent = scrubContent(preScrubbed, scrubFindings);
        return {
          hasSensitiveData: true,
          findings: scrubFindings,
          categories: scrubFindings.map((f) => f.infoType),
          scrubbedContent,
        };
      }

      // No DLP findings, but we may have pre-scrubbed
      if (hasPreScrubbing) {
        return {
          hasSensitiveData: false,
          findings: [],
          categories: [],
          scrubbedContent: preScrubbed,
        };
      }

      // No changes
      return {
        hasSensitiveData: false,
        findings: [],
        categories: [],
      };
    }

    // Content is too large - split into chunks by lines to avoid breaking JSON structures

    const lines = preScrubbed.split("\n");
    const processedLines: string[] = [];
    const chunks: string[] = [];
    let currentChunk = "";
    let truncatedCount = 0;

    for (const line of lines) {
      let processedLine = line;
      const lineSize = Buffer.byteLength(line, "utf8");

      // If a single line is too large, try to truncate large values within it
      if (lineSize > DLP_MAX_BYTES) {
        try {
          // Try to parse and truncate the line
          const parsed = JSON.parse(line);
          const truncated = truncateOversizedValues(parsed);
          processedLine = JSON.stringify(truncated);
          truncatedCount++;

          const newSize = Buffer.byteLength(processedLine, "utf8");

          // If still too large after truncation, skip it
          if (newSize > DLP_MAX_BYTES) {
            // Save current chunk and skip this line
            if (currentChunk) {
              chunks.push(currentChunk);
              currentChunk = "";
            }
            continue;
          }
        } catch (_e) {
          // Save current chunk and skip this unparseable line
          if (currentChunk) {
            chunks.push(currentChunk);
            currentChunk = "";
          }
          continue;
        }
      }

      // Add processed line to our list
      processedLines.push(processedLine);

      const testChunk = currentChunk
        ? `${currentChunk}\n${processedLine}`
        : processedLine;
      const testSize = Buffer.byteLength(testChunk, "utf8");

      if (testSize > DLP_MAX_BYTES && currentChunk) {
        // Current chunk would exceed limit, save it and start new one
        chunks.push(currentChunk);
        currentChunk = processedLine;
      } else {
        currentChunk = testChunk;
      }
    }

    // Add the last chunk
    if (currentChunk) {
      chunks.push(currentChunk);
    }

    // Use the processed content (with truncations) for scanning and final upload
    const processedContent = processedLines.join("\n");

    // Scan each chunk and aggregate results
    const allFindings: SensitiveDataFinding[] = [];
    const allCategories = new Set<string>();
    let cumulativeByteOffset = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkBytes = Buffer.byteLength(chunk, "utf8");

      const request = {
        parent: `projects/${projectId}/locations/us`,
        inspectConfig,
        item: {
          value: chunk,
        },
      };

      try {
        const response = await dlp.inspectContent(request);
        const findings = response[0]?.result?.findings || [];

        if (findings.length > 0) {
          for (const f of findings) {
            // Adjust byte offsets to account for position in original content
            allFindings.push({
              infoType: f.infoType?.name || "UNKNOWN",
              likelihood: String(f.likelihood || "UNKNOWN"),
              quote: f.quote || "",
              location: {
                byteRange: {
                  start:
                    Number(f.location?.byteRange?.start || 0) +
                    cumulativeByteOffset,
                  end:
                    Number(f.location?.byteRange?.end || 0) +
                    cumulativeByteOffset,
                },
              },
            });

            if (f.infoType?.name) {
              allCategories.add(f.infoType.name);
            }
          }
        }
      } catch (chunkError) {
        console.error(`Error scanning chunk ${i + 1}:`, chunkError);
        // Continue with other chunks
      }

      // Add bytes from this chunk plus newline separator (except for last chunk)
      cumulativeByteOffset += chunkBytes + (i < chunks.length - 1 ? 1 : 0);
    }

    // Separate scrub-able and block-able findings (even if empty, we still need to check for pre-scrubbing)
    const scrubFindings = allFindings.filter((f) =>
      SCRUB_TYPES.has(f.infoType),
    );
    const blockFindings = allFindings.filter(
      (f) => !SCRUB_TYPES.has(f.infoType),
    );

    // If there are findings that should block, return them
    if (blockFindings.length > 0) {
      return {
        hasSensitiveData: true,
        findings: blockFindings,
        categories: Array.from(new Set(blockFindings.map((f) => f.infoType))),
      };
    }

    // Only scrub-able findings - scrub them from the processed content
    if (scrubFindings.length > 0) {
      const scrubbedContent = scrubContent(processedContent, scrubFindings);
      return {
        hasSensitiveData: true,
        findings: scrubFindings,
        categories: Array.from(new Set(scrubFindings.map((f) => f.infoType))),
        scrubbedContent,
      };
    }

    // No sensitive findings, but we may have truncated or pre-scrubbed
    if (truncatedCount > 0 || hasPreScrubbing) {
      return {
        hasSensitiveData: false,
        findings: [],
        categories: [],
        scrubbedContent: processedContent, // Return processed version (truncated + pre-scrubbed)
      };
    }

    // No changes needed
    return {
      hasSensitiveData: false,
      findings: [],
      categories: [],
    };
  } catch (error) {
    console.error("DLP scan error:", error);
    // On error, allow upload but log the issue
    return {
      hasSensitiveData: false,
      findings: [],
      categories: [],
    };
  }
}

/**
 * Format DLP findings into a user-friendly message
 */
export function formatDlpFindings(result: DlpScanResult): string {
  if (!result.hasSensitiveData) {
    return "";
  }

  const categoryDescriptions: Record<string, string> = {
    // Credentials & Secrets
    AUTH_TOKEN: "Authentication tokens",
    AZURE_AUTH_TOKEN: "Azure auth tokens",
    AWS_CREDENTIALS: "AWS credentials",
    BASIC_AUTH_HEADER: "Basic auth headers",
    ENCRYPTION_KEY: "Encryption keys",
    GCP_API_KEY: "Google Cloud API keys",
    GCP_CREDENTIALS: "Google Cloud credentials",
    HTTP_COOKIE: "HTTP cookies",
    JSON_WEB_TOKEN: "JWT tokens",
    OAUTH_CLIENT_SECRET: "OAuth client secrets",
    PASSWORD: "Passwords",
    WEAK_PASSWORD_HASH: "Password hashes",
    XSRF_TOKEN: "XSRF tokens",
    // Personal Information
    CREDIT_CARD_NUMBER: "Credit card numbers",
    US_SOCIAL_SECURITY_NUMBER: "Social security numbers",
    US_DRIVERS_LICENSE_NUMBER: "Driver's license numbers",
    US_PASSPORT: "Passport numbers",
    EMAIL_ADDRESS: "Email addresses",
    PHONE_NUMBER: "Phone numbers",
    IP_ADDRESS: "IP addresses",
    MAC_ADDRESS: "MAC addresses",
  };

  const detectedTypes = result.categories
    .map((cat) => categoryDescriptions[cat] || cat)
    .join(", ");

  return `\nDetected ${result.findings.length} instance(s) of sensitive data: ${detectedTypes}`;
}
