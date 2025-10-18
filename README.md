# AI Sessions

A web platform for sharing and viewing AI coding session transcripts with beautiful syntax highlighting, collapsible tool calls, and seamless navigation for long conversations.

**Supports:** Claude Code, Codex, and more coming soon!

## Features

- 🔐 **Secure Sharing** - Generate secret URLs for your transcripts
- ⚡ **Fast & Responsive** - Handles conversations with 1000+ messages smoothly
- ✨ **Beautiful UI** - Syntax highlighting, collapsible diffs, and organized tool calls
- 🔑 **GitHub OAuth** - Secure authentication for uploading transcripts
- 📦 **Serverless Ready** - Designed to run on Vercel with Vercel Postgres

## Tech Stack

- **Next.js 15** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **NextAuth.js v5** for GitHub OAuth
- **Prisma** ORM with PostgreSQL
- **react-dropzone** for file upload
- **react-syntax-highlighter** for code highlighting

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database (or use Vercel Postgres)
- GitHub OAuth App

### 1. Clone and Install

```bash
git clone git@github.com:yoavf/ai-sessions.git
cd ai-sessions
npm install
```

### 2. Set Up Database

Create a PostgreSQL database and get the connection string.

For local development with Docker:
```bash
docker run --name ai-sessions-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=ai_sessions -p 5432:5432 -d postgres
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Update the values:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/ai_sessions?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"  # Generate with: openssl rand -base64 32

# GitHub OAuth
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
```

### 4. Set Up GitHub OAuth App

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in:
   - Application name: `AI Sessions (Dev)`
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
4. Copy the Client ID and generate a Client Secret
5. Add them to your `.env` file

### 5. Initialize Database

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment to Vercel

### 1. Set Up Vercel Postgres

1. Create a new project on Vercel
2. Go to Storage → Create Database → Postgres
3. Copy the connection string

### 2. Set Up GitHub OAuth for Production

1. Create another GitHub OAuth App for production
2. Use your Vercel domain:
   - Homepage URL: `https://your-app.vercel.app`
   - Callback URL: `https://your-app.vercel.app/api/auth/callback/github`

### 3. Configure Environment Variables

In Vercel project settings, add:

```
DATABASE_URL=<from-vercel-postgres>
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=<generate-new-secret>
GITHUB_CLIENT_ID=<production-oauth-app-id>
GITHUB_CLIENT_SECRET=<production-oauth-app-secret>
```

### 4. Deploy

```bash
git push
```

Vercel will automatically deploy your app.

### 5. Run Migrations

After first deployment, run migrations:

```bash
npx prisma migrate deploy
```

Or use Vercel's console to run the command.

## Usage

### Finding Your Transcripts

**Claude Code** saves session transcripts at:
```
~/.claude/projects/<project-name>/<session-id>.jsonl
```

**Codex** saves session transcripts at:
```
~/.codex/sessions/<year>/<month>/<day>/<session-id>.jsonl
```

Each directory contains JSONL files with the complete conversation history.

### Uploading a Transcript

1. Sign in with GitHub
2. Click "Upload Transcript"
3. Drag and drop your JSONL file
4. Get a shareable secret URL
5. Share the URL with anyone (no login required to view)

### Viewing a Transcript

Open the secret URL to view:
- Full conversation history
- Collapsible tool calls and results
- Syntax-highlighted code blocks
- Thinking blocks (expandable)
- Timestamps and metadata

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/  # NextAuth endpoints
│   │   └── transcripts/         # Upload & fetch API
│   ├── auth/signin/             # Sign in page
│   ├── t/[token]/               # Transcript viewer
│   ├── upload/                  # Upload page
│   └── page.tsx                 # Home page
├── components/
│   ├── CodeBlock.tsx            # Syntax highlighting
│   ├── MessageRenderer.tsx      # Message display
│   ├── ToolCallBlock.tsx        # Tool call display
│   ├── TranscriptViewer.tsx     # Main viewer
│   └── UploadDropzone.tsx       # File upload
├── lib/
│   ├── auth.ts                  # NextAuth config
│   ├── parser.ts                # JSONL parser
│   └── prisma.ts                # Prisma client
├── types/
│   └── transcript.ts            # Type definitions
└── middleware.ts                # Auth middleware
```

## License

MIT