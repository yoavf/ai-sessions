# My Transcripts Page - Comprehensive Test Plan

## Application Overview

The My Transcripts page (`/my-transcripts`) is a protected, user-specific dashboard for managing uploaded AI coding session transcripts. This page is part of the AI Sessions application (ai-sessions.dev), built with Next.js 15, NextAuth.js for authentication, and PostgreSQL for data persistence.

### Key Features

- **Authentication-Required Access**: Only authenticated users can access this page
- **Transcript Management**: Display all transcripts owned by the authenticated user
- **Metadata Display**: Show title, creation date, message count, file size, and source
- **Transcript Actions**: View (navigate to transcript), delete individual transcripts
- **CLI Token Management**: Generate, copy, and revoke CLI authentication tokens
- **Account Deletion**: Complete account removal with double confirmation
- **Empty State Handling**: Friendly UI when no transcripts exist
- **Real-time Updates**: Client-side state updates after delete operations
- **Security Features**: CSRF protection on all mutating operations, rate limiting

### Technical Stack

- **Frontend**: Next.js 15 with React client components ("use client")
- **Authentication**: NextAuth.js v5 with GitHub OAuth
- **State Management**: React hooks (useState, useEffect, useCallback)
- **API Communication**: Fetch API with CSRF token handling
- **Security**: CSRF tokens, rate limiting (Upstash Redis)
- **Styling**: Tailwind CSS with shadcn/ui components

## Test Scenarios

### 1. Authentication and Access Control

**Seed:** `e2e/seed.spec.ts` (unauthenticated) or `e2e/seed-auth.spec.ts` (authenticated)

#### 1.1 Unauthenticated User Redirected to Sign-in

**Assumptions:**
- User is not authenticated
- No valid session cookie exists

**Steps:**
1. Navigate directly to `http://localhost:3000/my-transcripts`
2. Observe page behavior

**Expected Results:**
- User is redirected to `/auth/signin`
- Sign-in page displays with "Sign in with GitHub" option
- URL changes to `/auth/signin` (or authentication flow URL)
- No transcript data is exposed

#### 1.2 Authenticated User Can Access Page

**Assumptions:**
- User is authenticated via GitHub OAuth
- Valid session exists in database and cookie

**Steps:**
1. Sign in via GitHub OAuth
2. Navigate to `http://localhost:3000/my-transcripts`
3. Observe page loads successfully

**Expected Results:**
- Page loads without redirect
- URL remains `/my-transcripts`
- Header shows "My Transcripts" title
- Site header displays logout button
- Page subtitle reads "Manage your uploaded AI coding sessions"

#### 1.3 Session Expiry Handling

**Assumptions:**
- User was previously authenticated
- Session has expired or been invalidated

**Steps:**
1. Load page with expired session token
2. Wait for API response

**Expected Results:**
- 401 status received from `/api/transcripts`
- User is redirected to `/auth/signin`
- No error messages shown to user
- Graceful handling without crashes

### 2. Transcript List Display

**Seed:** `e2e/seed-auth.spec.ts` (authenticated with test transcripts)

#### 2.1 Display Empty State

**Assumptions:**
- User is authenticated
- User has no uploaded transcripts

**Steps:**
1. Navigate to `/my-transcripts` as authenticated user with zero transcripts
2. Wait for loading state to complete

**Expected Results:**
- Loading spinner disappears
- Card displayed with centered content
- Text reads: "You haven't uploaded any transcripts yet."
- Button displayed with text "Go to Home to Upload"
- Button links to `/` (homepage)
- No transcript list is visible
- "Upload New" button visible in header

#### 2.2 Display Single Transcript

**Assumptions:**
- User is authenticated
- User has exactly 1 uploaded transcript

**Steps:**
1. Upload one transcript via homepage
2. Navigate to `/my-transcripts`
3. Wait for data to load

**Expected Results:**
- Loading state completes
- Single transcript card displayed
- Transcript title is clickable link
- Metadata row shows:
  - Creation date (formatted: "MMM DD, YYYY, HH:MM AM/PM")
  - Source type (e.g., "Claude Code", "Codex", "CLI")
  - Message count (e.g., "42 messages")
  - File size (e.g., "15 KB", "2 MB")
  - Metadata separated by bullet points (•)
- Delete button visible with text "Delete"
- Hovering over title shows hover effect (text color changes)
- Hovering over row shows background color change

#### 2.3 Display Multiple Transcripts

**Assumptions:**
- User is authenticated
- User has 3+ uploaded transcripts

**Steps:**
1. Upload multiple transcripts with different properties:
   - Different titles
   - Different upload times
   - Different file sizes
   - Different sources (Claude Code, Codex, CLI)
2. Navigate to `/my-transcripts`

**Expected Results:**
- All transcripts displayed in single card with dividing lines
- Transcripts ordered by creation date (newest first)
- Each transcript shows complete metadata
- Each transcript has individual delete button
- Scrolling works if list exceeds viewport height
- No duplicate entries
- Total count matches number of uploaded transcripts

#### 2.4 Transcript Metadata Accuracy

