# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Sessions (ai-sessions.dev) is a Next.js web application for sharing and viewing AI coding session transcripts from Claude Code, Codex, and Gemini CLI. Users authenticate via GitHub OAuth, upload JSON or JSONL transcript files, and receive shareable secret URLs. Transcripts are viewable without authentication using the secret token.

## Common Commands

### Development
```bash
npm run dev              # Start dev server with Turbopack (http://localhost:3000)
npm run build            # Build for production with Turbopack
npm start                # Start production server
```

### Code Quality
```bash
npm run lint             # Check code with Biome
npm run format           # Format code with Biome
```

### Database
```bash
npx prisma generate      # Generate Prisma client
npx prisma migrate dev   # Create and apply new migration
npx prisma migrate deploy # Apply migrations in production
npx prisma studio        # Open Prisma Studio GUI
```

### Running a Single Test
This project does not currently have a test suite configured.

## Architecture

### Tech Stack
- **Framework**: Next.js 15 with App Router and Turbopack
- **Auth**: NextAuth.js v5 with GitHub OAuth provider
- **Database**: PostgreSQL via Prisma ORM with PrismaAdapter
- **Security**: CSRF protection, rate limiting (Upstash Redis), security headers
- **Styling**: Tailwind CSS v4
- **Linting**: Biome (not ESLint)
- **UI Libraries**: react-dropzone, react-syntax-highlighter, react-window

### Data Flow

1. **Upload Flow**:
   - User visits homepage and sees upload dropzone
   - If not authenticated, dropzone shows sign-in overlay
   - User authenticates via GitHub OAuth (`src/lib/auth.ts`)
   - Uploads JSON or JSONL file via `UploadDropzoneWithAuth` component on homepage
   - API route validates and parses JSON/JSONL (`src/lib/parser.ts`)
   - **Google Cloud DLP attempts to detect sensitive data** (`src/lib/dlp.ts`):
     - Attempts to detect API keys, passwords, tokens, PII, credit cards, SSNs, etc.
     - Blocks upload if sensitive data found with detailed error message
     - Gracefully skips if DLP not configured (optional feature)
   - Creates database record with nanoid-generated secret token
   - Returns secret URL to user

2. **View Flow**:
   - Public access via `/t/[token]` route
   - Fetches transcript from database using secret token
   - Parses JSONL into `ParsedTranscript` structure
   - Renders using `TranscriptViewer` → `MessageRenderer` → `ToolCallBlock`/`CodeBlock` components

### Key Architectural Patterns

**Authentication**:
- NextAuth.js v5 with PrismaAdapter for database sessions
- GitHub OAuth as sole provider
- Upload functionality on homepage with auth overlay for unauthenticated users
- Session callback adds user.id to session object

**Database Schema** (prisma/schema.prisma):
- Standard NextAuth models: User, Account, Session, VerificationToken
- Custom `Transcript` model with foreign key to User
- Secret token for URL-based access (indexed for performance)
- fileData stored as TEXT column containing raw JSONL

**JSONL Parsing** (src/lib/parser.ts):
- Parses line-by-line, skipping "file-history-snapshot" entries
- Extracts metadata (sessionId, timestamps, cwd, message count)
- Returns `ParsedTranscript` structure with messages array and metadata

**Type System** (src/types/transcript.ts):
- `TranscriptLine`: Individual JSONL line representation
- `Message`: Contains role and content (string or ContentBlock[])
- `ContentBlock`: Union type for text, thinking, tool_use, tool_result
- `ParsedTranscript`: Parsed output with messages and metadata

**Component Hierarchy**:
```
TranscriptViewer (layout, header, user info)
  └─ MessageRenderer (handles content blocks)
      ├─ ToolCallBlock (collapsible tool calls with JSON params)
      └─ CodeBlock (syntax highlighting via react-syntax-highlighter)
```

