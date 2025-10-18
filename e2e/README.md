# E2E Tests for AI Sessions

This directory contains end-to-end tests for the AI Sessions application using Playwright with **isolated test databases**.

## Quick Start

### Local Development

1. **Start the test database:**
   ```bash
   npm run test:e2e:docker:up
   ```

2. **Run tests:**
   ```bash
   npm run test:e2e
   ```

3. **Stop the test database:**
   ```bash
   npm run test:e2e:docker:down
   ```

### CI (GitHub Actions)

Tests run automatically on push/PR. GitHub Actions spins up an ephemeral PostgreSQL service container.

## Test Database Setup

### Why a Separate Test Database?

- **Test isolation**: Tests don't interfere with your development data
- **Clean state**: Each test run starts with a fresh, migrated database
- **Safety**: Prevents accidental data corruption in dev/production databases

### Local Setup (Docker Compose)

The test database runs in a Docker container on port **5433** (to avoid conflicts with your dev database on 5432):

```yaml
# docker-compose.test.yml
services:
  postgres-test:
    image: postgres:15
    ports:
      - '5433:5432'  # Accessible at localhost:5433
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: ai_sessions_test
```

**Environment variables** (`.env.test`):
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/ai_sessions_test"
```

### CI Setup (GitHub Actions)

GitHub Actions uses a service container that runs automatically:

```yaml
services:
  postgres:
    image: postgres:15
    env:
      POSTGRES_DB: ai_sessions_test
    ports:
      - 5432:5432  # CI uses standard port
```

## Test Structure

### Test Files

- **`auth-unauthenticated.spec.ts`** - Unauthenticated user experience (6 tests)
- **`auth-authenticated.spec.ts`** - Authenticated user experience (7 tests)
- **`auth-signout.spec.ts`** - Sign-out flow (4 tests)

### Fixtures

- **`fixtures/auth.ts`** - Authentication fixture
  - Creates test users with valid sessions
  - Sets NextAuth.js v5 session cookies (`authjs.session-token`)
  - Provides `authenticatedPage` fixture
  - Automatically cleans up test data

### Global Setup

- **`setup-db.ts`** - Runs before all tests
  - Applies Prisma migrations to test database
  - Cleans existing test data
  - Validates test database URL contains "test"

## Running Tests

### All Commands

```bash
# Local development with Docker
npm run test:e2e:docker:up    # Start test database
npm run test:e2e               # Run all tests
npm run test:e2e:docker:down  # Stop and cleanup test database

# Interactive modes
npm run test:e2e:ui            # UI mode (recommended for development)
npm run test:e2e:headed        # See browser
npm run test:e2e:debug         # Debug mode (step through tests)

# Run specific test file
npx playwright test auth-unauthenticated
npx playwright test auth-authenticated
npx playwright test auth-signout

# Run specific test by name
npx playwright test -g "Homepage Display"

# Run on specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### First Time Setup