**Assumptions:**
- User has transcripts with known metadata

**Steps:**
1. Upload transcript with specific properties:
   - Title: "Test Session 2025"
   - Message count: 10 messages
   - Source: Claude Code
2. Navigate to `/my-transcripts`
3. Locate the uploaded transcript

**Expected Results:**
- Title displays exactly as uploaded: "Test Session 2025"
- Message count displays: "10 messages"
- Source displays: "Claude Code" (human-readable format)
- Creation date displays in user's locale
- File size calculated correctly (shows KB/MB appropriately)
- All metadata visible without truncation

#### 2.5 Long Title Handling

**Assumptions:**
- User has transcript with very long title (100+ characters)

**Steps:**
1. Upload transcript with title: "This is a very long title that exceeds normal display width and should be handled gracefully by the UI layout system without breaking the design"
2. Navigate to `/my-transcripts`

**Expected Results:**
- Title is truncated with ellipsis (CSS: `truncate` class)
- Layout remains intact (no overflow)
- Full title visible on hover (browser tooltip)
- Delete button remains visible and accessible
- Metadata row not affected by long title

### 3. Transcript Actions - View

**Seed:** `e2e/seed-auth.spec.ts`

#### 3.1 Navigate to Transcript via Title Click

**Assumptions:**
- User has at least 1 transcript
- Transcript has secret token

**Steps:**
1. Navigate to `/my-transcripts`
2. Click on transcript title link

**Expected Results:**
- Navigation occurs to `/t/[secretToken]`
- Transcript viewer page loads
- Full transcript content displayed
- User can return via browser back button
- Original tab navigation (not new tab)

#### 3.2 Multiple Transcript Navigation

**Assumptions:**
- User has multiple transcripts

**Steps:**
1. Navigate to `/my-transcripts`
2. Click first transcript title
3. Use browser back button
4. Click second transcript title
5. Use browser back button

**Expected Results:**
- Each transcript opens its unique URL
- Back button returns to `/my-transcripts` each time
- Transcript list state preserved (no re-loading)
- No navigation errors
- Scroll position maintained on return

### 4. Transcript Actions - Delete

**Seed:** `e2e/seed-auth.spec.ts`

#### 4.1 Delete Single Transcript with Confirmation

**Assumptions:**
- User has at least 1 transcript
- CSRF token loaded successfully

**Steps:**
1. Navigate to `/my-transcripts`
2. Click "Delete" button on any transcript
3. Observe confirmation dialog
4. Click "Cancel" in dialog
5. Observe page state
6. Click "Delete" button again
7. Click "OK" in confirmation dialog
8. Wait for deletion to complete

**Expected Results:**
- **After Cancel:**
  - Confirmation dialog appears with message: "Are you sure you want to delete this transcript?"
  - Transcript remains in list
  - No API call made
  - Button still shows "Delete"
- **After OK:**
  - Button text changes to "Deleting..."
  - Button becomes disabled
  - DELETE request sent to `/api/transcripts/[token]`
  - CSRF token included in request header
  - Transcript removed from list upon success
  - No page reload required
  - Remaining transcripts still visible
  - No error messages shown

#### 4.2 Delete Last Transcript Shows Empty State

**Assumptions:**
- User has exactly 1 transcript

**Steps:**
1. Navigate to `/my-transcripts`
2. Click "Delete" on the only transcript
3. Confirm deletion
4. Wait for completion

**Expected Results:**
- Transcript deleted successfully
- Empty state automatically appears:
  - "You haven't uploaded any transcripts yet."
  - "Go to Home to Upload" button visible
- No page reload
- Smooth transition to empty state
- No error states

#### 4.3 Delete Without CSRF Token Shows Error

**Assumptions:**
- CSRF token fails to load (simulated by blocking cookie)

**Steps:**
1. Navigate to `/my-transcripts`
2. Clear CSRF cookie via DevTools
3. Click "Delete" button
4. Confirm in dialog

**Expected Results:**
- Alert appears: "Security token not loaded. Please refresh the page and try again."
- No DELETE request sent
- Transcript remains in list
- Button returns to "Delete" state
- User can refresh page to fix

#### 4.4 Delete While Offline Shows Error

**Assumptions:**
- User has transcripts
- Network disconnected after page load

**Steps:**
1. Navigate to `/my-transcripts`
2. Disable network connection (DevTools offline mode)
3. Click "Delete" on transcript
4. Confirm deletion

**Expected Results:**
- Request fails (network error)
- Alert shown: "Failed to delete transcript"
- Transcript remains in list
- Button returns to "Delete" state
- Can retry after reconnecting

#### 4.5 Concurrent Delete Operations

**Assumptions:**
- User has 3+ transcripts

**Steps:**
1. Navigate to `/my-transcripts`
2. Quickly click "Delete" on first transcript
3. Confirm deletion
4. Immediately click "Delete" on second transcript before first completes
5. Confirm second deletion

