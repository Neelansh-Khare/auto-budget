# AutoBudgeter

Automatically sync bank transactions from Chase (via Plaid), categorize spending using rules and/or LLM, and view your budget in a native UI or push to Google Sheets.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Detailed Setup Guide](#detailed-setup-guide)
  - [1. Clone and Install](#1-clone-and-install)
  - [2. Database Setup](#2-database-setup)
  - [3. Environment Variables](#3-environment-variables)
  - [4. Get API Keys](#4-get-api-keys)
  - [5. Run the Application](#5-run-the-application)
  - [6. Initial Configuration](#6-initial-configuration)
- [Usage Guide](#usage-guide)
- [Troubleshooting](#troubleshooting)
- [Architecture](#architecture)

## Prerequisites

Before you begin, ensure you have:

- **Node.js** 18.19.0 or higher (20.9.0+ recommended)
- **npm** 10.2.3 or higher
- **Docker** and **Docker Compose** (for local Postgres)
- **Git** (to clone the repository)

Optional but recommended:
- A **Plaid** account (free sandbox available)
- A **Google Cloud** project with Sheets API enabled
- An **OpenRouter** or **Google Gemini** API key (for LLM categorization)

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start database
docker-compose up -d db

# 3. Set up environment variables (see below)
cp .env.example .env.local
# Edit .env.local with your keys

# 4. Generate Prisma client and push schema
npm run db:generate
npm run db:push

# 5. Start dev server
npm run dev
```

Visit `http://localhost:3000` and log in with your `APP_PASSWORD`.

## Detailed Setup Guide

### 1. Clone and Install

```bash
# Navigate to the project directory
cd autobudgeter

# Install dependencies
npm install
```

### 2. Database Setup

The project uses PostgreSQL. The easiest way to run it locally is with Docker:

```bash
# Start PostgreSQL in Docker
docker-compose up -d db

# Verify it's running
docker ps | grep postgres
```

The database will be available at `localhost:5432` with:
- **User**: `autobudgeter`
- **Password**: `autobudgeter`
- **Database**: `autobudgeter`

**Alternative: Use existing Postgres**

If you have Postgres installed locally, create a database:

```bash
createdb autobudgeter
# Or using psql:
psql -c "CREATE DATABASE autobudgeter;"
```

Then update your `DATABASE_URL` accordingly.

**Initialize the database schema:**

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database (creates tables)
npm run db:push
```

You should see output confirming tables were created.

### 3. Environment Variables

Create a `.env.local` file in the project root:

```bash
cp .env.example .env.local  # If you have an example file
# Or create it manually
touch .env.local
```

**Required variables:**

```env
# Database
DATABASE_URL="postgres://autobudgeter:autobudgeter@localhost:5432/autobudgeter"

# Encryption (generate a secure 32+ character key)
ENCRYPTION_KEY="your-32-character-encryption-key-here"
# Generate with: openssl rand -base64 32

# Authentication
APP_PASSWORD="your-secure-password-here"
# Or disable auth for local development:
AUTH_DISABLED="true"
```

**Generate encryption key:**

```bash
# On macOS/Linux
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 4. Get API Keys

#### 4.1 Plaid Setup (Bank Integration)

1. **Create a Plaid account**
   - Go to [https://dashboard.plaid.com/signup](https://dashboard.plaid.com/signup)
   - Sign up for a free account

2. **Get your API keys**
   - Navigate to **Team Settings** → **Keys**
   - Copy your `Client ID` and `Secret` (use **Sandbox** for testing)

3. **Add to `.env.local`:**
   ```env
   PLAID_CLIENT_ID="your-client-id"
   PLAID_SECRET="your-secret-key"
   PLAID_ENV="sandbox"  # or "development" or "production"
   ```

**Note:** In sandbox mode, you can use test credentials. See [Plaid's test credentials](https://plaid.com/docs/sandbox/test-credentials/).

#### 4.2 Google Sheets Setup

1. **Create a Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project (or select existing)

2. **Enable Google Sheets API**
   - Navigate to **APIs & Services** → **Library**
   - Search for "Google Sheets API"
   - Click **Enable**

3. **Create OAuth 2.0 Credentials**
   - Go to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth client ID**
   - Choose **Web application**
   - Add authorized redirect URI:
     ```
     http://localhost:3000/api/google/exchange
     ```
   - Copy the **Client ID** and **Client Secret**

4. **Add to `.env.local`:**
   ```env
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"
   GOOGLE_REDIRECT_URI="http://localhost:3000/api/google/exchange"
   ```

5. **Prepare your Google Sheet**
   - Create a new Google Sheet or use an existing one
   - Ensure it has a tab named **"Running Balance"** (exact name)
   - Note the **Spreadsheet ID** from the URL:
     ```
     https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_HERE/edit
     ```
   - You'll enter this in Settings later

#### 4.3 LLM Setup (Optional - for auto-categorization)

**Option A: OpenRouter**

1. **Sign up at [OpenRouter.ai](https://openrouter.ai/)**
2. **Get API key** from dashboard
3. **Choose a model** (e.g., `openai/gpt-4o-mini`, `anthropic/claude-3-haiku`)
4. **Add to `.env.local`:**
   ```env
   OPENROUTER_API_KEY="your-openrouter-key"
   OPENROUTER_MODEL="openai/gpt-4o-mini"
   ```

**Option B: Google Gemini**

1. **Get API key** from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. **Add to `.env.local`:**
   ```env
   GEMINI_API_KEY="your-gemini-key"
   GEMINI_MODEL="gemini-1.5-pro"
   ```

**Note:** You can run without LLM and manually categorize transactions.

### 5. Run the Application

```bash
# Start the development server
npm run dev
```

The app will be available at `http://localhost:3000`.

**First-time login:**
- If `AUTH_DISABLED=true`, you'll be logged in automatically
- Otherwise, go to `/auth/login` and enter your `APP_PASSWORD`

### 6. Initial Configuration

After logging in, configure the app:

#### 6.1 Connect Plaid

1. Go to **Settings** (`/settings`)
2. Click **"Connect Plaid"** or **"Get Link Token"**
3. Complete the Plaid Link flow:
   - Select your bank (Chase in production, use test credentials in sandbox)
   - Enter test credentials if in sandbox mode
   - Grant permissions
4. After connecting, **map your accounts**:
   - Assign roles: **bank**, **cc1** (credit card 1), **cc2** (credit card 2)
   - These determine which balance goes to which cell in Sheets

#### 6.2 Choose Export Destination

The app supports two ways to view your budget data:

**Option A: Native UI (Recommended)**
1. In **Settings**, select **"Native UI (Built-in Budget page)"**
2. View your budget on the **Budget** page (`/budget`)
3. No external setup required - all data is displayed in-app

**Option B: Google Sheets**
1. In **Settings**, select **"Google Sheets (External spreadsheet)"**
2. Click **"Connect Google"** and authorize the app
3. **Enter your Spreadsheet ID** (from the Google Sheets URL)
4. Verify the sheet name is **"Running Balance"** (default)

#### 6.3 Configure LLM (Optional)

1. In **Settings**, toggle **"Enable LLM"**
2. Select provider: **OpenRouter** or **Gemini**
3. Enter model name (if different from env var)
4. Set **confidence threshold** (default: 0.80)
   - Transactions below this threshold will need manual review

#### 6.4 Set Auto-Sync (Optional)

1. Enable **"Auto Sync"**
2. Set cron expression (default: `0 9 * * *` = 9 AM daily)
3. If using Google Sheets, enable **"Auto Push to Sheets"** to automatically update Sheets after sync

## Usage Guide

### Sync Transactions

**Manual sync:**
1. Go to **Dashboard** (`/`)
2. Click **"Sync Now"**
3. The app will:
   - Fetch new transactions from Plaid
   - Apply rules (if any match)
   - Categorize with LLM (if enabled)
   - Mark low-confidence transactions for review

**View results:**
- Check **Transactions** (`/transactions`) to see all transactions
- Check **Needs Review** (`/review`) for uncategorized or low-confidence items
- View **Budget** (`/budget`) to see running balances and monthly category breakdown

### Categorize Transactions

**Automatic (with LLM):**
- Transactions are auto-categorized if confidence ≥ threshold
- Check **Transactions** page to see categories

**Manual:**
1. Go to **Needs Review** (`/review`)
2. For each transaction:
   - Select a category from dropdown
   - Optionally check **"Create Rule"** to auto-categorize similar transactions
   - Click **"Assign"**
3. Or use **Bulk Assign** to assign multiple at once

**Edit existing:**
1. Go to **Transactions** (`/transactions`)
2. Click the category dropdown on any transaction
3. Select new category
4. The monthly totals will automatically recompute

### View Budget

**Native UI (Default):**
1. Go to **Budget** (`/budget`)
2. View:
   - **Running Balances**: Bank account, Credit Card 1, Credit Card 2
   - **Monthly Category Breakdown**: Budget vs Spent vs Remaining for each category
   - **Progress Bars**: Visual indicators showing spending progress
   - **Summary Stats**: Total budget, total spent, remaining budget
3. Use the month selector to view different months
4. Data updates automatically after each sync

**Google Sheets (Optional):**
1. In **Settings**, select **"Google Sheets"** as export destination
2. Go to **Dashboard** and click **"Push to Sheets"**
3. The app will:
   - Update **Running Balance** tab: B2 (bank), D2 (cc1), D4 (cc2)
   - Update or create monthly sheet (e.g., "January 2026")
   - Write category totals to Column B based on Column A labels

**Automatic push (Google Sheets only):**
- Enable **"Auto Push to Sheets"** in Settings
- Sheets will update after each sync (only when Google Sheets is selected as export destination)

### Manage Rules

1. Go to **Rules** (`/rules`)
2. **Create rule:**
   - Click **"Create Rule"**
   - Enter pattern (substring or regex)
   - Select category
   - Set priority (higher = checked first)
3. **Edit/Delete:** Click on any rule to modify

**Rule types:**
- **Substring**: Matches if merchant/description contains the text
- **Regex**: Matches using regular expression (case-insensitive)

### View Audit Log

Go to **Audit** (`/audit`) to see:
- Sync events
- Categorization decisions
- Rule creations
- Sheet push events
- Errors

## Troubleshooting

### Database Connection Issues

**Error: "Can't reach database server"**
```bash
# Check if Postgres is running
docker ps | grep postgres

# If not, start it
docker-compose up -d db

# Check connection string in .env.local
DATABASE_URL="postgres://autobudgeter:autobudgeter@localhost:5432/autobudgeter"
```

**Error: "relation does not exist"**
```bash
# Push schema again
npm run db:push
```

### Plaid Connection Issues

**Error: "Plaid not connected"**
- Ensure `PLAID_CLIENT_ID` and `PLAID_SECRET` are set
- Check `PLAID_ENV` matches your Plaid dashboard environment
- Re-connect in Settings

**Error: "Invalid public_token"**
- The Plaid Link token expires quickly
- Get a new link token and try again

### Google Sheets Issues

**Error: "Google not connected"**
- Re-authorize in Settings
- Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- Verify redirect URI matches exactly

**Error: "Sheet not found"**
- Verify spreadsheet ID is correct
- Ensure "Running Balance" tab exists (exact name)
- Check that the app has edit permissions

**Error: "Permission denied"**
- Re-authorize Google OAuth
- Ensure Sheets API is enabled in Google Cloud Console

### LLM Categorization Issues

**Error: "LLM schema validation failed"**
- The LLM returned invalid JSON
- Transaction will be marked for manual review
- Check API key and model name

**All transactions need review:**
- Lower confidence threshold in Settings
- Check LLM API key is valid
- Verify model name is correct

### TypeScript/Build Errors

**Error: "Cannot find module '../generated/prisma'"**
```bash
# Regenerate Prisma client
npm run db:generate
```

**Error: "Type errors"**
```bash
# Check TypeScript
npx tsc --noEmit
```

### Port Already in Use

**Error: "Port 3000 already in use"**
```bash
# Kill process on port 3000 (macOS/Linux)
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 npm run dev
```

## Architecture

### Key Concepts

**Idempotency:**
- Transactions are deduplicated by `provider_transaction_id`
- Monthly totals are **always recomputed** from the database ledger
- Never incremental updates (prevents double-counting)

**Balances:**
- Always from **provider balances** (Plaid), never computed from transactions
- Handles deposits/paychecks automatically

**Sheets Contract:**
- **Running Balance tab**: Writes B2 (bank), D2 (cc1), D4 (cc2)
- **Monthly sheets**: Reads A1:B50, maps Column A labels to row indices, writes totals to Column B
- **SUM row**: Never overwritten (preserves formulas)

**Timezone:**
- All dates resolved in **Asia/Kolkata** timezone for month boundaries

**Pending Transactions:**
- Ingested but excluded from Sheets until posted

### Data Flow

1. **Sync triggered** (manual or cron)
2. **Fetch** balances + new transactions from Plaid
3. **Normalize** transactions (expenses positive, refunds negative)
4. **Apply rules** (substring/regex matching)
5. **LLM categorization** (if enabled and no rule matched)
6. **Mark for review** (if confidence < threshold)
7. **Recompute** monthly totals from DB ledger
8. **Push to Sheets** (if Google Sheets export is enabled) OR **Display in Native UI** (default)

### File Structure

```
autobudgeter/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── api/          # API routes
│   │   │   ├── budget/   # Budget data endpoint
│   │   │   ├── sync/    # Sync endpoint
│   │   │   ├── sheets/  # Google Sheets push
│   │   │   └── ...      # Other API routes
│   │   ├── auth/        # Auth pages
│   │   ├── budget/       # Native Budget page
│   │   └── [pages]/     # Other UI pages
│   ├── lib/             # Core logic
│   │   ├── plaid.ts     # Plaid integration
│   │   ├── sheets.ts    # Google Sheets integration
│   │   ├── sync.ts      # Sync orchestration
│   │   ├── rules.ts     # Rules engine
│   │   ├── llm/         # LLM adapters
│   │   ├── aggregation.ts # Month totals
│   │   └── cron.ts      # Scheduled sync
│   ├── components/      # React components
│   └── tests/           # Unit tests
├── prisma/
│   └── schema.prisma    # Database schema
├── docker-compose.yml   # Postgres setup
├── .env.example         # Environment variables template
└── .env.local          # Environment variables (not in git)
```

## Development

### Run Tests

```bash
npm test
```

### Lint Code

```bash
npm run lint
```

### Database Migrations

```bash
# Generate Prisma client after schema changes
npm run db:generate

# Push schema changes to database
npm run db:push
```

### Docker Development

```bash
# Start everything (app + db)
docker-compose up --build

# View logs
docker-compose logs -f app

# Stop everything
docker-compose down
```

## Production Deployment

1. Set all environment variables in your hosting platform
2. Build the app: `npm run build`
3. Start: `npm start`
4. Ensure Postgres is accessible
5. Run migrations: `npm run db:push`

## Support

For issues or questions:
- Check the [Troubleshooting](#troubleshooting) section
- Review audit logs for error details
- Check browser console and server logs

## License

Private project - all rights reserved.
