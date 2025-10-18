# AI Sessions - GitHub OAuth Authentication Flow Test Plan

## Application Overview

AI Sessions (ai-sessions.dev) is a Next.js 15 application that enables users to upload and share Claude Code session transcripts. The application implements GitHub OAuth authentication via NextAuth.js v5 with the following key characteristics:

**Authentication Architecture:**
- **Provider**: GitHub OAuth (sole authentication method)
- **Session Management**: NextAuth.js v5 with PrismaAdapter (PostgreSQL)
- **Custom Sign-in Page**: `/auth/signin` (server-side rendered form)
- **Session Callback**: Adds `user.id` to session object for authorization
- **User Profile**: Stores GitHub username, name, email, and avatar URL

**Application Flow:**
- **Homepage (`/`)**: Displays upload dropzone with authentication overlay for unauthenticated users
- **Upload Flow**: Requires authentication; shows sign-in overlay when not authenticated
- **View Flow**: Public access via secret token URLs (`/t/[token]`) - no authentication required
- **User Features**: Authenticated users can access "My Transcripts" page and upload files

**Security Features:**
- CSRF protection on all state-changing operations
- Rate limiting (optional, via Upstash Redis)
- Security headers configured globally
- Session-based authentication with httpOnly cookies

## Test Scenarios

### 1. Unauthenticated User Experience

**Seed:** `e2e/seed.spec.ts` (navigates to `http://localhost:3000`)

#### 1.1 Homepage Load - Unauthenticated State
**Steps:**
1. Navigate to `http://localhost:3000`
2. Wait for page to fully load

**Expected Results:**
- Page title shows "AI Sessions" in the browser tab
- Header displays "AI Sessions" branding on the left
- Header shows only the Help icon (question mark) on the right
- Header does NOT show "My Transcripts" link (requires authentication)
- Header does NOT show logout icon (requires authentication)
- Main content displays centered heading "AI Sessions"
- Subtitle reads "Share AI coding sessions"
- Secondary subtitle reads "(Other coding agents coming soon!)"
- Upload dropzone is visible with dashed border
- Upload dropzone shows upload icon (cloud/upload symbol)
- Text reads "Drop your transcript" or "or click to browse for a .jsonl file"
- Terms of Service and Privacy Policy links are visible at bottom of dropzone

#### 1.2 Authentication Overlay Display
**Steps:**
1. From homepage in unauthenticated state
2. Observe the upload dropzone area

**Expected Results:**
- Semi-transparent overlay covers the entire dropzone
- Overlay has backdrop blur effect (`backdrop-blur-sm`)
- Lock icon (16x16 or similar) is centered in overlay
- Heading displays "Sign in to upload" (text-2xl, semibold)
- Subtext reads "Authenticate to share your transcripts" (muted foreground)
- Blue button displays "Sign in with GitHub" with GitHub logo icon
- Button is prominent and clearly clickable (size-lg)
- Upload dropzone behind overlay is still visible but muted/blurred

#### 1.3 Upload Attempt While Unauthenticated
**Steps:**
1. From homepage in unauthenticated state
2. Attempt to drag a file over the upload dropzone
3. Attempt to click on the dropzone

**Expected Results:**
- Dropzone cursor shows pointer (clickable)
- Sign-in overlay remains visible and blocks interaction
- No file selection dialog opens
- No upload process begins
- Overlay remains in place, forcing authentication first

#### 1.4 Help Page Access - Unauthenticated
**Steps:**
1. From homepage in unauthenticated state
2. Click the Help icon (question mark) in the header

**Expected Results:**
- Navigates to `/help` page
- Help content displays properly
- Header remains consistent (no auth-required elements visible)
- User can navigate back to homepage

### 2. GitHub OAuth Sign-In Flow

**Seed:** `e2e/seed.spec.ts`

#### 2.1 Initiate Sign-In from Homepage Overlay
**Steps:**
1. Navigate to `http://localhost:3000`
2. Verify authentication overlay is visible over upload dropzone
3. Click the "Sign in with GitHub" button on the overlay

**Expected Results:**
- Browser redirects to GitHub OAuth authorization page
- URL changes to `https://github.com/login/oauth/authorize?...`
- GitHub OAuth screen displays the app name and requested permissions
- Scopes requested likely include: `read:user`, `user:email`
- "Authorize" button is prominently displayed
- "Cancel" option is available
- App callback URL points back to AI Sessions domain