**Expected Results:**
- First deletion proceeds normally
- First button shows "Deleting..."
- Second deletion waits for first to complete (or processes concurrently)
- Both transcripts removed from list
- No race conditions
- No duplicate delete requests
- UI state remains consistent

#### 4.6 Delete Transcript Not Owned by User (Ownership Violation)

**Assumptions:**
- Manually crafted request to delete another user's transcript
- Using DevTools to modify secret token in request

**Steps:**
1. Navigate to `/my-transcripts`
2. Open DevTools Network tab
3. Modify delete request URL to use another user's token
4. Send request

**Expected Results:**
- API returns 403 Forbidden
- Transcript not deleted from database
- Error message shown
- User's transcript list unchanged
- Security check prevents unauthorized deletion

### 5. CLI Token Management

**Seed:** `e2e/seed-auth.spec.ts`

#### 5.1 CLI Access Section Visibility

**Assumptions:**
- User is authenticated
- Page loaded successfully

**Steps:**
1. Navigate to `/my-transcripts`
2. Scroll to bottom of page
3. Locate "CLI Access" section

**Expected Results:**
- Card with "CLI Access" heading visible
- Terminal icon displayed next to heading
- Description text: "Generate an authentication token to upload transcripts from the command line. Tokens are valid for 90 days."
- "Generate CLI Token" button visible
- Usage instructions section visible with:
  - Numbered list of 3 steps
  - Code example: `aisessions upload session.jsonl`
- "Revoke All CLI Tokens" section visible at bottom

#### 5.2 Generate CLI Token Successfully

**Assumptions:**
- User is authenticated
- CSRF token loaded
- Rate limit not exceeded (< 5 tokens in past hour)

**Steps:**
1. Navigate to `/my-transcripts`
2. Scroll to "CLI Access" section
3. Click "Generate CLI Token" button
4. Wait for response

**Expected Results:**
- Button text changes to "Generating..."
- Button becomes disabled
- POST request to `/api/cli/token` with CSRF header
- Success response received
- Alert box appears with:
  - Warning: "Make sure to copy your token now. You won't be able to see it again!"
  - Token displayed in monospace font
  - Token is long string (JWT format)
  - "Copy" button next to token
  - "Close" button below
- Usage instructions section hidden
- "Generate CLI Token" button hidden

#### 5.3 Copy CLI Token to Clipboard

**Assumptions:**
- CLI token already generated and visible

**Steps:**
1. Generate CLI token (follow 5.2)
2. Click "Copy" button next to token
3. Wait for feedback
4. Paste in text editor to verify

**Expected Results:**
- Button text changes to "Copied" with checkmark icon
- Button stays in "Copied" state for ~2 seconds
- Token copied to clipboard successfully
- Pasted token matches displayed token exactly
- Button returns to "Copy" state after timeout
- Can copy multiple times

#### 5.4 Close CLI Token Display

**Assumptions:**
- CLI token generated and visible

**Steps:**
1. Generate CLI token
2. Click "Close" button
3. Observe UI changes

**Expected Results:**
- Token alert box disappears
- "Generate CLI Token" button reappears
- Usage instructions reappear
- Token removed from client-side state
- Can generate new token again

#### 5.5 CLI Token Auto-Clear After 2 Minutes

**Assumptions:**
- CLI token generated
- User leaves page open

**Steps:**
1. Generate CLI token
2. Do not close token display
3. Wait 2 minutes (120 seconds)
4. Observe UI state

**Expected Results:**
- After exactly 2 minutes:
  - Token automatically cleared from state
  - Alert box disappears
  - "Generate CLI Token" button reappears
  - Security timeout enforced
  - No user interaction required

#### 5.6 Generate Token Without CSRF Protection

**Assumptions:**
- CSRF token not loaded

**Steps:**
1. Navigate to `/my-transcripts`
2. Clear CSRF cookie
3. Click "Generate CLI Token"

**Expected Results:**
- Alert: "Security token not loaded. Please refresh the page and try again."
- No API request sent
- Button returns to normal state
- Token not generated

#### 5.7 Generate Token Exceeding Rate Limit

**Assumptions:**
- User has generated 5 tokens in past hour
- Rate limit: 5 per hour

**Steps:**
1. Generate 5 CLI tokens within 1 hour
2. Attempt to generate 6th token
3. Observe response

**Expected Results:**
- Request returns 429 Too Many Requests
- Alert shows: "You can generate up to 5 CLI tokens per hour. Please try again later."
- No token generated
- Button returns to normal state
- Response includes rate limit headers:
  - `X-RateLimit-Limit: 5`
  - `X-RateLimit-Remaining: 0`

#### 5.8 Revoke All CLI Tokens Successfully

**Assumptions:**
- User is authenticated
- CSRF token loaded
- Rate limit not exceeded

**Steps:**
1. Navigate to `/my-transcripts`
2. Scroll to "Revoke All CLI Tokens" section
3. Click "Revoke All Tokens" button
4. Observe confirmation dialog
5. Click "Cancel" first
6. Click "Revoke All Tokens" again
7. Click "OK" to confirm