### Environment Variables
Required for local development (see .env.example):
- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_URL`: Application URL (http://localhost:3000 locally)
- `NEXTAUTH_SECRET`: Random secret for session encryption
- `GITHUB_CLIENT_ID`: GitHub OAuth App client ID
- `GITHUB_CLIENT_SECRET`: GitHub OAuth App client secret

Optional (for sensitive data detection):
- `GOOGLE_CLOUD_PROJECT`: Google Cloud project ID for DLP API
- `GOOGLE_APPLICATION_CREDENTIALS`: Path to service account key JSON file (for local development)
- `GOOGLE_APPLICATION_CREDENTIALS_JSON`: Full JSON content of service account key (for Vercel/production)

Optional (for rate limiting - recommended for production):
- `UPSTASH_REDIS_REST_URL`: Upstash Redis REST API URL
- `UPSTASH_REDIS_REST_TOKEN`: Upstash Redis REST API token

## OpenGraph & Social Media

The app implements comprehensive OpenGraph and Twitter Card metadata for rich social media previews:

**Homepage** (src/app/layout.tsx + src/app/opengraph-image.tsx):
- Static OpenGraph metadata with site branding
- Generated OG image (1200x630) with "AI Sessions" branding
- Twitter Card support (summary_large_image)
- Uses `NEXTAUTH_URL` for absolute URLs (defaults to https://aisessions.dev)

**Individual Transcripts** (/t/[token]):
- Dynamic metadata generated via `generateMetadata()` function
- OG title includes transcript title + site name
- OG description includes username, message count, and date
- Dynamic OG images generated with @vercel/og showing:
  - Transcript title (truncated if long)
  - Creator's GitHub username
  - Message count and creation date
  - AI Sessions branding

**Implementation**:
- Uses Next.js 15 metadata API with `metadataBase`
- Dynamic OG images use Node.js runtime (not edge) due to Prisma requirements
- All OG images are 1200x630 (standard social media size)
- Gracefully handles errors with fallback messages

**Testing**:
- Preview OG tags: https://www.opengraph.xyz/ or https://cards-dev.twitter.com/validator
- Local testing: View page source and look for `<meta property="og:*">` tags

## Development Notes

- Always use `npm run format` before committing (Biome formatting)
- Database migrations must be created with `npx prisma migrate dev`
- Secret tokens use nanoid(16) for URL safety and uniqueness
- Transcript viewer is client-side rendered ("use client") for interactive elements
- Thinking blocks and tool calls are collapsible for better UX
- File data stored as plain TEXT in database (consider compression for large files)

### Sensitive Data Detection (Google Cloud DLP)

The app uses Google Cloud DLP API to attempt to detect and remove sensitive information in uploads:
- Attempts to detect: API keys, passwords, tokens, PII, credit cards, SSNs, phone numbers, emails, etc.
- **Blocks or scrubs uploads** containing sensitive data with user-friendly error message
- Pricing: First 50k units/month FREE, then $1/1k units (very affordable for typical usage)
- **Optional feature**: If `GOOGLE_CLOUD_PROJECT` not set, uploads proceed without scanning
- Implementation: `src/lib/dlp.ts` contains scan logic, called from POST `/api/transcripts`

**Deployment Setup**:
- **Local**: Set `GOOGLE_APPLICATION_CREDENTIALS` to the file path of your service account key
- **Vercel**: Set `GOOGLE_APPLICATION_CREDENTIALS_JSON` to the full JSON content (not file path)
- The DLP client automatically detects which method to use

## Security Features

### Rate Limiting (`src/lib/rate-limit.ts`)

Rate limiting protects the app from abuse and controls API costs:

**Limits**:
- **Uploads**: 10 per hour per user (protects expensive DLP scans)
- **Public Views**: 100 per 5 minutes per IP (prevents enumeration attacks)
- **Account Operations**: 5 per hour per user (delete account, etc.)

**Implementation**:
- Uses Upstash Redis for distributed rate limiting (serverless-friendly)
- Gracefully degrades if Redis not configured (allows requests)
- Returns 429 status with `X-RateLimit-*` headers when limit exceeded

**Setup** (Optional but recommended for production):
1. Create free Upstash Redis database at https://console.upstash.com
2. Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to `.env`
3. Deploy - rate limiting will automatically activate

### CSRF Protection (`src/lib/csrf.ts`)

Protects against Cross-Site Request Forgery attacks on state-changing operations:

**Implementation**:
- CSRF tokens generated server-side and stored in `httpOnly` cookies
- Client reads token from cookie and sends in `x-csrf-token` header
- All POST/PATCH/DELETE requests validate token match
- Returns 403 if token missing or invalid

**Usage**:
- Client components use `useCsrfToken()` hook to get token
- Helper function `addCsrfToken(token, fetchOptions)` adds header
- Server routes use `checkCsrf(request)` to validate

### Security Headers (`next.config.ts`)

Comprehensive security headers configured for all routes:

- **Strict-Transport-Security**: Forces HTTPS connections
- **X-Frame-Options**: Prevents clickjacking attacks
- **X-Content-Type-Options**: Prevents MIME-sniffing attacks
- **Content-Security-Policy**: Restricts resource loading
- **Referrer-Policy**: Controls referrer information
- **Permissions-Policy**: Disables unnecessary browser features

### Additional Security

- **SQL Injection**: Prevented via Prisma ORM (no raw SQL)
- **XSS**: Prevented via React auto-escaping and CSP headers
- **Authentication**: Secure session-based auth via NextAuth.js
- **Authorization**: Ownership checks on all sensitive operations
- **Secret Tokens**: Cryptographically secure via `nanoid(16)`
- use shadcn ui components whenever building interfaces
- always make migrations when making db changes!
- never commit with --no-verify - it will just fail on ci
- Refer to real world examples of transcripts in /examples - do not make assumptions on session file structures
- Use conventional commits conventions
- Never use emoji for design - use lucide icons if icons are needed