#### 2.2 Initiate Sign-In from Dedicated Sign-In Page
**Steps:**
1. Navigate directly to `http://localhost:3000/auth/signin`
2. Observe the sign-in page layout

**Expected Results:**
- Page displays centered card with gradient background (gray-900 to gray-800)
- White rounded card contains sign-in form
- Heading shows "AI Sessions"
- Subtitle reads "Share and view AI coding session transcripts"
- Form contains single button: "Sign in with GitHub"
- Button shows GitHub logo icon and text
- Button uses dark background (gray-900) with hover effect (gray-800)
- Terms of Service and Privacy Policy links visible below button
- Links text: "By signing in, you agree to the site's Terms of Service and Privacy Policy"

**Steps (continued):**
3. Click the "Sign in with GitHub" button

**Expected Results:**
- Browser redirects to GitHub OAuth authorization page
- URL changes to `https://github.com/login/oauth/authorize?...`
- Same OAuth flow as 2.1

#### 2.3 Complete GitHub OAuth Authorization - First Time User
**Prerequisites:** Use a GitHub account that has never authenticated with this app before

**Steps:**
1. Initiate sign-in flow (via homepage or `/auth/signin`)
2. On GitHub OAuth page, review requested permissions
3. Click "Authorize [app-name]" button
4. Wait for redirect back to AI Sessions

**Expected Results:**
- GitHub processes authorization
- Browser redirects to AI Sessions callback URL
- NextAuth.js processes the OAuth callback
- **Database Records Created:**
  - New `User` record with GitHub profile data (id, name, email, avatar, githubUsername)
  - New `Account` record linking user to GitHub provider
  - New `Session` record for the authenticated session
- User lands on homepage (`/`) due to `callbackUrl: "/"` parameter
- Session cookie is set (httpOnly, secure in production)
- User is now in authenticated state

#### 2.4 Complete GitHub OAuth Authorization - Returning User
**Prerequisites:** Use a GitHub account that has previously authenticated with this app

**Steps:**
1. Initiate sign-in flow
2. On GitHub OAuth page (if shown), click "Authorize"
   - Note: GitHub may skip this if previously authorized
3. Wait for redirect back to AI Sessions

**Expected Results:**
- GitHub may immediately redirect without showing authorization page (if already authorized)
- Browser redirects to AI Sessions callback URL
- NextAuth.js processes the OAuth callback
- **Database Updates:**
  - User record `githubUsername` field updated (via `signIn` event)
  - New `Session` record created for this login
  - Existing `User` and `Account` records remain (no duplicates)
- User lands on homepage (`/`)
- Session cookie is set
- User is now in authenticated state

#### 2.5 OAuth Error Handling - User Denies Authorization
**Steps:**
1. Initiate sign-in flow
2. On GitHub OAuth page, click "Cancel" or deny authorization
3. Observe the result

**Expected Results:**
- GitHub redirects back to AI Sessions with error parameter
- User lands on error page or is redirected to sign-in page
- Error message indicates authorization was denied or cancelled
- User remains unauthenticated
- User can retry sign-in process

#### 2.6 OAuth Error Handling - Network/Server Error
**Scenario:** Simulate a network interruption or GitHub API failure

**Expected Results:**
- Application shows appropriate error message
- User is not left in an ambiguous state
- User can retry sign-in process
- No partial database records created

### 3. Authenticated User Experience

**Seed:** `e2e/seed.spec.ts` with authenticated session setup
**Note:** Tests in this section require authentication state setup, either via OAuth flow completion or session mocking

#### 3.1 Homepage Display - Authenticated State
**Prerequisites:** User is authenticated (completed OAuth flow)

**Steps:**
1. Navigate to `http://localhost:3000`
2. Observe the page layout

**Expected Results:**
- Header displays "AI Sessions" branding on the left
- Header shows "My Transcripts" button/link (visible only when authenticated)
- Header shows Help icon (question mark)
- Header shows Logout icon (log out symbol, right-most position)
- Main content displays centered heading "AI Sessions"
- Upload dropzone is fully visible and functional
- **Authentication overlay is NOT visible** (removed for authenticated users)
- Upload dropzone shows upload icon and text
- Dropzone is interactive and accepts file drag/drop
- Help link at bottom: "Need help finding your transcripts? Check out the help page"

#### 3.2 Upload Dropzone Interaction - Authenticated
**Prerequisites:** User is authenticated

