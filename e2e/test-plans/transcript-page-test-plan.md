# Transcript Page (/t/[token]) - Comprehensive Test Plan

## Application Overview

The Transcript Page displays Claude Code session transcripts in a public, shareable format. Users can access transcripts via a secret token URL without authentication. The page provides rich formatting for different content types including tool calls, thinking blocks, code blocks, and interactive elements.

### Key Features

- **Public Access**: No authentication required, accessible via secret token
- **Rich Content Display**: Supports various content types (text, thinking, tool calls, code blocks, bash output)
- **User Information**: Shows creator's GitHub avatar, username, and profile link
- **Metadata Display**: Shows message counts, creation time, session statistics, and model usage
- **Interactive Elements**: Collapsible thinking blocks and tool call sections
- **Syntax Highlighting**: Code blocks with language-specific highlighting and copy functionality
- **Owner Actions**: Edit title and delete transcript (authenticated owners only)
- **Share Functionality**: Copy transcript URL to clipboard
- **Table of Contents**: Floating TOC for navigation (on large screens)
- **Responsive Design**: Adapts to mobile, tablet, and desktop views

## Test Scenarios

### 1. Page Loading and Basic Rendering

**Seed:** `e2e/seed-transcript.spec.ts`

#### 1.1 Load Valid Transcript Successfully
**Prerequisites:** Valid transcript exists in database with various content types

**Steps:**
1. Navigate to `/t/[valid-token]` where `[valid-token]` is the secret token of an existing transcript
2. Wait for page to fully load

**Expected Results:**
- Page loads without errors (200 status)
- Site header is visible with logo
- Transcript title is displayed in header section
- User metadata section is visible
- All messages are rendered
- No console errors appear

#### 1.2 Handle Invalid Token (404)
**Steps:**
1. Navigate to `/t/invalid-token-12345` with a non-existent token
2. Wait for response

**Expected Results:**
- Page shows Next.js 404 "Page Not Found" error
- URL remains `/t/invalid-token-12345`
- No transcript content is displayed
- No sensitive error information is exposed

#### 1.3 Handle Malformed Token
**Steps:**
1. Navigate to `/t/../../etc/passwd` (path traversal attempt)
2. Navigate to `/t/<script>alert('xss')</script>` (XSS attempt)
3. Navigate to `/t/token-with-special-chars-!@#$%`

**Expected Results:**
- All attempts result in 404 Not Found
- No script execution or path traversal occurs
- Application handles invalid input gracefully
- Security is maintained

### 2. Transcript Metadata Display

**Seed:** `e2e/seed-transcript.spec.ts`

#### 2.1 Display User Information (With GitHub Username)
**Prerequisites:** Transcript created by user with GitHub username and avatar

**Steps:**
1. Navigate to transcript page
2. Locate the metadata section below the title

**Expected Results:**
- GitHub avatar image is displayed (circular, 20x20px or 5rem height/width)
- GitHub username is displayed as clickable link
- Link points to `https://github.com/{username}`
- Link has correct rel attributes: `rel="nofollow noopener noreferrer"`
- Link opens in new tab (`target="_blank"`)
- Hovering over username shows underline
- Avatar and username have hover effect (transition to foreground color)

#### 2.2 Display User Information (Anonymous User)
**Prerequisites:** Transcript created by user without GitHub username

**Steps:**
1. Create transcript for user without githubUsername field
2. Navigate to transcript page

**Expected Results:**
- No GitHub avatar is displayed
- No GitHub username link is displayed
- Other metadata is still visible (time, message counts)
- Layout remains consistent without user info

#### 2.3 Display Time Information
**Prerequisites:** Transcript with known creation time

**Steps:**
1. Navigate to transcript created at various times (1 hour ago, 1 day ago, 1 week ago, etc.)
2. Check time display format

**Expected Results:**
- Recent transcripts show abbreviated format: "1m ago", "5h ago", "2d ago"
- Very recent shows "just now" (less than 1 minute)
- Older transcripts show: "1w ago", "1mo ago", "1y ago"
- Time is displayed in muted foreground color
- Format is consistent and human-readable

#### 2.4 Display Message Count Statistics
**Prerequisites:** Transcript with mixed message types

**Steps:**
1. Navigate to transcript with known message counts
2. Locate statistics in metadata row

**Expected Results:**
- Shows format: "X user, Y assistant, Z tool call(s)"
- User count includes only user role messages (excluding tool results)
- Assistant count includes only assistant messages
- Tool call count shows number of tool_use blocks across all assistant messages
- Counts are accurate
- Proper pluralization: "1 tool call" vs "2 tool calls"
- Hovering shows tooltip with full breakdown

#### 2.5 Display Model Usage Statistics
**Prerequisites:** Transcript with model information in messages

**Steps:**
1. Navigate to transcript with model usage data
2. Check for model statistics in metadata

**Expected Results:**
- Shows "Models: {model-name} (X%)" format
- If multiple models used, shows all with percentages
- Percentages add up to 100%
- Hovering shows tooltip: "{model}: X messages"
- Statistics are separated by bullet points (•)
- Only shown when model data is available

### 3. Transcript Header and Title

**Seed:** `e2e/seed-transcript.spec.ts`

#### 3.1 Display Default Generated Title
**Prerequisites:** Transcript created without custom title (UUID or session ID as title)

**Steps:**
1. Create transcript with UUID or sessionId as title field
2. Navigate to transcript page

**Expected Results:**
- Title is generated based on source and date
- Format: "Claude Code Session - {Month Day, Year}" (e.g., "Claude Code Session - January 15, 2025")
- Title is displayed as h1 element
- Title is in large, bold font (text-xl sm:text-2xl)
- Title does not show raw UUID or session ID

#### 3.2 Display Custom Title
**Prerequisites:** Transcript with user-defined title

**Steps:**
1. Create transcript with custom title "My Python Tutorial"
2. Navigate to transcript page

**Expected Results:**
- Custom title "My Python Tutorial" is displayed
- Title is displayed as h1 element
- Title format and styling same as default title
- Title wraps properly on small screens (break-words)

#### 3.3 Edit Title as Owner (Desktop)
**Prerequisites:** Authenticated as transcript owner, viewing on desktop

**Steps:**
1. Sign in as transcript owner
2. Navigate to owned transcript
3. Hover over title
4. Observe pencil icon appears on right side of title
5. Click anywhere on title
6. Type new title "Updated Title"
7. Press Enter key