**Expected Results:**
- **After Cancel:**
  - Confirmation dialog: "Are you sure you want to revoke all CLI tokens? This will invalidate all existing CLI authentication tokens. You'll need to generate a new token to use the CLI again."
  - No API call made
  - Tokens remain valid
- **After OK:**
  - Button text changes to "Revoking..."
  - Button becomes disabled
  - POST request to `/api/account/revoke-cli-tokens` with CSRF
  - Success response received
  - Alert: "All CLI tokens have been revoked successfully."
  - Button returns to normal state
  - Any displayed token cleared from UI
  - All previously issued tokens now invalid

#### 5.9 Revoke Tokens Without CSRF

**Assumptions:**
- CSRF token missing

**Steps:**
1. Navigate to `/my-transcripts`
2. Clear CSRF cookie
3. Click "Revoke All Tokens"
4. Confirm in dialog

**Expected Results:**
- Alert: "Security token not loaded. Please refresh the page and try again."
- No API request sent
- Tokens remain valid
- Button returns to normal state

#### 5.10 Anchor Link Navigation to CLI Access

**Assumptions:**
- User navigates from help page with anchor

**Steps:**
1. Navigate to `/my-transcripts#cli-access`
2. Wait for page load
3. Observe scroll behavior

**Expected Results:**
- Page loads completely
- Browser automatically scrolls to "CLI Access" section
- Section is visible in viewport
- Smooth scroll animation
- URL hash remains: `#cli-access`

### 6. Account Deletion

**Seed:** `e2e/seed-auth.spec.ts`

#### 6.1 Account Deletion Section Visibility

**Assumptions:**
- User is authenticated
- Page loaded successfully

**Steps:**
1. Navigate to `/my-transcripts`
2. Scroll to bottom of page
3. Locate "Delete Account" section

**Expected Results:**
- Card with red/destructive border (2px)
- Heading: "Delete Account" in red/destructive color
- Description: "Permanently delete your account and all associated data. This action cannot be undone."
- "Delete My Account" button in destructive variant (red)
- Section visually separated from other content
- Clear warning styling

#### 6.2 Delete Account with Double Confirmation - Cancel First Step

**Assumptions:**
- User is authenticated
- Has at least 1 transcript

**Steps:**
1. Navigate to `/my-transcripts`
2. Click "Delete My Account" button
3. Observe first confirmation dialog
4. Click "Cancel"

**Expected Results:**
- Confirmation dialog appears with detailed warning:
  - "Are you sure you want to delete your account? This will permanently delete:"
  - Bullet list: transcripts, profile info, session data
  - "This action cannot be undone."
- After cancel:
  - Account not deleted
  - User remains on page
  - No API request sent
  - Button remains enabled

#### 6.3 Delete Account with Double Confirmation - Cancel Second Step

**Assumptions:**
- User is authenticated

**Steps:**
1. Navigate to `/my-transcripts`
2. Click "Delete My Account" button
3. Click "OK" in first confirmation
4. Observe text prompt dialog
5. Type "delete" (lowercase) in prompt
6. Click OK

**Expected Results:**
- First dialog confirms (OK clicked)
- Second prompt appears: "To confirm, please type 'DELETE' in all caps:"
- User enters "delete" (incorrect case)
- Alert: "Account deletion cancelled."
- Account not deleted
- User remains on page
- Button remains enabled
- No API request sent

#### 6.4 Delete Account Successfully

**Assumptions:**
- User is authenticated
- CSRF token loaded
- Rate limit not exceeded

**Steps:**
1. Navigate to `/my-transcripts`
2. Click "Delete My Account" button
3. Click "OK" in first confirmation
4. Type "DELETE" (all caps) in prompt
5. Click OK
6. Wait for deletion to complete

**Expected Results:**
- Both confirmations accepted
- Button text changes to "Deleting Account..."
- Button becomes disabled
- DELETE request to `/api/account` with CSRF token
- Account deleted from database (cascade deletes transcripts, sessions)
- Success alert: "Your account has been successfully deleted. You will now be signed out."
- User redirected to homepage (`/`)
- User signed out
- Session invalidated
- Cannot access `/my-transcripts` again without re-authenticating

#### 6.5 Delete Account Without CSRF Token

**Assumptions:**
- CSRF token not loaded

**Steps:**
1. Navigate to `/my-transcripts`
2. Clear CSRF cookie
3. Click "Delete My Account"
4. Confirm both dialogs (OK, type "DELETE")

**Expected Results:**
- Alert: "Security token not loaded. Please refresh the page and try again."
- No API request sent
- Account not deleted
- Button state returns to normal
- User remains signed in

#### 6.6 Delete Account Rate Limit Exceeded

**Assumptions:**
- User has made 5 account operations in past hour
- Rate limit: 5 per hour

**Steps:**
1. Perform 5 account operations (token generation/revocation)
2. Attempt account deletion
3. Complete both confirmations

**Expected Results:**
- Request returns 429 Too Many Requests
- Alert: "Too many account operations. Please try again later."
- Account not deleted
- Button returns to normal state
- User remains signed in
- Must wait until rate limit window expires