**Steps:**
1. From authenticated homepage
2. Hover over upload dropzone
3. Observe visual feedback

**Expected Results:**
- Dropzone border changes on hover (border-primary/50)
- Cursor shows pointer (clickable)
- No overlay blocking interaction
- Dropzone appears fully enabled

**Steps (continued):**
4. Click on the dropzone

**Expected Results:**
- File picker dialog opens
- Dialog is filtered to accept `.jsonl` files
- User can select a file to upload

**Steps (alternative):**
4. Drag a `.jsonl` file over the dropzone

**Expected Results:**
- Dropzone visual changes (border-primary, bg-primary/5, scale-[1.02])
- Text changes to "Drop your file here"
- Dropzone scales slightly larger (1.02x)
- Blue/primary color theme activates

#### 3.3 My Transcripts Page Access
**Prerequisites:** User is authenticated

**Steps:**
1. From authenticated homepage
2. Click "My Transcripts" button in header
3. Observe the navigation

**Expected Results:**
- Navigates to `/my-transcripts` page
- Page displays user's uploaded transcripts (if any)
- Header shows "My Transcripts" button as active/current page
- Header still shows Help and Logout icons
- "My Transcripts" button is NOT shown when already on `/my-transcripts` page (per SiteHeader logic)

#### 3.4 User Profile Data Display
**Prerequisites:** User is authenticated

**Steps:**
1. Navigate to any page that displays user information
2. Verify user profile data

**Expected Results:**
- User's GitHub avatar is displayed (if available)
- User's GitHub username is shown (stored in database)
- User's name from GitHub is displayed (if different from username)
- All profile data matches GitHub account information

### 4. Session Persistence and State Management

**Seed:** `e2e/seed.spec.ts`

#### 4.1 Session Persistence - Page Refresh
**Prerequisites:** User is authenticated

**Steps:**
1. Complete authentication flow and land on homepage
2. Verify authenticated state (no overlay, My Transcripts visible)
3. Refresh the page (F5 or browser refresh)
4. Wait for page to fully reload

**Expected Results:**
- Page reloads successfully
- User remains authenticated (session persisted)
- All authenticated UI elements remain visible:
  - "My Transcripts" link in header
  - Logout icon in header
  - No authentication overlay on upload dropzone
- Session cookie is still valid
- No re-authentication required

#### 4.2 Session Persistence - Navigation and Return
**Prerequisites:** User is authenticated

**Steps:**
1. From authenticated homepage, click "My Transcripts"
2. Navigate to `/my-transcripts` page
3. Click "AI Sessions" logo to return to homepage
4. Observe authentication state

**Expected Results:**
- User remains authenticated throughout navigation
- Homepage displays authenticated state (no overlay)
- Session persists across page navigations
- No session interruption or loss

#### 4.3 Session Persistence - Browser Tab Management
**Prerequisites:** User is authenticated in one tab

**Steps:**
1. Complete authentication in Tab 1
2. Open new tab (Tab 2) and navigate to `http://localhost:3000`
3. Observe authentication state in Tab 2

**Expected Results:**
- Tab 2 immediately shows authenticated state
- Session is shared across tabs (same browser session)
- User does not need to re-authenticate in Tab 2
- Both tabs maintain synchronized authentication state

#### 4.4 Session Expiration Handling
**Scenario:** Session expires or becomes invalid

**Steps:**
1. Authenticate and use the application
2. Simulate session expiration (manual database deletion or wait for expiry)
3. Attempt to perform authenticated action (e.g., upload file)

**Expected Results:**
- Application detects invalid/expired session
- User is redirected to sign-in page or shows authentication error
- Upload is blocked until re-authentication
- User can re-authenticate to restore functionality
- No data loss or corruption

### 5. Sign-Out Flow

**Seed:** `e2e/seed.spec.ts` with authenticated session

#### 5.1 Initiate Sign-Out
**Prerequisites:** User is authenticated

**Steps:**
1. From any page while authenticated (e.g., homepage)
2. Verify authenticated state (Logout icon visible in header)
3. Click the Logout icon in the header
4. Observe the result

**Expected Results:**
- `signOut` function is called with `callbackUrl: "/"`
- Session is terminated in NextAuth.js
- **Database Updates:**
  - Session record is deleted or invalidated
  - User and Account records remain (not deleted)