**Expected Results:**
- On hover, title text becomes muted and pencil icon fades in
- Clicking title replaces it with input field
- Input field is pre-filled with current title
- Input has same styling as title (text-xl sm:text-2xl)
- After Enter, "Saving..." button text appears briefly
- Title updates to new value
- Input field is replaced with updated title
- PATCH request sent to `/api/transcripts/[token]` with CSRF token
- Changes persist after page refresh

#### 3.4 Edit Title as Owner (Mobile)
**Prerequisites:** Authenticated as transcript owner, viewing on mobile

**Steps:**
1. Sign in as transcript owner
2. Navigate to owned transcript on mobile viewport (< 640px)
3. Tap on title
4. Type new title using mobile keyboard
5. Tap "Save" button

**Expected Results:**
- No pencil icon visible on mobile (hidden with sm:block)
- Tapping title still activates edit mode
- Input field is full width on mobile
- Save and Cancel buttons stack vertically on small screens
- Mobile keyboard appears for text input
- Save button works same as desktop

#### 3.5 Edit Title - Cancel Action
**Prerequisites:** Authenticated as transcript owner

**Steps:**
1. Click on title to enter edit mode
2. Modify the title text
3. Click "Cancel" button (or press Escape key)

**Expected Results:**
- Input field reverts to original title
- No API request is sent
- Edit mode exits
- Original title is displayed unchanged

#### 3.6 Edit Title - Empty/Whitespace Title
**Prerequisites:** Authenticated as transcript owner

**Steps:**
1. Click on title to enter edit mode
2. Clear all text (empty string)
3. Press Enter
4. Try again with only spaces "   "
5. Press Enter

**Expected Results:**
- Empty title submission cancels edit mode
- Whitespace-only title cancels edit mode
- Original title remains unchanged
- No API request is sent
- No error message displayed (graceful handling)

#### 3.7 View Title as Non-Owner
**Prerequisites:** Not authenticated or authenticated as different user

**Steps:**
1. View transcript as non-owner
2. Hover over title
3. Try to click title

**Expected Results:**
- Title is displayed as plain h1 (no hover effect)
- No pencil icon appears
- Title is not clickable
- No edit functionality is available
- Title remains static text

#### 3.8 Edit Title - API Error Handling
**Prerequisites:** Authenticated as owner, simulated API error

**Steps:**
1. Click title to edit
2. Enter new title "Test Title"
3. Mock API to return 500 error
4. Press Enter

**Expected Results:**
- "Saving..." indicator appears
- After error, alert shows "Failed to update title"
- Title reverts to original value
- Edit mode remains active initially
- User can retry or cancel

### 4. Message Rendering - Text Content

**Seed:** `e2e/seed-transcript.spec.ts`

#### 4.1 Render Basic Text Message (User)
**Prerequisites:** Transcript with simple user text message

**Steps:**
1. Navigate to transcript
2. Locate user message with content: "Create a hello world program"

**Expected Results:**
- Message is displayed in user message container
- Background has accent color (bg-accent)
- Text has accent-foreground color
- Label "User" is shown above message content
- Timestamp is displayed next to "User" label in format "HH:mm:ss"
- Message has proper spacing and padding
- Text is rendered with prose styling (prose-sm)

#### 4.2 Render Basic Text Message (Assistant)
**Prerequisites:** Transcript with assistant text message

**Steps:**
1. Navigate to transcript
2. Locate assistant message with text content

**Expected Results:**
- Message is displayed in assistant message container
- Background is default (no special accent)
- Label "Assistant" is shown above content
- Timestamp is displayed next to label
- Text is rendered with prose styling
- Markdown-like formatting is preserved
- Message has proper spacing between paragraphs

#### 4.3 Render Multi-Paragraph Text
**Prerequisites:** Transcript with message containing multiple paragraphs

**Steps:**
1. Navigate to transcript with multi-paragraph content

**Expected Results:**
- All paragraphs are rendered
- Proper spacing between paragraphs
- Line breaks are preserved
- No content is truncated
- Prose styling applies to all paragraphs

#### 4.4 Render Text with Code Inline
**Prerequisites:** Message with inline code using backticks

**Steps:**
1. Find message with text: "Use the `print()` function to output"

**Expected Results:**
- Inline code is rendered with monospace font
- Code has distinct background color
- Code formatting is distinguishable from regular text
- Prose styling handles inline code properly

### 5. Message Rendering - Thinking Blocks

**Seed:** `e2e/seed-transcript.spec.ts`

#### 5.1 Display Collapsed Thinking Block (Default)
**Prerequisites:** Transcript with thinking block

**Steps:**
1. Navigate to transcript
2. Locate assistant message with thinking content

**Expected Results:**
- Thinking block is collapsed by default (defaultOpen={false})
- Shows "Reasoning" trigger/button
- Button has icon indicating collapsed state
- Content is hidden initially
- Button is clickable
- Styling indicates it's an interactive element

#### 5.2 Expand Thinking Block
**Prerequisites:** Collapsed thinking block visible

**Steps:**
1. Click on "Reasoning" trigger button
2. Observe animation and content reveal

**Expected Results:**
- Content expands smoothly with animation
- Full thinking text is displayed
- Button icon changes to indicate expanded state
- Content is readable with proper formatting
- Thinking text has distinct styling (different background)

#### 5.3 Collapse Thinking Block
**Prerequisites:** Expanded thinking block

**Steps:**
1. Click trigger button again to collapse

**Expected Results:**
- Content collapses smoothly
- Animation reverses
- Content is hidden
- Button returns to collapsed state icon
- State is maintained during page interaction (no reset)

#### 5.4 Multiple Thinking Blocks Independence
**Prerequisites:** Transcript with multiple thinking blocks

**Steps:**
1. Expand first thinking block
2. Expand second thinking block
3. Collapse first thinking block

**Expected Results:**
- Each thinking block has independent state
- Expanding one doesn't affect others
- Multiple can be open simultaneously
- Collapsing one doesn't affect others
- State management is properly isolated

### 6. Message Rendering - Tool Calls

**Seed:** `e2e/seed-transcript.spec.ts`

#### 6.1 Display Collapsed Tool Call (Default)
**Prerequisites:** Transcript with tool_use block

**Steps:**
1. Navigate to transcript
2. Locate tool call block (e.g., Write, Read, Bash)

**Expected Results:**
- Tool call is collapsed by default (for most tools)
- Shows tool name in header (e.g., "Write")
- Shows preview information if available (e.g., file path)
- Format: "{ToolName}: {preview}" (e.g., "Write: /tmp/hello.py")
- Has visual indicator of state (collapsed icon)
- Styled as distinct block with border
- Header is clickable

