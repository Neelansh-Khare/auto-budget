# AutoBudgeter Features

A comprehensive list of all features and capabilities in the AutoBudgeter application.

## Features List

### Bank Integration
- ✅ Connect bank accounts via Plaid OAuth flow
- ✅ Support for multiple accounts (bank, credit cards)
- ✅ Automatic transaction syncing from Plaid
- ✅ Delta sync (only fetches new transactions since last sync)
- ✅ Real-time balance fetching
- ✅ Pending transaction handling
- ✅ Transaction normalization (expenses positive, refunds negative)

### Transaction Categorization
- ✅ Rule-based categorization (substring and regex patterns)
- ✅ Priority-based rule matching
- ✅ LLM-powered categorization (OpenRouter or Google Gemini)
- ✅ Confidence scoring for LLM categorizations
- ✅ Configurable confidence threshold
- ✅ Automatic transfer detection
- ✅ Auto-creation of rules from LLM suggestions
- ✅ Manual categorization and editing

### Review & Management
- ✅ Manual review queue for uncategorized transactions
- ✅ Bulk assignment of categories
- ✅ Individual transaction editing
- ✅ Mark transactions as ignored
- ✅ Mark transactions as transfers
- ✅ Create rules directly from review page
- ✅ Transaction filtering and search

### Budget Viewing
- ✅ Native in-app Budget page with full UI
- ✅ Running balance display (bank, CC1, CC2)
- ✅ Monthly category breakdown
- ✅ Budget vs Spent vs Remaining tracking
- ✅ Visual progress bars with color coding
- ✅ Month selector for historical data
- ✅ Summary statistics cards
- ✅ Google Sheets export (optional)

### Rules Engine
- ✅ Create, edit, and delete categorization rules
- ✅ Substring pattern matching
- ✅ Regex pattern matching
- ✅ Priority ordering for rule application
- ✅ Enable/disable rules
- ✅ Rules applied before LLM categorization

### Automation
- ✅ Scheduled automatic syncing (cron-based)
- ✅ Configurable cron schedule
- ✅ Automatic push to Google Sheets (when enabled)
- ✅ Respects export destination setting

### Data Management
- ✅ Idempotent transaction deduplication
- ✅ Monthly totals recomputation from database ledger
- ✅ Timezone-aware month resolution (Asia/Kolkata)
- ✅ Excludes pending, ignored, transfer, and removed transactions
- ✅ Audit logging for all operations

### Security & Authentication
- ✅ Password-based authentication
- ✅ Encrypted storage of sensitive tokens (Plaid, Google)
- ✅ Session management
- ✅ Optional authentication disable for development

### Export Options
- ✅ Native UI Budget page (default, no setup required)
- ✅ Google Sheets integration (optional)
- ✅ Running balance updates to specific cells
- ✅ Monthly sheet creation and updates
- ✅ Dynamic category mapping
- ✅ Formula protection (SUM rows never overwritten)

### User Interface
- ✅ Dashboard with category overview
- ✅ Budget page with detailed breakdown
- ✅ Transactions list with filtering
- ✅ Review queue for manual categorization
- ✅ Rules management page
- ✅ Settings page for configuration
- ✅ Audit log viewer
- ✅ Responsive design

---

## Technical Implementation

### Architecture

**Framework & Stack:**
- Next.js 15 (App Router) with TypeScript
- React 19 for UI components
- Tailwind CSS for styling
- PostgreSQL database with Prisma ORM
- Docker Compose for local development

**Key Libraries:**
- `plaid` - Bank account integration
- `googleapis` - Google Sheets API
- `react-plaid-link` - Plaid OAuth flow
- `node-cron` - Scheduled tasks
- `luxon` - Date/time handling
- `zod` - Schema validation
- `iron-session` - Session management

### Data Flow