- Session cookie is cleared
- Browser redirects to homepage (`/`)
- Homepage displays unauthenticated state:
  - Authentication overlay appears over upload dropzone
  - "My Transcripts" link removed from header
  - Logout icon removed from header
  - Only Help icon remains in header

#### 5.2 Verify Complete Sign-Out
**Prerequisites:** Just completed sign-out flow

**Steps:**
1. After sign-out, verify homepage shows unauthenticated state
2. Attempt to navigate to `/my-transcripts` directly
3. Attempt to access upload functionality

**Expected Results:**
- `/my-transcripts` redirects to sign-in or shows access denied
- Upload dropzone shows authentication overlay
- Cannot perform authenticated actions
- Session is completely cleared

#### 5.3 Sign-Out and Re-Authentication
**Prerequisites:** User has signed out

**Steps:**
1. Complete sign-out flow
2. Immediately click "Sign in with GitHub" again
3. Complete OAuth flow

**Expected Results:**
- Sign-in process works normally
- User re-authenticates successfully
- New session is created
- User returns to fully authenticated state
- No errors or conflicts from previous session

### 6. Edge Cases and Error Scenarios

**Seed:** `e2e/seed.spec.ts`

#### 6.1 Direct Navigation to OAuth Callback URL
**Steps:**
1. As unauthenticated user, navigate directly to NextAuth callback URL
   - Example: `http://localhost:3000/api/auth/callback/github`
2. Observe the result

**Expected Results:**
- NextAuth.js handles the invalid callback gracefully
- User is redirected to error page or sign-in page
- No server error or crash
- Appropriate error message displayed

#### 6.2 Multiple Concurrent Sign-In Attempts
**Steps:**
1. Open multiple browser tabs
2. Initiate sign-in flow in Tab 1
3. Before completing Tab 1, initiate sign-in in Tab 2
4. Complete OAuth in both tabs

**Expected Results:**
- Both tabs handle authentication gracefully
- No race conditions or duplicate user records
- Both tabs end up authenticated
- Session state is consistent across tabs

#### 6.3 Session Cookie Manipulation
**Scenario:** User manually deletes or modifies session cookie

**Steps:**
1. Authenticate and verify session works
2. Open browser DevTools → Application → Cookies
3. Delete NextAuth session cookie(s)
4. Refresh page or attempt authenticated action

**Expected Results:**
- Application detects missing/invalid cookie
- User is treated as unauthenticated
- Authentication overlay appears on upload dropzone
- No server errors or crashes
- User can re-authenticate normally

#### 6.4 GitHub Account Changes
**Scenario:** User changes GitHub username or email after authentication

**Steps:**
1. Authenticate with GitHub account
2. Change GitHub username on GitHub.com
3. Sign out of AI Sessions
4. Sign in again to AI Sessions

**Expected Results:**
- Sign-in event handler updates `githubUsername` field
- User record is updated with new GitHub username
- No duplicate user created
- Session works normally with updated information

#### 6.5 Simultaneous Sign-Out in Multiple Tabs
**Prerequisites:** User is authenticated in multiple tabs

**Steps:**
1. Open AI Sessions in Tab 1 and Tab 2 (both authenticated)
2. Click logout in Tab 1
3. Immediately try to perform action in Tab 2

**Expected Results:**
- Tab 1 signs out successfully and shows unauthenticated state
- Tab 2 detects session is invalid
- Tab 2 either auto-refreshes to unauthenticated state or shows error on next action
- No errors or crashes in Tab 2

#### 6.6 OAuth State Parameter Validation
**Scenario:** Potential CSRF attack on OAuth flow

**Steps:**
1. Initiate OAuth flow and capture the `state` parameter from GitHub redirect
2. Attempt to reuse or modify the `state` parameter
3. Complete OAuth callback with invalid state

**Expected Results:**
- NextAuth.js validates the state parameter
- Invalid state is rejected
- User is shown error and not authenticated
- Security is maintained, no unauthorized access

### 7. Cross-Browser and Device Testing

**Seed:** `e2e/seed.spec.ts` (configure different Playwright projects)

#### 7.1 Chromium/Chrome Browser
**Steps:**
1. Run all authentication test scenarios on Chromium
2. Verify OAuth flow completion
3. Test session persistence

**Expected Results:**
- All authentication flows work correctly
- No browser-specific issues
- Session cookies set and persist properly

