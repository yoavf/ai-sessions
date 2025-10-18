# Unit Testing

This project uses [Vitest](https://vitest.dev/) for unit testing.

## Running Tests

```bash
# Run tests in watch mode (interactive)
npm test

# Run tests once (CI mode)
npm run test:run

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## Test Structure

Unit tests are located alongside the source code in `__tests__` directories:

```
src/lib/providers/
├── __tests__/
│   ├── fixtures/          # Test data samples
│   │   ├── claude-code-sample.ts
│   │   └── codex-sample.ts
│   ├── claude-code.test.ts   # Claude Code provider tests
│   ├── codex.test.ts         # Codex provider tests
│   └── index.test.ts         # Provider registry tests
├── claude-code.ts
├── codex.ts
└── index.ts
```

## Test Coverage

Current test suite covers:
- **Claude Code Provider**: 20 tests
  - Detection logic
  - JSONL parsing
  - Slash commands & bash blocks
  - Model name formatting
- **Codex Provider**: 29 tests
  - Both older (direct) and newer (event-based) formats
  - Detection for both formats
  - Session metadata extraction
  - Function calls, reasoning, tool results
  - Model name formatting (GPT, Claude, Gemini)
- **Provider Registry**: 14 tests
  - Provider lookup and detection
  - Auto-detection logic
  - Transcript parsing
  - Model statistics calculation

**Total: 63 tests passing**

## E2E Tests

For end-to-end tests using Playwright, see the main README.
