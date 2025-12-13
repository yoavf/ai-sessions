# Changelog

## 2025-12-13

- **Features**: Add support for mistral-vibe ([#51](https://github.com/yoavf/ai-sessions/pull/51))
- **Features**: Add copilot cli support ([#55](https://github.com/yoavf/ai-sessions/pull/55))
- **Features**: Extract example links to new components and add mistral-vibe ([#53](https://github.com/yoavf/ai-sessions/pull/53))

## 2025-12-09

- **Bug Fixes**: Use LoggerProvider directly with Authorization header for PostHog OTLP
- **Bug Fixes**: Match PostHog OTLP docs exactly
- **Features**: Add info log when transcript is viewed

## 2025-11-21

- **Documentation**: Update README to reflect PostgreSQL usage and remove emojis

## 2025-11-19

- **Bug Fixes**: Use correct Upstash env var names from Vercel integration

## 2025-10-24

- **Features**: Add avatars and names to transcript messages ([#42](https://github.com/yoavf/ai-sessions/pull/42))
- **Bug Fixes**: Remove constant session polling ([#43](https://github.com/yoavf/ai-sessions/pull/43))
- **Features**: Quick install script ([#40](https://github.com/yoavf/ai-sessions/pull/40))

## 2025-10-23

- **Features**: Add links to examples on the homepage ([#38](https://github.com/yoavf/ai-sessions/pull/38))
- **Features**: Revamped stats ([#33](https://github.com/yoavf/ai-sessions/pull/33))
- **Features**: Add edit-in-place for session titles in my-transcripts page ([#32](https://github.com/yoavf/ai-sessions/pull/32))

## 2025-10-22

- **Fix**: Remove per-line horizontal scrollbars in diff views by wrapping long lines ([#28](https://github.com/yoavf/ai-sessions/pull/28))
- **Features**: Display relative paths in transcripts based on project cwd ([#26](https://github.com/yoavf/ai-sessions/pull/26))
- **Features**: Automated changelog ([#29](https://github.com/yoavf/ai-sessions/pull/29))
- **Bug Fixes**: Gemini write_file support ([#25](https://github.com/yoavf/ai-sessions/pull/25))
- **Security**: Unescape literal newlines in Gemini thinking blocks ([#18](https://github.com/yoavf/ai-sessions/pull/18))
- **Features**: Standardize todo list rendering for Codex and Claude Code ([#24](https://github.com/yoavf/ai-sessions/pull/24))
- **Features**: Diff view ([#21](https://github.com/yoavf/ai-sessions/pull/21))
- **Features**: Replace message count text with icons and tooltips ([#23](https://github.com/yoavf/ai-sessions/pull/23))

## 2025-10-21

- **Features**: Add examples transcript files
- **Features**: Implement modern blue-slate color scheme ([#14](https://github.com/yoavf/ai-sessions/pull/14))

## 2025-10-19

- **Features**: Gemini cli support ([#10](https://github.com/yoavf/ai-sessions/pull/10))

## 2025-10-18

- **add**: Auth e2e tests ([#7](https://github.com/yoavf/ai-sessions/pull/7))

## 2025-10-16

- **Bug Fixes**: Add missing migration
- **Bug Fixes**: 404 in privacy policy, missing pages titles
- **Features**: Add model stats
- **Features**: Opengraph
- **dlp**: Scrub more data
- **Fix**: Add Prisma select clause for type safety
- **Refactor**: Deduplicate TranscriptViewer logic
- **Security**: Auto-clear CLI token from client state after 2 minutes
- **Security**: Mitigate timing attacks in token revocation check
- **Security**: Add JSON parsing error handling in CLI upload
- **Security**: Fix token revocation error handling and verification
- **Security**: Fix rate limit error handling (fail closed on Redis errors)
- **Security**: Fix database error handling in JWT verification (fail closed)
- **Security**: Add CSRF protection to CLI token generation endpoint
- **Features**: Cli upload support