1. **Sync Process:**
   - User triggers sync (manual or scheduled)
   - Fetch accounts and balances from Plaid
   - Fetch new transactions since last sync
   - Normalize transaction amounts (expenses positive)
   - Apply rules in priority order
   - If no rule matches and LLM enabled, categorize with LLM
   - Mark low-confidence transactions for review
   - Store transactions in database
   - Recompute monthly totals from database ledger
   - Push to Google Sheets (if enabled) or display in native UI

2. **Categorization Pipeline:**
   - Rules checked first (substring/regex matching)
   - If rule matches, assign category immediately
   - If no rule and LLM enabled, call LLM API
   - LLM returns category, confidence, transfer flag, and optional rule suggestion
   - If confidence ≥ threshold, auto-categorize
   - If confidence < threshold or LLM fails, mark for review
   - Auto-create rule if LLM suggests it

3. **Budget Aggregation:**
   - Query transactions for selected month (timezone-aware)
   - Filter out: pending, ignored, transfer, removed
   - Group by category and sum amounts
   - Return totals for each category
   - Always recomputed from database (never incremental)

### Database Schema

**Models:**
- `Account` - Bank accounts from Plaid
- `Transaction` - Individual transactions with categorization
- `Rule` - Categorization rules (pattern + category)
- `SheetConfig` - Google Sheets configuration
- `Settings` - App-wide settings (LLM, sync, export destination)
- `AuditLog` - Event logging for debugging

**Key Design Decisions:**
- Unique constraint on `provider_transaction_id` prevents duplicates
- Encrypted fields for sensitive tokens
- Enums for status tracking (TransactionStatus, CategorizationSource, etc.)
- JSON fields for flexible data storage

### Security

**Encryption:**
- All Plaid access tokens encrypted before storage
- Google refresh tokens encrypted before storage
- Uses AES encryption with key from environment variable
- Session cookies encrypted with iron-session

**Authentication:**
- Password-based login (configurable via APP_PASSWORD)
- Session-based authentication
- Middleware protects all routes except public endpoints
- Can be disabled for development (AUTH_DISABLED)

### API Endpoints

**Core APIs:**
- `POST /api/sync` - Trigger transaction sync
- `GET /api/transactions` - List transactions with filters
- `PATCH /api/transactions/:id` - Edit transaction
- `GET /api/budget` - Get budget data for native UI
- `GET /api/categories/summary` - Get category summary
- `POST /api/sheets/push` - Push data to Google Sheets

**Configuration APIs:**
- `GET/POST /api/settings` - Manage app settings
- `GET/POST /api/rules` - CRUD operations for rules
- `GET /api/audit` - View audit logs

**Integration APIs:**
- `POST /api/plaid/link-token` - Get Plaid Link token
- `POST /api/plaid/exchange` - Exchange Plaid public token
- `GET /api/google/auth-url` - Get Google OAuth URL
- `GET /api/google/exchange` - Exchange Google OAuth code

### Export Destinations

**Native UI (Default):**
- Budget data served via `/api/budget` endpoint
- React components render budget page
- No external dependencies
- Real-time updates after sync
- Month selector for historical views

**Google Sheets (Optional):**
- OAuth 2.0 flow for authentication
- Encrypted refresh token storage
- Updates specific cells (B2, D2, D4 for balances)
- Creates monthly sheets dynamically
- Maps category labels to rows dynamically
- Never overwrites formula rows (SUM protection)

### Scheduled Tasks

**Cron Scheduler:**
- Initialized on app startup
- Checks settings every minute for changes
- Respects export destination setting
- Only pushes to Sheets if Google Sheets is selected
- Logs errors to audit log
- Configurable cron expression (default: 9 AM daily)

### Error Handling

**Transaction Processing:**
- LLM failures → mark for review
- Invalid JSON from LLM → mark for review
- Duplicate transactions → skipped (idempotent)
- Missing accounts → skipped with logging

**External Services:**
- Plaid errors → logged to audit log
- Google Sheets errors → logged to audit log
- Network errors → retry logic where applicable

### Testing

**Unit Tests:**
- Rules matching logic
- LLM JSON schema validation
- Category-to-row mapping
- Aggregation calculations

