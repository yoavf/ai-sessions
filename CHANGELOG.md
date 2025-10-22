# Changelog

## 2025-10-22

- **Bug Fixes**: Gemini write_file support ([#25](https://github.com/yoavf/ai-sessions/pull/25))
- **Bug Fixes**: Unescape literal newlines in Gemini thinking blocks ([#18](https://github.com/yoavf/ai-sessions/pull/18))
- **Features**: Standardize todo list rendering for Codex and Claude Code ([#24](https://github.com/yoavf/ai-sessions/pull/24))
- **Features**: Diff view ([#21](https://github.com/yoavf/ai-sessions/pull/21))
- **Features**: Replace message count text with icons and tooltips ([#23](https://github.com/yoavf/ai-sessions/pull/23))

## 2025-10-21

- **Features**: Add examples transcript files
- **Features**: Implement modern blue-slate color scheme ([#14](https://github.com/yoavf/ai-sessions/pull/14))

## 2025-10-19

- **Features**: Gemini CLI support ([#10](https://github.com/yoavf/ai-sessions/pull/10))
- **Testing**: Transcript page e2e tests ([#11](https://github.com/yoavf/ai-sessions/pull/11))

## 2025-10-18

- **Testing**: Add my-transcripts e2e tests ([#9](https://github.com/yoavf/ai-sessions/pull/9))
- **Features**: Add Codex support ([#8](https://github.com/yoavf/ai-sessions/pull/8))
- **Testing**: Auth e2e tests ([#7](https://github.com/yoavf/ai-sessions/pull/7))
- **Features**: Add dropzone functionality to transcript pages ([#4](https://github.com/yoavf/ai-sessions/pull/4))

## 2025-10-17

- **Bug Fixes**: Add missing migration
- **Bug Fixes**: 404 in privacy policy, missing pages titles
- **Features**: Add model stats

## 2025-10-16

- **Features**: OpenGraph support
- **Miscellaneous**: Design fixes
- **Bug Fixes**: Fix migration
- **Security**: Auto-clear CLI token from client state after 2 minutes
- **Security**: Mitigate timing attacks in token revocation check
- **Refactoring**: Deduplicate TranscriptViewer logic
- **Bug Fixes**: Add Prisma select clause for type safety