#### 6.2 Display Tool Call Preview - File Operations
**Prerequisites:** Transcript with Write/Read/Edit tool calls

**Steps:**
1. Find Write tool call with file_path parameter
2. Find Read tool call with file_path parameter

**Expected Results:**
- Write shows: "Write: /path/to/file.py"
- Read shows: "Read: /path/to/file.py"
- Edit shows: "Edit: /path/to/file.py"
- File paths are displayed in full
- Preview is truncated if too long (with ellipsis)

#### 6.3 Display Tool Call Preview - Bash Command
**Prerequisites:** Transcript with Bash tool call

**Steps:**
1. Find Bash tool call with command parameter
2. Check various command types (npm, npx, basic commands)

**Expected Results:**
- Shows command preview in header
- npm commands: "npm run dev" or "npm install"
- npx commands: "npx prisma migrate"
- Other commands: first ~50 chars or until &&, ||, |, ;
- Long commands truncated with "..."
- Command has monospace font styling

#### 6.4 Display Tool Call Preview - Other Tools
**Prerequisites:** Transcript with various tool types

**Steps:**
1. Find Glob tool call (shows pattern)
2. Find Grep tool call (shows pattern in quotes)
3. Find WebFetch tool call (shows URL)

**Expected Results:**
- Glob: "Glob: **/*.ts"
- Grep: "Grep: \"pattern\""
- WebFetch: "WebFetch: https://example.com"
- Each tool shows most relevant parameter
- Preview is informative and concise

#### 6.5 Expand Tool Call - View Input Parameters
**Prerequisites:** Collapsed tool call

**Steps:**
1. Click on tool call header to expand

**Expected Results:**
- Tool call expands smoothly
- Input parameters section is displayed
- Parameters shown as formatted JSON
- JSON has syntax highlighting
- Keys and values are distinguishable
- Proper indentation and formatting
- Long JSON values are readable
- Background distinguishes from tool result

#### 6.6 Expand Tool Call - View Tool Results
**Prerequisites:** Tool call with tool_result

**Steps:**
1. Expand tool call that has completed
2. View results section

**Expected Results:**
- Results section is labeled "Result" or "Error"
- Success results have "Result" header
- Error results have "Error" header
- Result content is displayed in monospace font
- Result has distinct background (muted)
- Result is scrollable if long
- Result preserves formatting (whitespace, newlines)
- If duration metadata exists, shows "(Xs)" next to header

#### 6.7 Tool Call - Multiple Results
**Prerequisites:** Tool call with multiple tool_result entries

**Steps:**
1. Find tool call that returned multiple results
2. Expand tool call

**Expected Results:**
- All results are displayed
- Each result has its own section
- Results are ordered correctly
- Each can show duration if available
- Clear separation between results

#### 6.8 Tool Call - Error Result
**Prerequisites:** Tool call that failed (is_error: true)

**Steps:**
1. Find failed tool call
2. Expand to view error

**Expected Results:**
- Header shows "Error" instead of "Result"
- Error message is clearly displayed
- Error has distinct styling (possibly red tint)
- Error content is readable
- Indicates tool execution failed

#### 6.9 Collapse Tool Call
**Prerequisites:** Expanded tool call

**Steps:**
1. Click header to collapse

**Expected Results:**
- Tool call collapses smoothly
- Returns to preview state
- Input and results are hidden
- State persists during page interaction

#### 6.10 Special Tool - TodoWrite Display
**Prerequisites:** Transcript with TodoWrite tool call

**Steps:**
1. Locate TodoWrite tool call
2. Observe default state

**Expected Results:**
- TodoWrite is expanded by default (unlike other tools)
- Shows visual todo list (not raw JSON)
- Each todo item is displayed with checkbox
- Completed todos show checkmark
- Incomplete todos show empty checkbox
- Todo text is formatted nicely
- Preview shows: "TodoWrite: X todos"

### 7. Message Rendering - Code Blocks

**Seed:** `e2e/seed-transcript.spec.ts`

#### 7.1 Display Code Block with Syntax Highlighting
**Prerequisites:** Transcript with code content

**Steps:**
1. Find message with code block (Python code)
2. Observe syntax highlighting

**Expected Results:**
- Code is displayed in monospace font
- Language is detected (Python in this case)
- Keywords are highlighted (def, print, if, etc.)
- Strings are highlighted
- Comments are highlighted
- Proper color scheme for light/dark mode
- Line numbers are shown (for non-text language)

#### 7.2 Code Block - Copy Functionality
**Prerequisites:** Code block visible

**Steps:**
1. Hover over code block
2. Locate copy button (usually top-right)
3. Click copy button

**Expected Results:**
- Copy button is visible (icon showing copy/clipboard)
- Clicking copies code to clipboard
- Button shows feedback: changes to checkmark or "Copied"
- Feedback reverts after ~2 seconds
- Copied code matches displayed code exactly
- Preserves formatting and whitespace

#### 7.3 Code Block - Long Code Scrolling
**Prerequisites:** Code block with many lines (>20 lines)

**Steps:**
1. Find long code block
2. Attempt to scroll within code block

**Expected Results:**
- Code block has max height with scroll
- Vertical scrollbar appears
- Can scroll to see all code
- Line numbers remain aligned while scrolling
- Horizontal scroll if lines are very long
- Copy button remains accessible while scrolling

#### 7.4 Code Block - Various Languages
**Prerequisites:** Transcript with multiple language code blocks

**Steps:**
1. View Python code block
2. View JavaScript code block
3. View JSON code block
4. View text/plain code block

**Expected Results:**
- Each language has appropriate syntax highlighting
- Language-specific keywords are highlighted correctly
- JSON has structured formatting
- Plain text has no syntax highlighting but is formatted
- Line numbers shown for code (hidden for plain text)

### 8. Message Rendering - Bash Output

**Seed:** `e2e/seed-transcript.spec.ts`

#### 8.1 Display Bash Input and Output Together
**Prerequisites:** Transcript with bash-input and bash-stdout blocks

**Steps:**
1. Find bash command with output
2. Check rendering

**Expected Results:**
- Bash input shown in distinct section (command section)
- Command has monospace font
- Output shown in separate section below
- Output labeled as "stdout" or result
- Clear visual distinction between input and output
- Both in same collapsible block

#### 8.2 Display Bash Error Output (stderr)
**Prerequisites:** Transcript with bash-stderr block