1. **Install Docker** (if not already installed)
   - macOS: [Docker Desktop](https://www.docker.com/products/docker-desktop)
   - Linux: `sudo apt-get install docker-compose`

2. **Start test database:**
   ```bash
   npm run test:e2e:docker:up
   ```

3. **Run tests:**
   ```bash
   npm run test:e2e
   ```

## Test Configuration

Configuration is in `/playwright.config.ts`:

- **Base URL**: `http://localhost:3000`
- **Test directory**: `./e2e`
- **Global setup**: `./e2e/setup-db.ts` (runs migrations + cleanup)
- **Browsers**: Chromium, Firefox, WebKit
- **Web server**: Automatically starts `npm run dev` with test DATABASE_URL
- **Parallel execution**: Enabled locally, disabled in CI
- **Retries**: 2 retries on CI, 0 locally

## Writing New Tests

### Unauthenticated Tests

```typescript
import { test, expect } from "@playwright/test";

test.describe("My Feature", () => {
  test("should do something", async ({ page }) => {
    await page.goto("/");
    // Your test code
  });
});
```

### Authenticated Tests

```typescript
import { test, expect } from "./fixtures/auth";

test.describe("My Authenticated Feature", () => {
  test("should do something", async ({ authenticatedPage: page }) => {
    // Page already has authenticated session
    await expect(page.getByRole('link', { name: 'My Transcripts' })).toBeVisible();
    // Your test code
  });
});
```

## Authentication Fixture

The fixture provides an `authenticatedPage` that:

1. Creates a test user in the database
2. Creates a valid NextAuth.js session
3. Sets the `authjs.session-token` cookie
4. Navigates to homepage
5. Waits for "My Transcripts" to appear (confirms auth works)
6. Automatically cleans up after the test

**How it works:**
```typescript
// Creates test user
const testUser = await prisma.user.create({
  data: {
    id: `test-user-${generateId(8)}`,
    email: `test-${generateId(8)}@example.com`,
    githubUsername: 'testuser',
  },
});

// Creates session
const sessionToken = generateId(32);
await prisma.session.create({
  data: {
    sessionToken,
    userId: testUser.id,
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  },
});

// Sets cookie
await context.addCookies([{
  name: 'authjs.session-token',
  value: sessionToken,
  url: 'http://localhost:3000',
  httpOnly: true,
  sameSite: 'Lax',
}]);
```

## Debugging Tests

### View Test Results

```bash
# Open HTML report after test run
npx playwright show-report
```

### Debug Failing Tests

```bash
# Run in debug mode with Playwright Inspector
npm run test:e2e:debug

# Run specific test in debug mode
npx playwright test auth-authenticated --debug

# Run with trace viewer
npx playwright test --trace on
npx playwright show-trace trace.zip
```

### Common Issues

**Tests failing with "My Transcripts" not found:**
- Check that test database is running: `docker ps`
- Verify DATABASE_URL in `.env.test` points to port 5433
- Ensure migrations ran successfully (check console output)

**"Sign in to upload" overlay visible in authenticated tests:**
- Cookie name must be `authjs.session-token` (NextAuth.js v5)
- Session must exist in database
- Cookie domain/path must match

**Database connection errors:**
- Ensure test database is running: `npm run test:e2e:docker:up`
- Check `DATABASE_URL` environment variable
- Verify PostgreSQL is accessible on port 5433

**Port already in use:**
- Another process is using port 5433
- Stop existing containers: `npm run test:e2e:docker:down`
- Or kill the process: `lsof -ti:5433 | xargs kill -9`

## CI/CD Integration

The tests run automatically in GitHub Actions with:
- Ephemeral PostgreSQL service container
- Automatic migrations before tests
- Single worker (no parallelization)
- 2 retries on failure
- HTML report uploaded as artifact

### Viewing CI Test Results

1. Go to the Actions tab in GitHub
2. Click on the failed workflow run
3. Download the `playwright-report` artifact
4. Extract and open `index.html`

## Database Lifecycle

### Local Development

```bash
# Start database (creates volume for data persistence during session)
npm run test:e2e:docker:up

# Run tests multiple times (data cleaned before each run)
npm run test:e2e
npm run test:e2e

# Stop database (destroys volume and all data)
npm run test:e2e:docker:down
```

### CI

```yaml
1. GitHub Actions starts PostgreSQL service container
2. Runs migrations (creates tables)
3. Runs tests
4. Container destroyed automatically after workflow
```

## Test Data Cleanup

Data is cleaned in two ways:

1. **Global setup** (`setup-db.ts`): Runs before all tests
   - Applies migrations
   - Deletes all existing data

2. **Auth fixture cleanup**: Runs after each authenticated test
   - Deletes test user
   - Deletes associated sessions/transcripts

This ensures:
- ✅ No leftover data between test runs
- ✅ No conflicts from previous test data
- ✅ Clean database state for every test

## Test Coverage

Current coverage: **18 tests**

- ✅ Unauthenticated user experience (6 tests)
- ✅ Authenticated user experience (7 tests)
- ✅ Sign-out flow (4 tests)
- ✅ Session persistence
- ✅ Multi-tab synchronization

### Not Yet Covered

- Full GitHub OAuth flow (requires real credentials or mocking)
- Upload functionality with files
- Transcript viewing and interaction
- Error handling edge cases

## Additional Resources

- [Playwright Documentation](https://playwright.dev/)
- [NextAuth.js v5 Documentation](https://next-auth.js.org/)
- [Prisma Testing Guide](https://www.prisma.io/docs/orm/prisma-client/testing/integration-testing)
- [Test Plan](./github-oauth-test-plan.md) - Comprehensive test scenarios

## Notes

- Tests use role-based selectors (`getByRole`) for accessibility
- Test database URL must contain "test" for safety
- Sessions created with 30-day expiration (matches production)
- Auth fixture uses same Prisma adapter as production (`PrismaPg`)
- All tests include automatic cleanup