#### 7.2 Firefox Browser
**Steps:**
1. Run all authentication test scenarios on Firefox
2. Verify OAuth flow completion
3. Test session persistence

**Expected Results:**
- All authentication flows work correctly
- OAuth popups/redirects work properly
- Session cookies compatible with Firefox

#### 7.3 WebKit/Safari Browser
**Steps:**
1. Run all authentication test scenarios on WebKit
2. Verify OAuth flow completion
3. Test session persistence and cookie handling

**Expected Results:**
- All authentication flows work correctly
- Safari cookie restrictions don't break functionality
- Session persistence works with Safari's privacy settings

#### 7.4 Mobile Viewport Testing
**Prerequisites:** Configure Playwright for mobile viewports (e.g., iPhone 12, Pixel 5)

**Steps:**
1. Run authentication scenarios on mobile viewport
2. Verify touch interactions work correctly
3. Test responsive design of authentication overlay and sign-in page

**Expected Results:**
- Authentication overlay is properly sized and centered on mobile
- "Sign in with GitHub" button is easily tappable
- OAuth flow works on mobile browsers
- Responsive design maintains usability

### 8. Security and Compliance Testing

**Seed:** `e2e/seed.spec.ts`

#### 8.1 CSRF Token Validation
**Prerequisites:** User is authenticated

**Steps:**
1. Attempt to upload a transcript without CSRF token
2. Modify CSRF token before upload request
3. Observe error handling

**Expected Results:**
- Upload without CSRF token fails with 403 Forbidden
- Upload with invalid CSRF token fails with 403 Forbidden
- Error message: "Security token not loaded. Please refresh the page and try again."
- User must refresh to get valid CSRF token
- Prevents CSRF attacks

#### 8.2 Rate Limiting on Authentication
**Prerequisites:** Rate limiting configured (Upstash Redis)

**Steps:**
1. Attempt multiple rapid sign-in/sign-out cycles
2. Exceed rate limit threshold
3. Observe rate limiting response

**Expected Results:**
- After threshold exceeded, requests return 429 Too Many Requests
- Response includes `X-RateLimit-*` headers
- User is temporarily blocked from authentication actions
- Rate limit resets after time window
- If rate limiting not configured, requests proceed normally (graceful degradation)

#### 8.3 Secure Cookie Attributes
**Prerequisites:** Inspect cookies in browser DevTools

**Steps:**
1. Complete authentication flow
2. Open DevTools → Application → Cookies
3. Inspect NextAuth session cookie attributes

**Expected Results:**
- Cookie has `HttpOnly` flag set (prevents JavaScript access)
- In production: Cookie has `Secure` flag set (HTTPS only)
- In production: `SameSite` attribute is set (CSRF protection)
- Cookie has appropriate expiration time
- Cookie scope limited to application domain

#### 8.4 HTTPS Enforcement
**Prerequisites:** Production environment or HTTPS-configured staging

**Steps:**
1. Attempt to access application over HTTP
2. Observe redirect or enforcement

**Expected Results:**
- HTTP requests redirect to HTTPS
- Strict-Transport-Security header is set
- OAuth redirects use HTTPS callback URLs
- No mixed content warnings

### 9. Accessibility Testing

**Seed:** `e2e/seed.spec.ts`

#### 9.1 Keyboard Navigation - Sign-In Overlay
**Steps:**
1. Navigate to homepage (unauthenticated)
2. Use Tab key to navigate through page
3. Verify focus on "Sign in with GitHub" button
4. Press Enter to activate sign-in

**Expected Results:**
- Tab navigation reaches sign-in button
- Button has visible focus indicator
- Enter key activates sign-in flow
- All interactive elements are keyboard accessible

#### 9.2 Screen Reader Compatibility
**Prerequisites:** Use screen reader testing tool or Playwright accessibility checks

**Steps:**
1. Navigate to homepage with screen reader
2. Verify authentication overlay is announced
3. Check sign-in button has proper label

**Expected Results:**
- Authentication overlay context is clear to screen reader users
- "Sign in with GitHub" button has descriptive label
- SVG GitHub logo has `aria-label` or is hidden from screen readers
- Logout icon has `sr-only` text: "Sign out"
- Help icon has `sr-only` text: "Help"

#### 9.3 Color Contrast and Visual Clarity
**Steps:**
1. Review authentication overlay design
2. Check contrast ratios of text on overlay
3. Verify sign-in button contrast