**Steps:**
1. Find bash command that produced stderr
2. Check stderr rendering

**Expected Results:**
- stderr is displayed separately from stdout
- stderr has distinct styling (possibly red tint)
- Labeled as stderr or error
- Error messages are readable
- Preserves formatting and whitespace

#### 8.3 Display Standalone Bash Output
**Prerequisites:** Tool result with only stdout (no input in same message)

**Steps:**
1. Find bash output without corresponding input in message

**Expected Results:**
- Output is displayed in appropriate section
- Grouped with parent tool call if applicable
- Formatting is preserved
- Still readable and clear despite missing input

### 9. Interactive Features - Share Functionality

**Seed:** `e2e/seed-transcript.spec.ts`

#### 9.1 Share Button Visibility
**Prerequisites:** Any transcript loaded

**Steps:**
1. Navigate to transcript
2. Locate share button in header area

**Expected Results:**
- Share button is visible
- Button shows Share2 icon (share/export icon)
- Button text shows "Share" on desktop (hidden on mobile)
- Button has default variant styling
- Button is always visible (not owner-only)

#### 9.2 Share - Copy URL to Clipboard
**Prerequisites:** Transcript page loaded

**Steps:**
1. Click Share button
2. Observe button feedback

**Expected Results:**
- URL is copied to clipboard
- Copied URL matches current page URL (full URL with token)
- Button changes appearance to indicate success
- Shows green background (bg-green-600)
- Icon changes to checkmark (Check icon)
- Text changes to "Copied!"
- Feedback lasts ~2 seconds then reverts

#### 9.3 Share - Verify Copied URL Works
**Prerequisites:** URL copied via share button

**Steps:**
1. Share and copy URL
2. Open copied URL in new incognito/private window
3. Verify page loads

**Expected Results:**
- Copied URL is complete and valid
- Opening URL in new window loads same transcript
- URL format: `https://aisessions.dev/t/[token]`
- Token in URL is correct
- Page is accessible without authentication

### 10. Owner Actions - Delete Transcript

**Seed:** `e2e/seed-transcript.spec.ts`

#### 10.1 Delete Button Visibility for Owner
**Prerequisites:** Authenticated as transcript owner

**Steps:**
1. Sign in as owner
2. Navigate to owned transcript
3. Locate delete button in header

**Expected Results:**
- Delete button is visible in header actions
- Button shows Trash2 icon (trash/delete icon)
- Button has destructive variant (red styling)
- Button text shows "Delete" on desktop (hidden on mobile)
- Button is positioned after Share button

#### 10.2 Delete Button Hidden for Non-Owner
**Prerequisites:** Not authenticated or authenticated as different user

**Steps:**
1. View transcript as non-owner
2. Check for delete button

**Expected Results:**
- Delete button is not visible
- Only Share button appears in actions
- No delete functionality is exposed
- Layout adjusts for missing button

#### 10.3 Delete Transcript - Confirmation Dialog
**Prerequisites:** Authenticated as owner

**Steps:**
1. Click Delete button
2. Observe confirmation prompt

**Expected Results:**
- Browser confirmation dialog appears
- Dialog message: "Are you sure you want to delete this transcript? This action cannot be undone."
- Dialog has "OK" and "Cancel" buttons
- Transcript is not deleted yet (waiting for confirmation)
- Page remains on transcript while dialog is open

#### 10.4 Delete Transcript - Cancel Deletion
**Prerequisites:** Delete dialog displayed

**Steps:**
1. Click "Cancel" on confirmation dialog
2. Observe result

**Expected Results:**
- Dialog closes
- Transcript remains on page (not deleted)
- No API request is sent
- Page state is unchanged
- Can continue viewing transcript normally

#### 10.5 Delete Transcript - Confirm Deletion
**Prerequisites:** Delete dialog displayed

**Steps:**
1. Click "OK" on confirmation dialog
2. Wait for deletion to complete

**Expected Results:**
- Button shows "Deleting..." during process
- DELETE request sent to `/api/transcripts/[token]` with CSRF token
- After successful deletion, redirects to homepage (/)
- Transcript is removed from database
- Accessing old URL shows 404 after deletion
- Redirect happens automatically (no manual navigation needed)

#### 10.6 Delete Transcript - API Error Handling
**Prerequisites:** Simulated API error during deletion

**Steps:**
1. Attempt to delete with mocked API failure
2. Observe error handling

**Expected Results:**
- "Deleting..." indicator appears
- After error, alert shows "Failed to delete transcript"
- Button state returns to normal "Delete"
- Transcript remains on page
- User can retry deletion
- No partial deletion or corrupted state

### 11. Table of Contents (TOC)

**Seed:** `e2e/seed-transcript.spec.ts`

#### 11.1 TOC Visibility on Desktop
**Prerequisites:** Transcript with multiple user messages, desktop viewport (≥1024px)

**Steps:**
1. View transcript on desktop browser
2. Look for TOC sidebar on right side

**Expected Results:**
- TOC is visible as fixed sidebar on right
- Sidebar is sticky (position: sticky)
- Width is ~16rem (w-64)
- TOC stays in view when scrolling
- Positioned at top of viewport (top-14)
- Sidebar has max height of viewport minus header

#### 11.2 TOC Hidden on Mobile/Tablet
**Prerequisites:** Transcript viewed on mobile (< 1024px)

**Steps:**
1. Resize viewport to mobile size
2. Check for TOC

**Expected Results:**
- TOC sidebar is hidden on mobile
- No TOC component visible
- More space for main content
- Layout adapts to single-column

#### 11.3 TOC Content - User Messages Only
**Prerequisites:** Transcript with mix of user, assistant, tool results

**Steps:**
1. View TOC on desktop
2. Check which messages appear in TOC

**Expected Results:**
- Only real user messages appear in TOC
- Tool result messages excluded
- Bash output messages excluded
- System messages excluded (brackets messages)
- IDE notification messages excluded
- Each TOC item corresponds to a user message
- TOC items are in correct order

#### 11.4 TOC Items - Text Preview
**Prerequisites:** TOC visible with items

**Steps:**
1. Check text of each TOC item
2. Verify preview accuracy

**Expected Results:**
- Each item shows ~100 char preview of message
- XML tags stripped from preview (e.g., `<environment_context>`)
- Preview ends with "..." if truncated
- Fallback text "User message" if no text content
- Preview is readable and meaningful
- No HTML/markdown artifacts in preview

#### 11.5 TOC Navigation - Click Item
**Prerequisites:** TOC visible with items

