# Test Plans Directory

This directory contains comprehensive test plans for the AI Sessions application.

## Available Test Plans

### My Transcripts Page Test Plan
**File**: `my-transcripts-test-plan.md`

**Coverage**:
- Authentication and access control (3 scenarios)
- Transcript list display (5 scenarios)
- Transcript viewing (2 scenarios)
- Transcript deletion (7 scenarios)
- CLI token management (10 scenarios)
- Account deletion (7 scenarios)
- Loading and error states (4 scenarios)
- Header and navigation (5 scenarios)
- Responsive design and accessibility (5 scenarios)
- Security and data integrity (5 scenarios)
- Edge cases and boundary conditions (7 scenarios)
- Performance and optimization (3 scenarios)
- Integration points (3 scenarios)

**Total Scenarios**: 66 detailed test cases

**Key Features Tested**:
- User authentication requirements
- Transcript list display with metadata (title, date, message count, file size, source)
- Delete transcript functionality with confirmation
- CLI token generation, copying, and revocation
- Account deletion with double confirmation
- Empty state handling
- CSRF protection validation
- Rate limiting enforcement
- Responsive design across viewports
- Keyboard and screen reader accessibility

## Test Plan Format

Each test plan follows this structure:

1. **Application Overview**: High-level description of the feature/page
2. **Test Scenarios**: Organized by functional area
   - **Scenario Title**: Descriptive name
   - **Seed**: Which seed file to use for test setup
   - **Assumptions**: Starting conditions
   - **Steps**: Numbered, detailed instructions
   - **Expected Results**: What should happen at each step
3. **Test Data Requirements**: Sample data needed
4. **Environment Requirements**: Technical prerequisites
5. **Automation Recommendations**: What to automate vs. manual test
6. **Success Criteria**: How to determine if tests pass

## Using These Test Plans

### For Manual Testing
1. Read the scenario title and assumptions
2. Follow the steps exactly as written
3. Verify each expected result
4. Document any deviations or failures

### For Test Automation
1. Use scenarios as basis for automated test scripts
2. Reference the seed files specified
3. Implement step-by-step in your test framework
4. Assert on all expected results

### For QA Planning
1. Identify high-priority scenarios for regression testing
2. Allocate resources based on complexity
3. Track coverage using scenario numbers
4. Update test plans as features evolve

## Playwright E2E Tests

The project uses Playwright for end-to-end testing. Test files are located in the `/e2e` directory.

### Existing Test Files
- `e2e/seed.spec.ts` - Basic unauthenticated seed
- `e2e/seed-auth.spec.ts` - Authenticated seed with test user
- `e2e/fixtures/auth.ts` - Authentication fixture for creating test users
- `e2e/auth-*.spec.ts` - Authentication-related tests

### Running Tests
```bash
# Run all tests
npx playwright test

# Run specific test file
npx playwright test e2e/my-transcripts.spec.ts

# Run in headed mode (see browser)
npx playwright test --headed

# Run in debug mode
npx playwright test --debug

# View test report
npx playwright show-report
```

## Contributing

When adding new test plans:

1. Create a new markdown file in this directory
2. Follow the existing format and structure
3. Include comprehensive scenarios covering happy path, edge cases, and error conditions
4. Specify seed files, assumptions, and expected results clearly
5. Update this README with a summary of the new test plan

## Notes

- Test plans are living documents - update them as features change
- Prioritize automation for high-risk, frequently-used scenarios
- Manual testing is valuable for UX, accessibility, and exploratory testing
- Always test security features (authentication, CSRF, rate limiting)
- Consider performance testing for pages with large datasets