#### 6.7 Anchor Link Navigation to Delete Account

**Assumptions:**
- User navigates with anchor from help page

**Steps:**
1. Navigate to `/my-transcripts#delete-account`
2. Wait for page load

**Expected Results:**
- Page loads completely
- Browser scrolls to "Delete Account" section
- Section visible in viewport
- Smooth scroll animation
- URL hash: `#delete-account`

### 7. Loading and Error States

**Seed:** `e2e/seed-auth.spec.ts`

#### 7.1 Loading State Display

**Assumptions:**
- User is authenticated
- Slow network simulated (DevTools throttling)

**Steps:**
1. Enable network throttling (Slow 3G)
2. Navigate to `/my-transcripts`
3. Observe loading state

**Expected Results:**
- Loading spinner displayed (Loader2 component)
- Animated spinning icon
- Text: "Loading..."
- Muted text color
- Centered on page
- No transcript data visible
- No flash of content before loading

#### 7.2 API Error Handling

**Assumptions:**
- API endpoint returns 500 error

**Steps:**
1. Navigate to `/my-transcripts`
2. Simulate API failure (block request in DevTools)
3. Observe error state

**Expected Results:**
- Loading state completes
- Alert component displayed in destructive variant (red)
- Error message shown (generic or specific)
- No transcript list visible
- No page crash
- Console logs error for debugging
- User can refresh page to retry

#### 7.3 Network Failure Handling

**Assumptions:**
- Network disconnected during page load

**Steps:**
1. Navigate to `/my-transcripts`
2. Immediately disconnect network
3. Wait for request timeout

**Expected Results:**
- Loading eventually fails
- Error alert displayed
- Message indicates network/connection issue
- No infinite loading state
- Graceful error message
- User can reconnect and refresh

#### 7.4 Empty Response Handling

**Assumptions:**
- API returns empty array `[]` successfully

**Steps:**
1. Delete all transcripts
2. Navigate to `/my-transcripts`
3. Wait for load

**Expected Results:**
- Loading completes successfully
- Empty state displayed (same as 2.1)
- No error message
- "Go to Home to Upload" button visible
- No console errors

### 8. Header and Navigation

**Seed:** `e2e/seed-auth.spec.ts`

#### 8.1 Site Header Authenticated State

**Assumptions:**
- User is authenticated
- On `/my-transcripts` page

**Steps:**
1. Navigate to `/my-transcripts`
2. Observe site header

**Expected Results:**
- Site header visible at top
- "AI Sessions" logo/text links to homepage
- Help button (question mark icon) links to `/help`
- Logout button (logout icon) visible
- "My Transcripts" navigation button NOT visible (already on page)
- Header sticky (remains visible on scroll)
- Header has backdrop blur effect

#### 8.2 Navigation to Homepage via Logo

**Assumptions:**
- User on `/my-transcripts`

**Steps:**
1. Navigate to `/my-transcripts`
2. Click "AI Sessions" logo/text
3. Observe navigation

**Expected Results:**
- Navigate to `/` (homepage)
- Homepage displays upload dropzone
- Can return to `/my-transcripts` via navigation
- Session maintained

#### 8.3 Navigation to Help Page

**Assumptions:**
- User on `/my-transcripts`

**Steps:**
1. Navigate to `/my-transcripts`
2. Click help icon button in header
3. Observe navigation

**Expected Results:**
- Navigate to `/help`
- Help page content displayed
- Can return via back button
- Session maintained

#### 8.4 Sign Out Functionality

**Assumptions:**
- User is authenticated
- On `/my-transcripts`

**Steps:**
1. Navigate to `/my-transcripts`
2. Click logout icon button in header
3. Wait for sign out to complete

**Expected Results:**
- User signed out
- Session invalidated
- Redirected to homepage (`/`)
- No longer authenticated
- Cannot access `/my-transcripts` without re-authenticating
- Logout button calls `signOut({ callbackUrl: "/" })`

#### 8.5 Upload New Button Navigation

**Assumptions:**
- User on `/my-transcripts`

**Steps:**
1. Navigate to `/my-transcripts`
2. Locate "Upload New" button in top-right
3. Click button

**Expected Results:**
- Navigate to `/` (homepage)
- Upload dropzone visible and ready
- Can upload new transcript
- Session maintained
- Returns to `/my-transcripts` after upload via link

### 9. Responsive Design and Accessibility

**Seed:** `e2e/seed-auth.spec.ts`

#### 9.1 Mobile Viewport - Portrait (375x667)

**Assumptions:**
- User on mobile device or DevTools mobile emulation

**Steps:**
1. Set viewport to 375x667 (iPhone SE)
2. Navigate to `/my-transcripts`
3. Test all interactions

**Expected Results:**
- Page layout adapts to narrow width
- Header remains functional
- Transcript cards stack vertically
- Metadata wraps appropriately
- Delete buttons accessible
- CLI token section readable
- No horizontal scroll
- Touch targets adequate size (44x44px minimum)
- All buttons tappable

#### 9.2 Tablet Viewport (768x1024)