**Test Framework:**
- Vitest for unit testing
- Test files in `src/tests/`

### Deployment

#### Prerequisites

**System Requirements:**
- Node.js 18.19.0+ (20.9.0+ recommended)
- PostgreSQL database (managed or self-hosted)
- Environment variables configured
- Domain name (optional, for custom domain)

**Before Deployment:**
1. Build the application: `npm run build`
2. Test locally: `npm start`
3. Ensure all environment variables are set
4. Database schema pushed: `npm run db:push`

#### Deployment Platforms

**Option 1: Vercel (Recommended for Next.js)**

1. **Prepare for deployment:**
   ```bash
   npm run build
   ```

2. **Connect to Vercel:**
   - Install Vercel CLI: `npm i -g vercel`
   - Run `vercel` in project directory
   - Follow prompts to link project

3. **Set environment variables in Vercel dashboard:**
   - Go to Project Settings → Environment Variables
   - Add all variables from `.env.example`
   - Set `NODE_ENV=production`
   - Use production Plaid credentials
   - Update `GOOGLE_REDIRECT_URI` to your Vercel domain

4. **Configure database:**
   - Use Vercel Postgres or external provider (e.g., Supabase, Neon, Railway)
   - Set `DATABASE_URL` in environment variables

5. **Deploy:**
   ```bash
   vercel --prod
   ```

6. **Post-deployment:**
   - Run database migrations: `vercel env pull && npm run db:push`
   - Or use Vercel's database migration feature

**Option 2: Railway**

1. **Connect repository:**
   - Sign up at railway.app
   - Create new project from GitHub repo

2. **Add PostgreSQL service:**
   - Add PostgreSQL database service
   - Copy connection string

3. **Configure environment variables:**
   - Add all required variables
   - Set `DATABASE_URL` from PostgreSQL service
   - Update `GOOGLE_REDIRECT_URI` to Railway domain

4. **Deploy:**
   - Railway auto-deploys on git push
   - Or trigger manual deploy

5. **Run migrations:**
   - Use Railway CLI or add migration script to build

**Option 3: Render**

1. **Create web service:**
   - Connect GitHub repository
   - Select Node.js environment
   - Set build command: `npm install && npm run build`
   - Set start command: `npm start`

2. **Add PostgreSQL database:**
   - Create PostgreSQL database service
   - Copy internal database URL

3. **Set environment variables:**
   - Add all required variables
   - Use database URL from PostgreSQL service
   - Update `GOOGLE_REDIRECT_URI` to Render domain

4. **Deploy:**
   - Render auto-deploys on git push

**Option 4: Self-Hosted (VPS/Docker)**

1. **Server setup:**
   ```bash
   # Install Node.js and PostgreSQL
   # Clone repository
   git clone <repo-url>
   cd autobudgeter
   npm install
   ```

2. **Configure environment:**
   - Copy `.env.example` to `.env.production`
   - Fill in all production values
   - Set `NODE_ENV=production`

3. **Database setup:**
   ```bash
   # Create PostgreSQL database
   createdb autobudgeter
   # Push schema
   npm run db:push
   ```

4. **Build and start:**
   ```bash
   npm run build
   npm start
   ```

5. **Use process manager (PM2):**
   ```bash
   npm install -g pm2
   pm2 start npm --name "autobudgeter" -- start
   pm2 save
   pm2 startup
   ```

6. **Set up reverse proxy (Nginx):**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