**Steps:**
1. Click on TOC item
2. Observe page scroll

**Expected Results:**
- Page scrolls to corresponding message
- Message is highlighted or focused
- Scroll position accounts for fixed header (scroll-mt-24)
- Smooth scrolling animation
- Message is visible in viewport after scroll
- TOC item visual state may change (active state)

#### 11.6 TOC Scroll Behavior
**Prerequisites:** Many messages requiring scroll

**Steps:**
1. Scroll page to view different messages
2. Observe TOC behavior

**Expected Results:**
- TOC remains fixed in position
- TOC has internal scroll if many items
- TOC items remain accessible while scrolling
- Active message may be highlighted in TOC
- Scroll synchronization works properly

### 12. Responsive Design

**Seed:** `e2e/seed-transcript.spec.ts`

#### 12.1 Mobile Layout (< 640px)
**Prerequisites:** Transcript page on mobile viewport

**Steps:**
1. Resize viewport to mobile (375px width)
2. Check all page elements

**Expected Results:**
- Title text is smaller (text-xl instead of text-2xl)
- Metadata items may wrap to multiple lines
- Share/Delete button text hidden, only icons shown
- User avatar still visible
- Messages are full width
- Code blocks are scrollable horizontally if needed
- All content readable without horizontal page scroll
- Touch targets are appropriately sized
- Spacing is optimized for mobile

#### 12.2 Tablet Layout (640px - 1024px)
**Prerequisites:** Transcript page on tablet viewport

**Steps:**
1. Resize viewport to tablet (768px width)
2. Check layout

**Expected Results:**
- Title is full size (text-2xl)
- Metadata shows bullet points between items
- Button text visible on Share/Delete buttons
- TOC still hidden (< 1024px)
- Two-column layout not yet active
- Messages have appropriate width
- Comfortable reading experience

#### 12.3 Desktop Layout (≥ 1024px)
**Prerequisites:** Transcript page on desktop viewport

**Steps:**
1. Resize viewport to desktop (1280px width)
2. Check full desktop layout

**Expected Results:**
- Two-column layout active (main content + TOC)
- TOC visible as sticky sidebar
- Main content constrained to max-w-4xl
- Proper spacing between columns
- All features visible and accessible
- Optimal reading width maintained
- Header shows all text labels on buttons

#### 12.4 Ultra-Wide Display (≥ 1536px)
**Prerequisites:** Transcript on ultra-wide monitor

**Steps:**
1. View on very wide viewport (1920px+)
2. Check content positioning

**Expected Results:**
- Content doesn't stretch too wide
- Container maintains max-width constraints
- Reading experience remains optimal
- TOC positioned appropriately
- No excessive whitespace issues
- Content is centered and balanced

#### 12.5 Title Wrapping on Narrow Screens
**Prerequisites:** Transcript with very long title

**Steps:**
1. View transcript with 80+ character title on mobile
2. Check title rendering

**Expected Results:**
- Title wraps to multiple lines (break-words)
- All text visible without horizontal scroll
- No overflow or cut-off text
- Proper line height for readability
- Edit icon positioning adjusts for wrapped text
- Maintains visual hierarchy

### 13. System Messages and Special Content

**Seed:** `e2e/seed-transcript.spec.ts`

#### 13.1 Hide IDE Notification Messages
**Prerequisites:** Transcript with `<ide_opened_file>` or similar tags

**Steps:**
1. Check for IDE notification messages in transcript

**Expected Results:**
- Messages starting with IDE XML tags are hidden
- Tags include: ide_opened_file, ide_selection, ide_diagnostics
- No visual rendering of these messages
- Message count may differ from raw JSONL count
- Timeline remains coherent without these messages

#### 13.2 Hide System Hook Messages
**Prerequisites:** Transcript with system hooks

**Steps:**
1. Check for system hook messages

**Expected Results:**
- post-tool-use-hook messages hidden
- system-reminder messages hidden
- user-prompt-submit-hook messages hidden
- local-command-stdout messages hidden
- environment_context messages hidden
- These don't disrupt user experience

#### 13.3 Display Bracket System Messages
**Prerequisites:** Transcript with "[Request interrupted by user]" type messages

**Steps:**
1. Locate bracket message in transcript
2. Check rendering

**Expected Results:**
- Message displayed with special styling
- Yellow background (bg-yellow-50 in light, bg-yellow-950/30 in dark)
- Yellow border
- Centered on page
- Italic text style
- Warning icon displayed (triangle with exclamation)
- Timestamp shown if available
- Format: [icon] [message text] [timestamp]
- Stands out from regular messages

#### 13.4 Hide Caveat Messages
**Prerequisites:** Transcript with "Caveat:" prefixed messages

**Steps:**
1. Check for caveat messages

**Expected Results:**
- Messages starting with "Caveat:" are hidden
- Don't clutter transcript view
- User experience remains clean

### 14. Dark Mode Support

**Seed:** `e2e/seed-transcript.spec.ts`

#### 14.1 Dark Mode - Overall Page Styling
**Prerequisites:** System/browser set to dark mode

**Steps:**
1. Enable dark mode in browser/system
2. Navigate to transcript
3. Check overall color scheme