**Assumptions:**
- Tablet viewport

**Steps:**
1. Set viewport to 768x1024
2. Navigate to `/my-transcripts`
3. Observe layout

**Expected Results:**
- Layout utilizes medium width
- Content max-width container centered
- Proper padding maintained
- All features accessible
- Optimal reading width

#### 9.3 Desktop Large Viewport (1920x1080)

**Assumptions:**
- Large desktop monitor

**Steps:**
1. Set viewport to 1920x1080
2. Navigate to `/my-transcripts`
3. Observe layout

**Expected Results:**
- Content constrained to max-width (max-w-4xl)
- Centered on page
- Does not stretch full width
- Maintains readability
- Proper spacing

#### 9.4 Keyboard Navigation

**Assumptions:**
- User navigating with keyboard only

**Steps:**
1. Navigate to `/my-transcripts`
2. Press Tab key repeatedly
3. Test all interactive elements

**Expected Results:**
- Focus order logical (top to bottom)
- All buttons reachable via Tab
- Focus indicators visible (outline/ring)
- Can activate buttons with Enter/Space
- Links accessible via keyboard
- Dropdown/modal interactions work
- Delete confirmation via keyboard
- No keyboard traps

#### 9.5 Screen Reader Support

**Assumptions:**
- Screen reader enabled (VoiceOver, NVDA, JAWS)

**Steps:**
1. Enable screen reader
2. Navigate to `/my-transcripts`
3. Navigate through page content

**Expected Results:**
- Page title announced
- Headings structure logical (h1, h2, h3)
- Button purposes clear
- Links descriptive
- Loading states announced
- Error messages announced
- Icon buttons have sr-only labels
  - Help button: "Help"
  - Logout button: "Sign out"
- Form confirmations accessible
- ARIA labels where needed

### 10. Security and Data Integrity

**Seed:** `e2e/seed-auth.spec.ts`

#### 10.1 CSRF Token Validation on All Mutations

**Assumptions:**
- All state-changing operations require CSRF

**Steps:**
1. Open DevTools Network tab
2. Perform each mutation operation:
   - Delete transcript
   - Generate CLI token
   - Revoke CLI tokens
   - Delete account
3. Inspect request headers

**Expected Results:**
- All POST/DELETE requests include:
  - `x-csrf-token` header with valid token
- Server validates token
- Requests without token return 403 Forbidden
- Token retrieved from cookie
- Token validated server-side

#### 10.2 User Can Only See Own Transcripts

**Assumptions:**
- Multiple users in database with transcripts

**Steps:**
1. Authenticate as User A
2. Navigate to `/my-transcripts`
3. Note transcripts visible
4. Sign out
5. Authenticate as User B
6. Navigate to `/my-transcripts`

**Expected Results:**
- User A sees only their own transcripts
- User B sees only their own transcripts
- No overlap between users
- SQL query filters by `userId`
- No data leakage

#### 10.3 Delete Operation Validates Ownership

**Assumptions:**
- Two users with transcripts

**Steps:**
1. Authenticate as User A
2. Get secret token of User B's transcript (via DB or intercept)
3. Attempt DELETE via DevTools to User B's token

**Expected Results:**
- API returns 403 Forbidden
- Transcript not deleted
- Server checks `transcript.userId === session.user.id`
- Authorization enforced
- Error logged server-side

#### 10.4 Rate Limiting Enforcement

**Assumptions:**
- Rate limits configured (Redis)

**Steps:**
1. Rapidly perform 10 transcript uploads
2. Attempt 11th upload
3. Check response

**Expected Results:**
- First 10 succeed
- 11th returns 429 Too Many Requests
- Rate limit headers present:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
- Message: "You can upload up to 10 transcripts per hour. Please try again later."
- Similar enforcement for:
  - CLI token generation (5/hour)
  - Account operations (5/hour)
  - Public views (100 per 5 min by IP)

#### 10.5 Session Hijacking Prevention

**Assumptions:**
- Attacker attempts to use stolen session token

**Steps:**
1. Authenticate normally
2. Copy session cookie value
3. Sign out
4. Attempt to use old session cookie
5. Navigate to `/my-transcripts`

**Expected Results:**
- Session invalidated on sign out
- Old cookie no longer valid
- Redirect to sign-in page
- Cannot access protected resources
- HTTPOnly cookies prevent JS access

### 11. Edge Cases and Boundary Conditions

**Seed:** `e2e/seed-auth.spec.ts`

#### 11.1 Transcript with Zero Messages

**Assumptions:**
- Transcript uploaded with empty messages array

**Steps:**
1. Upload transcript with 0 messages
2. Navigate to `/my-transcripts`
3. Observe display

**Expected Results:**
- Transcript listed normally
- Message count shows: "0 messages"
- No errors
- Can view transcript (shows empty content)
- Can delete normally

#### 11.2 Transcript with Very Large Message Count

**Assumptions:**
- Transcript with 10,000+ messages

**Steps:**
1. Upload transcript with 10,000 messages
2. Navigate to `/my-transcripts`
3. Check display