7. **Enable HTTPS (Let's Encrypt):**
   ```bash
   sudo certbot --nginx -d yourdomain.com
   ```

#### Environment Variables Checklist

**Required for all deployments:**
- `DATABASE_URL` - PostgreSQL connection string
- `ENCRYPTION_KEY` - Generate with `openssl rand -base64 32`
- `APP_PASSWORD` - Strong password for authentication
- `NODE_ENV=production`

**Required for Plaid integration:**
- `PLAID_CLIENT_ID` - Production client ID
- `PLAID_SECRET` - Production secret
- `PLAID_ENV=production` - Use production environment

**Required if using Google Sheets:**
- `GOOGLE_CLIENT_ID` - OAuth client ID
- `GOOGLE_CLIENT_SECRET` - OAuth client secret
- `GOOGLE_REDIRECT_URI` - Must match deployment domain

**Required if using LLM:**
- `OPENROUTER_API_KEY` OR `GEMINI_API_KEY`
- `OPENROUTER_MODEL` OR `GEMINI_MODEL`

**Optional:**
- `AUTH_DISABLED=false` - Keep false in production

#### Post-Deployment Steps

1. **Verify database connection:**
   - Check that schema is pushed
   - Verify tables exist

2. **Test authentication:**
   - Visit login page
   - Verify password authentication works

3. **Test Plaid connection:**
   - Go to Settings
   - Connect bank account via Plaid Link
   - Verify accounts appear

4. **Test Google Sheets (if enabled):**
   - Connect Google account
   - Set spreadsheet ID
   - Test push to sheets

5. **Verify cron scheduler:**
   - Check that auto-sync is working
   - Review audit logs for sync events

6. **Set up monitoring:**
   - Configure error tracking (e.g., Sentry)
   - Set up uptime monitoring
   - Monitor database connections

#### Production Considerations

**Security:**
- ✅ Use strong `ENCRYPTION_KEY` (32+ characters)
- ✅ Use secure `APP_PASSWORD`
- ✅ Enable HTTPS (required for OAuth)
- ✅ Keep `AUTH_DISABLED=false`
- ✅ Use production Plaid credentials
- ✅ Rotate secrets regularly

**Performance:**
- ✅ Enable database connection pooling
- ✅ Use CDN for static assets (Vercel does this automatically)
- ✅ Monitor database query performance
- ✅ Set up database backups

**Cron Jobs:**
- ✅ In-app cron works on most platforms (Vercel, Railway, Render)
- ✅ For platforms that don't support long-running processes, use external cron service:
  - Set up cron job to call `/api/sync` endpoint
  - Use services like cron-job.org or EasyCron
  - Or use platform-specific scheduled functions

**Database:**
- ✅ Use managed PostgreSQL (recommended)
- ✅ Set up automated backups
- ✅ Monitor connection limits
- ✅ Use connection pooling

**Scaling:**
- ✅ Stateless design allows horizontal scaling
- ✅ Use load balancer for multiple instances
- ✅ Database connection pooling handles concurrent requests
- ✅ Consider read replicas for high traffic

#### Troubleshooting Deployment

**Build failures:**
- Check Node.js version (18.19.0+)
- Verify all dependencies install correctly
- Check for TypeScript errors: `npx tsc --noEmit`

**Database connection issues:**
- Verify `DATABASE_URL` is correct
- Check database is accessible from deployment platform
- Verify firewall rules allow connections
- Test connection string locally

**OAuth redirect issues:**
- Ensure `GOOGLE_REDIRECT_URI` matches deployment domain exactly
- Check Plaid redirect URI in Plaid dashboard
- Verify HTTPS is enabled (required for OAuth)

**Cron not working:**
- Check platform supports long-running processes
- Verify `autoSyncEnabled` is true in settings
- Review audit logs for cron errors
- Consider external cron service if needed

### Performance

**Optimizations:**
- Delta sync (only new transactions)
- Database indexes on frequently queried fields
- Idempotent operations prevent duplicate work
- Efficient aggregation queries
- Client-side caching where appropriate

**Scalability:**
- Stateless API design
- Database connection pooling
- Efficient queries with Prisma
- Can scale horizontally with load balancer

---

## Future Enhancements (Optional)

- CSV import fallback for manual transaction entry
- Multi-user support with user accounts
- Budget alerts and notifications
- Advanced analytics and reporting
- Export to other formats (CSV, PDF)
- Mobile app support
- Recurring transaction detection
- Budget goal setting and tracking