**Expected Results:**
- Background is dark (bg-background uses dark value)
- Text is light colored for readability
- Contrast is maintained for accessibility
- All text is readable against backgrounds
- No pure white backgrounds (#000 or very dark)

#### 14.2 Dark Mode - Message Containers
**Prerequisites:** Dark mode enabled

**Steps:**
1. Check user message styling
2. Check assistant message styling

**Expected Results:**
- User messages have dark accent background
- Assistant messages have appropriate dark background
- Text color (foreground) contrasts well
- Border colors are subtle but visible
- Timestamps are readable

#### 14.3 Dark Mode - Code Blocks
**Prerequisites:** Dark mode enabled, viewing code blocks

**Steps:**
1. View code blocks in dark mode
2. Check syntax highlighting

**Expected Results:**
- Code background is dark
- Syntax highlighting colors work in dark mode
- Keywords, strings, comments are distinguishable
- Line numbers are visible
- Copy button is visible and contrasts well
- Colors are not too bright or harsh

#### 14.4 Dark Mode - Tool Calls
**Prerequisites:** Dark mode enabled, viewing tool calls

**Steps:**
1. Check collapsed tool call styling
2. Expand and check input/result sections

**Expected Results:**
- Tool call border visible in dark mode
- Header background appropriate for dark theme
- JSON syntax highlighting works in dark mode
- Result sections have readable dark backgrounds
- Error states have appropriate red tints for dark mode

#### 14.5 Dark Mode - Interactive Elements
**Prerequisites:** Dark mode enabled

**Steps:**
1. Check Share button
2. Check Delete button
3. Check hover states

**Expected Results:**
- Buttons have dark mode styling
- Hover effects work and are visible
- Focus states are clear
- Destructive button (delete) has appropriate red
- Icons are visible against button backgrounds
- All interactive elements are discoverable

### 15. Accessibility

**Seed:** `e2e/seed-transcript.spec.ts`

#### 15.1 Semantic HTML Structure
**Prerequisites:** Transcript page loaded

**Steps:**
1. Inspect DOM structure
2. Check for semantic elements

**Expected Results:**
- Page uses proper heading hierarchy (h1, h2, h3, etc.)
- Main content in `<main>` or semantic container
- Header in `<header>` or banner role
- Aside for TOC
- Messages have appropriate structure
- No unnecessary divs where semantic elements should be used

#### 15.2 Keyboard Navigation - Focus Visible
**Prerequisites:** Transcript page loaded

**Steps:**
1. Tab through interactive elements
2. Check focus visibility

**Expected Results:**
- All interactive elements are reachable by Tab
- Focus indicator is clearly visible
- Focus order is logical (top to bottom, left to right)
- No focus traps
- Can Tab through: Share button, Delete button (if owner), tool call headers, thinking block triggers, code copy buttons, TOC links
- Focus indicators meet WCAG contrast requirements

#### 15.3 Keyboard Navigation - Tool Calls and Thinking
**Prerequisites:** Transcript with collapsible elements

**Steps:**
1. Tab to tool call header
2. Press Enter or Space to expand
3. Repeat for thinking blocks

**Expected Results:**
- Tool call headers are keyboard accessible
- Enter or Space key toggles expand/collapse
- Focus remains on header after toggle
- Can navigate into expanded content
- Can collapse and move to next element
- All without mouse

#### 15.4 Keyboard Navigation - TOC Links
**Prerequisites:** Desktop view with TOC visible

**Steps:**
1. Tab to TOC area
2. Navigate through TOC items
3. Press Enter on item

**Expected Results:**
- TOC items are keyboard accessible
- Can Tab through TOC items
- Enter key activates link/scroll
- Focus moves appropriately after scroll
- Can return to TOC via Tab or Shift+Tab

#### 15.5 Screen Reader - Heading Structure
**Prerequisites:** Screen reader enabled (NVDA, JAWS, or VoiceOver)

**Steps:**
1. Navigate transcript using headings (H key)
2. Listen to heading announcements

**Expected Results:**
- h1 announces transcript title
- Heading levels are logical and sequential
- Messages may have heading structure
- Sections are clearly delineated
- Screen reader can build document outline
- Users can navigate by headings efficiently

#### 15.6 Screen Reader - Interactive Elements
**Prerequisites:** Screen reader enabled

**Steps:**
1. Navigate to Share button
2. Navigate to Delete button (if owner)
3. Navigate to tool call headers

**Expected Results:**
- Buttons announced with role and label
- Share button: "Share, button" or "button, Share"
- Delete button: "Delete, button" with destructive indication
- Tool call headers announce as expandable
- Current state announced (expanded/collapsed)
- Clear instructions for interaction

#### 15.7 Screen Reader - Code Blocks
**Prerequisites:** Screen reader enabled

**Steps:**
1. Navigate to code block
2. Attempt to read code content

**Expected Results:**
- Code block announced as code region
- Language may be announced if properly marked up
- Code content is readable line by line
- Copy button is announced and accessible
- Line numbers don't interfere with reading (aria-hidden or similar)

#### 15.8 Alt Text and ARIA Labels
**Prerequisites:** Transcript page loaded

**Steps:**
1. Check avatar images for alt text
2. Check icon buttons for labels
3. Check ARIA attributes

**Expected Results:**
- GitHub avatar has alt text with username
- Share icon button has accessible label (aria-label or visible text)
- Delete icon button has accessible label
- Warning icon in system messages has appropriate alt/aria-label
- All icon-only elements have text alternatives
- ARIA attributes used where appropriate (aria-expanded for collapsibles)

#### 15.9 Color Contrast
**Prerequisites:** Transcript page in both light and dark mode

**Steps:**
1. Check color contrast ratios using browser tools or WAVE
2. Test all text against backgrounds

**Expected Results:**
- Normal text meets 4.5:1 contrast ratio (WCAG AA)
- Large text meets 3:1 contrast ratio
- Interactive element text meets 4.5:1
- Applies to both light and dark mode
- Timestamps (muted text) still readable
- Metadata text meets minimum contrast

#### 15.10 Focus Management - Modal Actions
**Prerequisites:** Authenticated as owner

**Steps:**
1. Click Delete button to trigger confirmation
2. Check focus behavior

**Expected Results:**
- Focus moves to confirmation dialog
- Can Tab through dialog buttons
- Can press Enter for OK, Escape for Cancel
- After dialog closes, focus returns to logical element
- Focus is not lost or moved to body

### 16. Performance and Loading States

**Seed:** `e2e/seed-transcript.spec.ts`

#### 16.1 Initial Page Load Performance
**Prerequisites:** Transcript page first load

**Steps:**
1. Clear browser cache
2. Navigate to transcript page
3. Measure load time

**Expected Results:**
- Page loads in reasonable time (< 3 seconds on good connection)
- Content appears progressively (streaming or chunked loading)
- No layout shift after initial render
- Core Web Vitals pass:
  - LCP < 2.5s
  - FID < 100ms
  - CLS < 0.1

#### 16.2 Large Transcript Performance
**Prerequisites:** Transcript with 100+ messages

**Steps:**
1. Navigate to large transcript
2. Scroll through entire transcript
3. Expand/collapse multiple tool calls

**Expected Results:**
- Page remains responsive during scroll
- No stuttering or frame drops
- Tool call expand/collapse is smooth
- Memory usage remains reasonable
- Browser doesn't freeze or warn
- Interactions remain snappy

#### 16.3 Syntax Highlighting Performance
**Prerequisites:** Transcript with large code blocks (1000+ lines)

**Steps:**
1. Navigate to transcript with large code
2. Observe rendering time
3. Scroll through code

**Expected Results:**
- Syntax highlighting doesn't block page load
- Large code blocks render in acceptable time (< 1 second)
- Scrolling remains smooth
- No performance degradation
- Copy functionality works quickly

#### 16.4 TOC Generation Performance
**Prerequisites:** Transcript with many user messages (50+)

**Steps:**
1. Load transcript on desktop
2. Check TOC generation time

**Expected Results:**
- TOC generates quickly (imperceptible delay)
- useMemo optimization prevents unnecessary recalculation
- TOC doesn't cause re-renders of messages
- Clicking TOC items navigates quickly
- No lag in scroll synchronization

### 17. Error Handling and Edge Cases

**Seed:** `e2e/seed-transcript.spec.ts`

#### 17.1 Empty Transcript (No Messages)
**Prerequisites:** Transcript with empty fileData or no valid messages

**Steps:**
1. Create transcript with empty JSONL
2. Navigate to transcript page

**Expected Results:**
- Page loads without crashing
- Title and metadata display
- Message area is empty or shows appropriate message
- No JavaScript errors in console
- Layout remains intact

#### 17.2 Malformed JSONL Data
**Prerequisites:** Transcript with partially invalid JSONL

**Steps:**
1. Create transcript with some invalid JSON lines
2. Navigate to page

**Expected Results:**
- Parser handles errors gracefully
- Valid messages are displayed
- Invalid lines are skipped or error is shown
- Page doesn't crash
- Error logged to console for debugging
- User sees whatever content can be parsed

#### 17.3 Missing Tool Results
**Prerequisites:** Transcript with tool_use but no matching tool_result

**Steps:**
1. Create transcript with orphaned tool_use blocks
2. Expand tool call

**Expected Results:**
- Tool call displays without result section
- Input parameters still visible
- No error or crash
- UI indicates no result available
- Tool call remains functional (expand/collapse)

#### 17.4 Extremely Long Title
**Prerequisites:** Transcript with 200+ character title

**Steps:**
1. View transcript with very long title
2. Check rendering

**Expected Results:**
- Title wraps properly (break-words)
- No horizontal overflow
- Edit functionality still works
- Doesn't break layout
- Pencil icon position adjusts appropriately
- Still readable on all screen sizes

#### 17.5 Special Characters in Content
**Prerequisites:** Transcript with special characters (emoji, Unicode, HTML entities)

**Steps:**
1. View transcript with emoji 🚀 💻 ✨
2. View content with <script>, &nbsp;, quotes

**Expected Results:**
- Emoji display correctly
- HTML entities are escaped (don't execute)
- Special characters don't break layout
- Unicode characters render properly
- No XSS vulnerabilities
- Content is safe and properly escaped

#### 17.6 Very Long Code Block
**Prerequisites:** Transcript with 5000+ line code block

**Steps:**
1. Navigate to transcript
2. Expand code block if collapsed
3. Attempt to scroll and copy

**Expected Results:**
- Code block has max height with scroll
- Scrolling is smooth
- Copy button works for entire code
- Syntax highlighting may be simplified for performance
- Line numbers display correctly (or are hidden if too many)
- Browser doesn't hang

#### 17.7 Network Error During Title Update
**Prerequisites:** Authenticated as owner, simulated network failure

**Steps:**
1. Start editing title
2. Disconnect network
3. Save title

**Expected Results:**
- Request fails gracefully
- User sees error alert
- Title doesn't update
- Can retry after reconnecting
- No corrupted state
- Edit mode remains available

#### 17.8 CSRF Token Missing
**Prerequisites:** Simulated missing CSRF token

**Steps:**
1. Remove CSRF token from cookies
2. Attempt to edit title or delete

**Expected Results:**
- Alert shows: "Security token not loaded. Please refresh the page and try again."
- Action is prevented
- No API request sent
- User instructed to refresh
- No security bypass

### 18. Security

**Seed:** `e2e/seed-transcript.spec.ts`

#### 18.1 Token-Based Access Control
**Prerequisites:** Valid and invalid tokens

**Steps:**
1. Access transcript with valid token
2. Access transcript with another user's token
3. Try to access with invalid token

**Expected Results:**
- Valid token shows transcript
- Different user's token shows their transcript (public access)
- Invalid token returns 404
- No token enumeration possible
- Tokens are sufficiently long and random

#### 18.2 Owner Action Authorization
**Prerequisites:** Two different users and transcripts

**Steps:**
1. User A views User B's transcript
2. User A attempts to edit title (via API if possible)
3. User A attempts to delete (via API if possible)

**Expected Results:**
- Edit button not visible to User A
- Delete button not visible to User A
- Direct API calls fail with 403 Forbidden
- Authorization checked on server
- Only owner can perform actions

#### 18.3 XSS Prevention - Content Rendering
**Prerequisites:** Transcript with XSS payloads

**Steps:**
1. Create transcript with content: `<script>alert('xss')</script>`
2. Create content with: `<img src=x onerror=alert('xss')>`
3. View transcript

**Expected Results:**
- Scripts don't execute
- Content is properly escaped
- React prevents XSS by default
- HTML entities are displayed as text
- No alerts or script execution
- Security is maintained

#### 18.4 XSS Prevention - Title Field
**Prerequisites:** Transcript with XSS in title

**Steps:**
1. Set title to: `My Transcript<script>alert('xss')</script>`
2. View page

**Expected Results:**
- Script tags shown as text
- No script execution
- Title is safely rendered
- Edit field also safe
- No DOM-based XSS

#### 18.5 CSRF Protection - State-Changing Operations
**Prerequisites:** Authenticated user

**Steps:**
1. Check edit title request includes CSRF token
2. Check delete request includes CSRF token
3. Attempt request without CSRF token (via developer tools)

**Expected Results:**
- All PATCH/DELETE requests include x-csrf-token header
- Requests without token are rejected (403)
- CSRF token validated server-side
- Protection prevents forged requests
- Token is in httpOnly cookie for reading

#### 18.6 Sensitive Data Exposure
**Prerequisites:** View page source and network requests

**Steps:**
1. View page HTML source
2. Check network responses
3. Look for sensitive data

**Expected Results:**
- No database IDs exposed unnecessarily
- No internal system paths exposed
- No user emails visible (only GitHub username)
- Error messages don't leak system information
- Secret token is only in URL (not in other fields)

### 19. OpenGraph and Social Media Sharing

**Seed:** `e2e/seed-transcript.spec.ts`

#### 19.1 OpenGraph Meta Tags Present
**Prerequisites:** Transcript page loaded

**Steps:**
1. View page HTML source
2. Check for OpenGraph meta tags

**Expected Results:**
- `<meta property="og:type" content="article">`
- `<meta property="og:url" content="/t/[token]">`
- `<meta property="og:title" content="[title] - AI Sessions">`
- `<meta property="og:description" content="...">`
- `<meta property="og:site_name" content="AI Sessions">`
- `<meta property="og:image" content="/t/[token]/opengraph-image">`
- Image dimensions specified (1200x630)

#### 19.2 Twitter Card Meta Tags Present
**Prerequisites:** Transcript page loaded

**Steps:**
1. View page source
2. Check for Twitter card tags

**Expected Results:**
- `<meta name="twitter:card" content="summary_large_image">`
- `<meta name="twitter:title" content="[title] - AI Sessions">`
- `<meta name="twitter:description" content="...">`
- `<meta name="twitter:image" content="/t/[token]/opengraph-image">`

#### 19.3 OpenGraph Description Content
**Prerequisites:** Transcript with known metadata

**Steps:**
1. Check og:description content

**Expected Results:**
- Format: "AI coding session by {username} • {count} messages • {date}"
- Username from GitHub
- Message count accurate
- Date formatted: "Month Day, Year"
- Description is informative and accurate

#### 19.4 OpenGraph Image Generation
**Prerequisites:** Transcript page

**Steps:**
1. Access `/t/[token]/opengraph-image` directly
2. Check image content

**Expected Results:**
- Image generates successfully (200 response)
- Image is 1200x630 PNG
- Shows transcript title (truncated if long)
- Shows creator username
- Shows message count and date
- AI Sessions branding visible
- Image looks professional

#### 19.5 Social Media Preview Testing
**Prerequisites:** Shareable transcript URL

**Steps:**
1. Test URL in OpenGraph preview tool (opengraph.xyz)
2. Test in Twitter card validator (if available)
3. Share in Discord/Slack to see preview

**Expected Results:**
- Preview card displays correctly
- Image loads and displays
- Title and description are readable
- Link preview is attractive and informative
- Encourages clicks/shares

#### 19.6 Fallback for Missing Data
**Prerequisites:** Transcript with missing user info or anonymous creator

**Steps:**
1. Create transcript without GitHub username
2. Check OpenGraph tags

**Expected Results:**
- Username shows "Anonymous" in description
- Image generation still works
- No broken image or missing data
- Graceful degradation
- All tags still present and valid

---

## Test Execution Notes

### Prerequisites for Running Tests

1. **Database Setup**:
   - PostgreSQL test database configured
   - `DATABASE_URL` environment variable set
   - Prisma migrations applied

2. **Server Running**:
   - Next.js dev server running on `http://localhost:3000`
   - Or use Playwright's webServer configuration

3. **Test Data**:
   - Use `e2e/seed-transcript.spec.ts` to create test transcript
   - Or create transcript via API/database before tests

4. **Authentication**:
   - Use `e2e/fixtures/auth.ts` for authenticated scenarios
   - Owner-specific tests require authenticated session

### Test Organization

- **Section 1-2**: Basic page functionality (can run unauthenticated)
- **Section 3**: Title editing (requires authentication)
- **Section 4-8**: Content rendering (unauthenticated)
- **Section 9**: Share functionality (unauthenticated)
- **Section 10**: Delete functionality (requires authentication)
- **Section 11-12**: Layout and responsive (unauthenticated)
- **Section 13-14**: Content types and dark mode (unauthenticated)
- **Section 15**: Accessibility (unauthenticated, may need assistive tools)
- **Section 16-18**: Performance, errors, security (mixed)
- **Section 19**: OpenGraph meta tags (unauthenticated)

### Recommended Test Execution Order

1. Create test transcript using seed script
2. Run unauthenticated tests (sections 1, 2, 4-8, 9, 11-15, 17, 19)
3. Run authenticated tests (sections 3, 10)
4. Run performance tests separately (section 16)
5. Run security tests with specific payloads (section 18)

### CI/CD Considerations

- Tests should be independent and isolated
- Each test should clean up its data
- Use transaction rollback or database cleanup
- Tests should be idempotent
- Parallel execution requires separate test data
- Screenshot/video capture recommended for failures

---

## Success Criteria

A transcript page is considered fully functional when:

1. ✅ All valid transcripts load without errors
2. ✅ Invalid tokens return appropriate 404
3. ✅ All content types render correctly (text, thinking, tool calls, code, bash)
4. ✅ Interactive elements work (expand/collapse, edit, delete, share)
5. ✅ Owner actions are properly authorized
6. ✅ Responsive design works on all viewport sizes
7. ✅ Accessibility requirements are met (WCAG AA)
8. ✅ Dark mode fully supported
9. ✅ Performance is acceptable for large transcripts
10. ✅ Security measures prevent XSS, CSRF, and unauthorized access
11. ✅ Error cases are handled gracefully
12. ✅ Social media sharing works with proper metadata

---

## Known Limitations and Future Improvements

- **Virtual Scrolling**: Very large transcripts (1000+ messages) could benefit from virtual scrolling
- **Search**: No in-page search for transcript content
- **Export**: No export to PDF or other formats
- **Comments**: No commenting or annotation features
- **Versioning**: No version history for title edits
- **Analytics**: No view count or analytics
- **Syntax Highlighting**: Limited language support, could be expanded
- **Mobile TOC**: No TOC on mobile, could add collapsible drawer
- **Keyboard Shortcuts**: Limited keyboard shortcuts available

---

## Appendix: Sample JSONL Structures

### Basic Text Message
```json
{"role":"user","content":[{"type":"text","text":"Hello, world"}]}
```

### Message with Thinking
```json
{"role":"assistant","content":[{"type":"thinking","thinking":"User wants a greeting"},{"type":"text","text":"Hello!"}]}
```

### Tool Use and Result
```json
{"role":"assistant","content":[{"type":"tool_use","id":"toolu_123","name":"Read","input":{"file_path":"/tmp/file.txt"}}]}
{"role":"user","content":[{"type":"tool_result","tool_use_id":"toolu_123","content":"file content here"}]}
```

### Bash Command
```json
{"role":"assistant","content":[{"type":"tool_use","id":"toolu_456","name":"Bash","input":{"command":"ls -la"}}]}
{"role":"user","content":[{"type":"tool_result","tool_use_id":"toolu_456","content":"total 64\ndrwxr-xr-x..."}]}
```

### System Message (Hidden)
```json
{"role":"user","content":"<ide_opened_file>file.txt</ide_opened_file>"}
```

### Bracket System Message (Shown)
```json
{"role":"user","content":"[Request interrupted by user]"}
```