**Expected Results:**
- Message count displays: "10,000 messages"
- No formatting issues
- Number not truncated
- Metadata row layout intact

#### 11.3 Transcript Uploaded Today vs Older

**Assumptions:**
- Transcripts from different dates

**Steps:**
1. Upload transcript today
2. Check database, manually set older transcript to 30 days ago
3. Navigate to `/my-transcripts`

**Expected Results:**
- Recent transcript shows today's date/time
- Older transcript shows correct past date
- Date formatting consistent
- Sorted correctly (newest first)
- Timezone handling correct for user locale

#### 11.4 File Size Boundary Values

**Assumptions:**
- Transcripts of various sizes

**Steps:**
1. Upload transcripts:
   - 100 Bytes
   - 1 KB (1,024 bytes)
   - 1 MB (1,048,576 bytes)
   - 4.9 MB (near limit)
2. Navigate to `/my-transcripts`

**Expected Results:**
- 100 Bytes: "100 Bytes"
- 1 KB: "1 KB"
- 1 MB: "1 MB"
- 4.9 MB: "5 MB" (rounded)
- Correct unit selection
- Rounding appropriate

#### 11.5 Special Characters in Transcript Title

**Assumptions:**
- Transcript with special characters

**Steps:**
1. Upload transcript with title: `<script>alert("XSS")</script> & "Test" 'Title'`
2. Navigate to `/my-transcripts`

**Expected Results:**
- Title displayed as plain text (escaped)
- No script execution (XSS prevented)
- HTML entities rendered safely
- React auto-escaping works
- No layout breakage

#### 11.6 Simultaneous Page Access in Multiple Tabs

**Assumptions:**
- User opens `/my-transcripts` in 2 tabs

**Steps:**
1. Open `/my-transcripts` in Tab 1
2. Open `/my-transcripts` in Tab 2
3. Delete transcript in Tab 1
4. Observe Tab 2

**Expected Results:**
- Both tabs load independently
- Delete in Tab 1 succeeds
- Tab 2 still shows deleted transcript (stale data)
- Refreshing Tab 2 updates list
- No synchronization between tabs (expected behavior)
- No errors in either tab

#### 11.7 Browser Back/Forward Navigation

**Assumptions:**
- User navigates through app

**Steps:**
1. Navigate to homepage
2. Navigate to `/my-transcripts`
3. Navigate to specific transcript `/t/[token]`
4. Click browser back button
5. Click browser forward button

**Expected Results:**
- Back from transcript returns to `/my-transcripts`
- Transcript list not re-fetched (cached)
- Forward returns to transcript
- No unnecessary re-renders
- State preserved correctly

### 12. Performance and Optimization

**Seed:** `e2e/seed-auth.spec.ts`

#### 12.1 Page Load Performance

**Assumptions:**
- User has 50 transcripts

**Steps:**
1. Upload 50 transcripts
2. Navigate to `/my-transcripts`
3. Measure load time (DevTools Performance)

**Expected Results:**
- Initial render < 1 second
- API response < 500ms (local)
- Minimal re-renders
- No unnecessary API calls
- useCallback prevents fetch re-creation
- Efficient React rendering

#### 12.2 Scroll Performance with Many Transcripts

**Assumptions:**
- User has 100+ transcripts

**Steps:**
1. Upload 100+ transcripts
2. Navigate to `/my-transcripts`
3. Scroll rapidly through list
4. Monitor performance

**Expected Results:**
- Smooth scrolling (60fps)
- No jank or lag
- Hover effects responsive
- Browser handles list efficiently
- Consider virtualization if > 500 items
- No memory leaks

#### 12.3 Delete Operation Optimistic Update

**Assumptions:**
- User has multiple transcripts

**Steps:**
1. Navigate to `/my-transcripts`
2. Delete transcript
3. Observe UI update timing

**Expected Results:**
- Transcript removed from UI immediately after API success
- `setTranscripts(prev => prev.filter(...))` updates state
- No flash of content
- Smooth removal animation (if implemented)
- No page reload
- Optimistic UI pattern

### 13. Integration Points

**Seed:** `e2e/seed-auth.spec.ts`

#### 13.1 Integration with Upload Flow

**Assumptions:**
- User uploads transcript from homepage

**Steps:**
1. Navigate to homepage
2. Upload transcript
3. Receive success message with link
4. Click "View My Transcripts" link
5. Navigate to `/my-transcripts`

**Expected Results:**
- Newly uploaded transcript appears in list
- Sorted to top (newest first)
- All metadata correct
- Can navigate back to upload more

#### 13.2 Integration with Help Page Links

**Assumptions:**
- Help page contains anchor links to `/my-transcripts`

**Steps:**
1. Navigate to `/help`
2. Click link: "Manage CLI tokens"
3. Observe navigation

**Expected Results:**
- Navigate to `/my-transcripts#cli-access`
- Page scrolls to CLI section
- Anchor navigation works
- User can generate token from help flow

#### 13.3 Post-Delete Account Cleanup

**Assumptions:**
- User deletes account