**Expected Results:**
- Text on authentication overlay meets WCAG AA standards (4.5:1 minimum)
- Sign-in button has sufficient contrast with background
- Lock icon is clearly visible
- All text is legible at default browser settings

### 10. Performance and Loading States

**Seed:** `e2e/seed.spec.ts`

#### 10.1 Initial Page Load - Authentication Check
**Steps:**
1. Navigate to homepage
2. Measure time to determine authentication state
3. Observe loading behavior

**Expected Results:**
- Page renders initial content immediately (SSR)
- Authentication state determined server-side (no client-side flash)
- No FOUC (Flash of Unauthenticated Content)
- Authenticated/unauthenticated state displays correctly on first paint
- Page is interactive quickly (good TTI - Time to Interactive)

#### 10.2 OAuth Redirect Performance
**Steps:**
1. Initiate sign-in flow
2. Measure time from button click to GitHub OAuth page load
3. After authorization, measure time to return to AI Sessions

**Expected Results:**
- Redirect to GitHub happens quickly (<500ms)
- Callback processing is fast (<1 second)
- User experiences smooth transitions
- No long loading or blank screens

#### 10.3 Session Validation Performance
**Prerequisites:** User is authenticated

**Steps:**
1. Refresh page and measure session validation time
2. Navigate between pages and measure session checks

**Expected Results:**
- Session validation is fast (<100ms server-side)
- Page renders don't block on slow session checks
- Caching is used effectively for session data
- Database queries are optimized (indexed lookups)

## Testing Environment Setup

### Prerequisites

**Application Setup:**
- Next.js development server running on `http://localhost:3000`
- PostgreSQL database configured and running
- Prisma schema applied (migrations run)
- Environment variables configured:
  - `DATABASE_URL`: PostgreSQL connection string
  - `NEXTAUTH_URL`: `http://localhost:3000`
  - `NEXTAUTH_SECRET`: Random secret for session encryption
  - `GITHUB_CLIENT_ID`: GitHub OAuth App client ID
  - `GITHUB_CLIENT_SECRET`: GitHub OAuth App client secret

**GitHub OAuth App Setup:**
- GitHub OAuth App created at https://github.com/settings/developers
- Homepage URL: `http://localhost:3000`
- Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
- Client ID and Secret copied to environment variables

**Testing Tools:**
- Playwright configured (see `playwright.config.ts`)
- Test directory: `./e2e`
- Projects configured: Chromium, Firefox, WebKit
- Base URL: `http://localhost:3000` (can be configured)

### Test Data Requirements

**GitHub Accounts:**
- **New User Account**: GitHub account never used with this app (for first-time auth tests)
- **Returning User Account**: GitHub account previously authenticated (for returning user tests)
- **Test Account**: Dedicated GitHub account for automated testing (recommended)

**Database State:**
- **Fresh Database**: For testing first-time user registration
- **Seeded Database**: With existing users for returning user tests
- **Backup/Restore**: Ability to reset database state between test runs

### Running Tests

**Development Testing:**
```bash
# Start Next.js dev server
npm run dev

# In separate terminal, run Playwright tests
npx playwright test

# Run specific test file
npx playwright test e2e/auth-flow.spec.ts

# Run in headed mode (see browser)
npx playwright test --headed

# Run in debug mode
npx playwright test --debug
```

**CI/CD Testing:**
- Configure GitHub Actions or similar
- Use environment variables for secrets
- Run against staging environment
- Consider using Playwright Test fixtures for authentication state
- Mock OAuth flow in CI (or use test OAuth provider)

## Known Limitations and Considerations

### OAuth Testing Challenges

**Real GitHub OAuth:**
- Requires real GitHub credentials (not ideal for automation)
- Rate limits may apply to OAuth requests
- Network dependency (requires internet connection)
- GitHub UI may change, breaking tests

**Recommended Approach:**
- **Development**: Manual testing with real OAuth
- **CI/CD**: Mock OAuth provider or use Playwright fixtures to set session state
- **E2E Smoke Tests**: Periodic manual verification of OAuth flow

### Session State Management in Tests

**Challenge:** Need authenticated state for many test scenarios

**Solutions:**
1. **Full OAuth Flow**: Complete sign-in for each test (slow, brittle)
2. **Session Fixtures**: Create session directly in database, set cookie in browser (faster)
3. **Test Utilities**: Helper functions to authenticate test users programmatically

**Example Fixture Approach:**
```typescript
// e2e/fixtures/auth.ts
import { test as base } from '@playwright/test';
import { prisma } from '@/lib/prisma';

export const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    // Create user and session in database
    const user = await prisma.user.create({...});
    const session = await prisma.session.create({...});

    // Set session cookie
    await page.context().addCookies([{
      name: 'next-auth.session-token',
      value: session.sessionToken,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
    }]);

    await use(page);

    // Cleanup
    await prisma.session.delete({ where: { id: session.id } });
    await prisma.user.delete({ where: { id: user.id } });
  },
});
```

### Test Isolation and Cleanup

**Important Considerations:**
- Each test should be independent and not rely on state from previous tests
- Database should be cleaned between test runs (or use transactions)
- Sessions should be properly cleaned up to avoid conflicts
- Rate limiting state may need to be reset between tests (if using Upstash Redis)

### Environment-Specific Behavior

**Development vs. Production:**
- Cookie `Secure` flag only in production (HTTPS)
- HSTS headers only in production
- Rate limiting may be disabled in development
- OAuth callback URLs differ between environments

**Test Configuration:**
- Ensure tests are environment-aware
- Use different credentials for development, staging, production
- Never commit real OAuth credentials to version control

## Success Criteria

A comprehensive authentication test suite should validate:

**Functional Correctness:**
- ✓ Unauthenticated users see sign-in overlay and cannot upload
- ✓ Sign-in flow redirects to GitHub and back successfully
- ✓ First-time users are registered in database with correct data
- ✓ Returning users are authenticated without creating duplicates
- ✓ Authenticated users can access protected features (upload, My Transcripts)
- ✓ Sessions persist across page refreshes and tab changes
- ✓ Sign-out completely terminates session and returns to unauthenticated state

**Security:**
- ✓ CSRF tokens are validated on state-changing operations
- ✓ Sessions use httpOnly, secure cookies in production
- ✓ OAuth state parameter prevents CSRF attacks
- ✓ Rate limiting protects against abuse (if configured)
- ✓ Session expiration is handled gracefully

**User Experience:**
- ✓ Authentication state is clear and obvious to users
- ✓ Sign-in flow is smooth with minimal friction
- ✓ Error messages are helpful and actionable
- ✓ Loading states are displayed during async operations
- ✓ Mobile and desktop experiences are both good

**Reliability:**
- ✓ No race conditions in concurrent sign-in attempts
- ✓ No data corruption or duplicate records
- ✓ Graceful handling of network errors and timeouts
- ✓ Cross-browser compatibility (Chromium, Firefox, WebKit)
- ✓ Tests are stable and reproducible

## Appendix

### Related Files and Code References

**Authentication Implementation:**
- `/src/lib/auth.ts` - NextAuth.js configuration
- `/src/app/auth/signin/page.tsx` - Custom sign-in page
- `/src/components/UploadDropzoneWithAuth.tsx` - Upload with auth overlay
- `/src/components/site-header.tsx` - Header with auth-dependent elements

**Database Schema:**
- `/prisma/schema.prisma` - User, Account, Session models

**Security:**
- `/src/lib/csrf.ts` - CSRF protection
- `/src/lib/rate-limit.ts` - Rate limiting
- `/next.config.ts` - Security headers

**Test Files:**
- `/e2e/seed.spec.ts` - Basic seed test
- `/e2e/example.spec.ts` - Example Playwright tests
- `/playwright.config.ts` - Playwright configuration

### Additional Test Scenarios to Consider

**Advanced Scenarios:**
- Multi-factor authentication (if GitHub requires 2FA)
- OAuth scope changes and re-authorization
- Account deletion and data cleanup
- GDPR compliance (data export, right to be forgotten)
- Email verification workflow (if added)
- Social login with multiple providers (if added)

**Integration Tests:**
- Upload flow end-to-end (auth → upload → view)
- Transcript sharing with authenticated and unauthenticated viewers
- My Transcripts page with filtering and search
- Account settings and profile management

**Load and Stress Testing:**
- Concurrent authentication requests
- Database connection pooling under load
- Session storage performance at scale
- OAuth callback handling under high traffic

---

**Document Version:** 1.0
**Last Updated:** 2025-10-17
**Application Version:** Based on current codebase state
**Test Framework:** Playwright Test
**Target Environment:** Local development (`http://localhost:3000`)