**Steps:**
1. Navigate to `/my-transcripts`
2. Delete account (complete flow)
3. Attempt to navigate to deleted user's transcript URL
4. Check database

**Expected Results:**
- All transcripts deleted (cascade)
- All sessions deleted
- User record removed
- Transcript URLs return 404
- Complete data removal
- GDPR compliance

## Test Data Requirements

### Sample Transcripts

To effectively test the My Transcripts page, the following test data should be available:

1. **Empty State**: User with 0 transcripts
2. **Single Transcript**: User with 1 transcript
3. **Multiple Transcripts**: User with 3-5 transcripts of varying properties:
   - Different sources (Claude Code, Codex, CLI)
   - Different message counts (1, 10, 100, 1000+)
   - Different file sizes (1 KB, 100 KB, 4 MB)
   - Different titles (short, long, special characters)
   - Different creation dates (today, yesterday, 30 days ago)
4. **Large Dataset**: User with 50-100 transcripts for performance testing
5. **Edge Cases**:
   - Transcript with 0 messages
   - Transcript with very long title (100+ chars)
   - Transcript with special characters in title
   - Maximum file size (near 5 MB limit)

### Test Users

1. **Test User A**: Has 3 transcripts
2. **Test User B**: Has 5 transcripts (different from User A)
3. **Test User C**: Has 0 transcripts (new user)
4. **Test User D**: Has 100 transcripts (performance testing)

### Database State

- Clean database for each test suite
- Seed with test users and transcripts
- CLI tokens with various expiration states
- Rate limit counters at various levels

## Environment Requirements

- **Database**: PostgreSQL test database
- **Redis** (optional): Upstash Redis for rate limiting (gracefully degrades if not configured)
- **Environment Variables**:
  - `DATABASE_URL`: Test database connection
  - `NEXTAUTH_URL`: `http://localhost:3000`
  - `NEXTAUTH_SECRET`: Test secret
  - `GITHUB_CLIENT_ID`: Test OAuth app
  - `GITHUB_CLIENT_SECRET`: Test OAuth secret
  - `UPSTASH_REDIS_REST_URL` (optional)
  - `UPSTASH_REDIS_REST_TOKEN` (optional)
- **Development Server**: Running on `localhost:3000`
- **Playwright**: Configured with chromium browser

## Automation Recommendations

### High Priority for Automation

1. Authentication flow (1.1, 1.2, 1.3)
2. Empty state display (2.1)
3. Single and multiple transcript display (2.2, 2.3)
4. Delete transcript with confirmation (4.1, 4.2)
5. Generate and copy CLI token (5.2, 5.3)
6. Account deletion flow (6.4)
7. CSRF token validation (10.1)
8. Rate limiting (10.4)

### Manual Testing Recommended

1. Screen reader accessibility (9.5)
2. Visual design verification
3. Cross-browser compatibility
4. Real mobile device testing
5. Performance profiling (12.1, 12.2)

### Continuous Integration

- Run authentication tests on every PR
- Run full suite nightly
- Performance benchmarks weekly
- Security tests (CSRF, ownership) on every PR

## Success Criteria

A test scenario passes if:

1. **Functional**: All expected behaviors occur as documented
2. **Accessible**: Keyboard navigation and screen readers work
3. **Secure**: CSRF, authentication, and authorization checks pass
4. **Performant**: Page loads < 1s, interactions responsive
5. **Robust**: Error handling graceful, no crashes
6. **Cross-browser**: Works in Chrome, Firefox, Safari
7. **Responsive**: Works on mobile, tablet, desktop viewports

## Known Limitations

1. **No Real-time Sync**: Deletes in one tab don't update other tabs (by design)
2. **CLI Token Single-View**: Generated token only shown once (security feature)
3. **Rate Limiting**: Requires Redis for enforcement (gracefully degrades without)
4. **OAuth Testing**: GitHub OAuth requires real credentials or mocking
5. **Timezone Display**: Date formatting uses user's browser locale

## Appendix

### API Endpoints Used

- `GET /api/transcripts` - Fetch user's transcripts
- `DELETE /api/transcripts/[token]` - Delete specific transcript
- `POST /api/cli/token` - Generate CLI authentication token
- `POST /api/account/revoke-cli-tokens` - Revoke all CLI tokens
- `DELETE /api/account` - Delete user account

### Key Components

- `MyTranscriptsPage` - Main page component
- `SiteHeader` - Navigation header
- `Card`, `Button`, `Alert` - UI components from shadcn/ui
- `useCsrfToken` - CSRF token management hook
- `useSession` - NextAuth session hook

### File Locations

- Page: `/src/app/my-transcripts/page.tsx`
- API Routes: `/src/app/api/transcripts/`, `/src/app/api/cli/`, `/src/app/api/account/`
- Auth: `/src/lib/auth.ts`
- CSRF: `/src/lib/csrf.ts`
- Rate Limiting: `/src/lib/rate-limit.ts`

---

**Document Version**: 1.0
**Last Updated**: 2025-10-18
**Author**: Test Planning Team
**Review Status**: Ready for Implementation
