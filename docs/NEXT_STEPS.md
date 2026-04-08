# Next Steps & Future Development

This document outlines the roadmap for improving and expanding AutoBudgeter.

## 1. Polish Frontend UI

### Visual Design Improvements
- [x] **Modern Design System**
  - [x] Implement consistent color palette and typography (Geist font, semantic colors)
  - [ ] Add dark mode support
  - [ ] Improve spacing and layout consistency
  - [ ] Add smooth transitions and animations
  - [x] Implement loading skeletons instead of "Loading..." text

- [x] **Budget Page Enhancements**
  - [x] Add charts and graphs (spending trends, category breakdown pie chart)
  - [x] Interactive budget vs actual comparison visualizations
  - Month-over-month comparison view
  - [x] Budget progress indicators with better visual feedback
  - [x] Color-coded spending alerts (green/yellow/red thresholds)

- [x] **Dashboard Improvements**
  - [x] Add summary cards with key metrics
  - [x] Quick action buttons
  - Recent transactions widget
  - Spending trends chart
  - [x] Budget status overview

- [ ] **Transaction List Enhancements**
  - Better table design with sortable columns
  - Advanced filtering (date range, amount range, category, status)
  - Bulk actions UI improvements
  - Transaction detail modal/view
  - [x] Export transactions to CSV

- [x] **Review Page Improvements**
  - Better queue management
  - Keyboard shortcuts for faster categorization
  - [x] Batch operations UI
  - [x] Confidence score visualization
  - Suggested categories based on history

- [ ] **Settings Page Redesign**
  - [x] Tabbed interface for better organization
  - [x] Connection status indicators
  - [x] Test connection buttons
  - Clearer configuration sections
  - Help tooltips and inline documentation

### User Experience Enhancements
- [ ] **Navigation**
  - Breadcrumb navigation
  - [x] Active page highlighting
  - Mobile-responsive navigation menu (Basic overflow implemented)
  - Keyboard navigation support

- [x] **Feedback & Notifications**
  - [x] Toast notifications for actions (success/error)
  - Inline form validation
  - Better error messages with actionable steps
  - Success confirmations
  - Progress indicators for long operations

- [ ] **Accessibility**
  - ARIA labels and roles
  - Keyboard navigation
  - Screen reader support
  - High contrast mode
  - Focus indicators

- [ ] **Mobile Responsiveness**
  - Optimize all pages for mobile devices (Basic responsiveness implemented)
  - Touch-friendly buttons and interactions
  - Mobile-optimized tables and forms
  - Responsive charts and visualizations

### Component Library
- [ ] **Reusable Components**
  - Button variants (primary, secondary, danger, etc.)
  - Form inputs with validation
  - Modal/Dialog component
  - [x] Toast notification system
  - [x] Loading states (Skeletons implemented)
  - Empty states
  - Error states

---

## 2. Comprehensive Testing

### User Workflow Testing

#### Workflow 1: Google Sheets Export
- [x] **Setup Flow**
  - [x] Connect Plaid account
  - [x] Map accounts to roles (bank, cc1, cc2)
  - [x] Connect Google account
  - [x] Set spreadsheet ID
  - [x] Select "Google Sheets" as export destination
  - [x] Verify settings saved correctly

- [x] **Sync & Export Flow**
  - [x] Manual sync triggers correctly
  - [x] Transactions sync from Plaid
  - [x] Rules apply correctly
  - [x] LLM categorization works (if enabled)
  - [x] Data pushes to Google Sheets
  - [x] Running balances update in correct cells (B2, D2, D4)
  - [x] Monthly sheet created/updated correctly
  - [x] Category totals written to correct rows
  - [x] SUM row not overwritten

- [x] **Auto-Sync Flow**
  - [x] Cron job triggers at scheduled time
  - [x] Auto-push to Sheets works
  - [x] Export destination respected
  - [x] Errors logged to audit log

#### Workflow 2: Native UI Only (No Google Sheets)
- [x] **Setup Flow**
  - [x] Connect Plaid account
  - [x] Map accounts to roles
  - [x] Select "Native UI" as export destination
  - [x] Verify no Google Sheets setup required

- [x] **Usage Flow**
  - [x] Budget page displays correctly
  - [x] Running balances show accurate data
  - [x] Category breakdown accurate
  - [x] Month selector works
  - [x] Data updates after sync
  - [x] No errors when Google Sheets not configured

#### Workflow 3: LLM Categorization Enabled
- [x] **Setup Flow**
  - [x] Enable LLM in settings
  - [x] Select provider (OpenRouter or Gemini)
  - [x] Set confidence threshold
  - [x] Verify API keys configured

- [x] **Categorization Flow**
  - [x] New transactions categorized by LLM
  - [x] High-confidence transactions auto-categorized
  - [x] Low-confidence transactions go to review
  - [x] LLM suggested rules auto-created
  - [x] Transfer detection works
  - [x] Error handling when LLM fails

#### Workflow 4: Rules-Only (No LLM)
- [x] **Setup Flow**
  - [x] LLM disabled in settings
  - [x] Create multiple rules
  - [x] Set rule priorities

- [x] **Categorization Flow**
  - [x] Rules match correctly
  - [x] Priority ordering respected
  - [x] Unmatched transactions go to review
  - [x] Rule creation from review works

#### Workflow 5: Manual Classification Only
- [x] **Setup Flow**
  - [x] LLM disabled
  - [x] No rules created
  - [x] All transactions go to review

- [x] **Review Flow**
  - [x] Review page shows all uncategorized transactions
  - [x] Individual assignment works
  - [x] Bulk assignment works
  - [x] Create rule from transaction works
  - [x] Mark as ignored works
  - [x] Mark as transfer works
  - [x] Category totals update after assignment

### Edge Cases & Error Handling
- [ ] **Plaid Connection Issues**
  - [ ] Handle expired access tokens
  - [ ] Handle Plaid API errors
  - [ ] Handle network failures
  - [ ] Reconnection flow

- [ ] **Google Sheets Issues**
  - [ ] Handle expired refresh tokens
  - [ ] Handle permission errors
  - [ ] Handle missing spreadsheet
  - [ ] Handle missing sheet tabs
  - [ ] Re-authentication flow

- [ ] **LLM Issues**
  - [ ] Handle API rate limits
  - [ ] Handle invalid responses
  - [ ] Handle network timeouts
  - [ ] Fallback to manual review

- [ ] **Database Issues**
  - [ ] Handle connection failures
  - [ ] Handle migration errors
  - [ ] Handle constraint violations

- [ ] **Data Integrity**
  - [ ] Duplicate transaction prevention
  - [ ] Data consistency checks
  - [ ] Transaction reconciliation

### Integration Testing
- [ ] **End-to-End Tests** (Infrastructure needed: Playwright/Cypress)
  - [ ] Full sync workflow
  - [ ] Complete categorization pipeline
  - [ ] Budget calculation accuracy
  - [ ] Export to both destinations

- [x] **API Testing**
  - [x] All endpoints return correct responses (Verified via manual testing and basic suite)
  - [x] Error handling works correctly
  - [x] Authentication required where needed
  - [ ] Rate limiting (if implemented)

- [ ] **Performance Testing**
  - [ ] Large transaction volumes
  - [ ] Concurrent sync operations
  - [ ] Database query performance
  - [ ] Page load times

---

## 3. User Management & Multi-Tenancy

### Authentication System
- [ ] **External Authentication Providers**
  - [ ] Google OAuth integration
  - [ ] GitHub OAuth (for developers)
  - [x] Email/password authentication (Single user mode)
  - [ ] Magic link authentication
  - [ ] Social login options (Apple, Microsoft)

- [ ] **User Management**
  - [ ] User registration flow
  - [ ] Email verification
  - [ ] Password reset flow
  - [ ] Account deletion
  - [ ] Profile management

### Multi-Tenancy Architecture
- [ ] **Database Schema Updates**
  - [ ] Add `User` model
  - [ ] Add `userId` foreign keys to all models
  - [ ] Add user-scoped queries
  - [ ] Migration strategy for existing data

- [ ] **Data Isolation**
  - [ ] Ensure users can only access their own data
  - [ ] Row-level security in database
  - [ ] API endpoint authorization checks
  - [ ] Frontend data filtering

- [ ] **Session Management**
  - [ ] Multi-user session support
  - [ ] Session persistence
  - [ ] Logout functionality
  - [ ] Remember me option

### Subscription & Billing (Optional)
- [ ] **Pricing Tiers**
  - [ ] Free tier (limited features)
  - [ ] Basic tier (single account)
  - [ ] Pro tier (multiple accounts, advanced features)
  - [ ] Enterprise tier (custom features)

- [ ] **Payment Integration**
  - [ ] Stripe integration
  - [ ] Subscription management
  - [ ] Usage tracking
  - [ ] Billing history

- [ ] **Feature Gating**
  - [ ] LLM categorization (paid feature)
  - [ ] Multiple accounts (paid feature)
  - [ ] Advanced analytics (paid feature)
  - [ ] API access (paid feature)

### Admin Dashboard
- [ ] **User Management**
  - [ ] View all users
  - [ ] User activity monitoring
  - [ ] Account suspension/activation
  - [ ] Support tools

- [ ] **System Monitoring**
  - [ ] System health dashboard
  - [ ] Error tracking
  - [ ] Usage analytics
  - [ ] Performance metrics

---

## 4. Additional Feature Ideas

### Budget Management
- [ ] **Budget Planning**
  - [ ] Set monthly budgets per category
  - [ ] Budget templates
  - [ ] Budget rollover rules
  - [ ] Annual budget planning

- [ ] **Budget Alerts**
  - [ ] Email notifications when approaching budget limits
  - [ ] Push notifications (if mobile app)
  - [ ] Custom alert thresholds
  - [ ] Weekly/monthly budget summaries

- [ ] **Budget Goals**
  - [ ] Savings goals
  - [ ] Debt payoff goals
  - [ ] Goal tracking and visualization
  - [ ] Goal-based category recommendations

### Analytics & Reporting
- [ ] **Spending Analytics**
  - [ ] Spending trends over time
  - [ ] Category comparison charts
  - [ ] Year-over-year comparisons
  - [ ] Spending patterns identification

- [ ] **Reports**
  - [ ] Monthly spending reports
  - [ ] Category breakdown reports
  - [ ] Export reports to PDF
  - [ ] Custom date range reports

- [ ] **Insights**
  - [ ] AI-powered spending insights
  - [ ] Unusual spending detection
  - [ ] Savings opportunities
  - [ ] Category recommendations

### Transaction Management
- [ ] **Recurring Transactions**
  - [ ] Automatic detection of recurring transactions
  - [ ] Recurring transaction management
  - [ ] Subscription tracking
  - [ ] Recurring transaction categorization

- [ ] **Transaction Splitting**
  - [ ] Split transactions across multiple categories
  - [ ] Partial categorization
  - [ ] Split transaction editing

- [ ] **Transaction Notes & Tags**
  - [ ] Add notes to transactions
  - [ ] Tag system for transactions
  - [ ] Search by tags
  - [ ] Tag-based filtering

- [ ] **Transaction Attachments**
  - [ ] Upload receipts
  - [ ] Link documents to transactions
  - [ ] Receipt OCR for automatic categorization

### Account Management
- [ ] **Multiple Bank Accounts**
  - [x] Support for multiple Plaid connections
  - [ ] Account grouping
  - [ ] Account-specific rules
  - [x] Account balance aggregation

### Rules Engine Enhancements
- [ ] **Advanced Rules**
  - [ ] Amount-based rules
  - [ ] Date-based rules
  - [ ] Multi-condition rules
  - [ ] Rule templates

- [ ] **Rule Analytics**
  - [ ] Rule effectiveness tracking
  - [ ] Rule usage statistics
  - [ ] Rule suggestions
  - [ ] Rule optimization recommendations

### Integration Enhancements
- [ ] **Additional Export Options**
  - [x] CSV export
  - [ ] PDF export
  - [ ] Excel export
  - [ ] QuickBooks integration
  - [ ] Mint/YNAB import format

- [ ] **API Access**
  - [ ] RESTful API for external access
  - [ ] API key management
  - [ ] Webhook support
  - [ ] API documentation

- [ ] **Mobile App**
  - [ ] React Native mobile app
  - [ ] Push notifications
  - [ ] Mobile-optimized views
  - [ ] Offline support

### Data Import/Export
- [x] **Manual Transaction Import**
  - [x] CSV Import (Basic parsing of Date, Description, Amount, Merchant)
  - [ ] CSV mapping interface (Future enhancement)
  - [ ] Advanced CSV Import validation (Future enhancement)
  - [x] LLM Statement Import (Basic parsing of plain text statements)
  - [ ] PDF parsing for LLM import (Future enhancement)

- [ ] **Data Export**
  - [ ] Full data export
  - [ ] Selective export
  - [ ] Export scheduling
  - [ ] Data backup automation

### Automation
- [ ] **Smart Automation**
  - [ ] Auto-categorization improvements
  - [ ] Predictive categorization
  - [ ] Automatic rule creation from patterns
  - [ ] Smart budget adjustments

- [ ] **Workflow Automation**
  - [ ] Custom automation rules
  - [ ] If-then logic for transactions
  - [ ] Automated alerts
  - [ ] Scheduled reports

### Collaboration (If Multi-User)
- [ ] **Shared Budgets**
  - [ ] Family/household budgets
  - [ ] Shared categories
  - [ ] Permission management
  - [ ] Activity feed

- [ ] **Comments & Communication**
  - [ ] Transaction comments
  - [ ] Budget discussion threads
  - [ ] Notification system

### Security & Privacy
- [ ] **Enhanced Security**
  - [ ] Two-factor authentication (2FA)
  - [ ] Login history
  - [ ] Device management
  - [ ] Security alerts

- [ ] **Privacy Features**
  - [ ] Data encryption at rest
  - [ ] GDPR compliance
  - [ ] Data retention policies
  - [ ] Privacy controls

### Performance & Scalability
- [ ] **Optimization**
  - [ ] Database query optimization
  - [ ] Caching layer (Redis)
  - [ ] CDN for static assets
  - [ ] Image optimization

- [ ] **Scalability**
  - [ ] Horizontal scaling support
  - [ ] Load balancing
  - [ ] Database read replicas
  - [ ] Microservices architecture (if needed)

### Developer Experience
- [ ] **Documentation**
  - [ ] API documentation (OpenAPI/Swagger)
  - [ ] Developer guide
  - [x] Architecture documentation
  - [ ] Contributing guidelines

- [ ] **Testing Infrastructure**
  - [ ] E2E testing setup (Playwright/Cypress)
  - [x] Integration test suite (Basic Vitest suite)
  - [ ] Performance testing
  - [ ] CI/CD pipeline

- [ ] **Monitoring & Observability**
  - [ ] Application monitoring (e.g., Sentry)
  - [ ] Performance monitoring (e.g., New Relic)
  - [ ] Log aggregation
  - [ ] Error tracking

---

## Priority Recommendations

### Phase 1: Foundation (Weeks 1-4)
1. [x] Polish frontend UI (critical pages first)
2. [ ] Comprehensive testing of all workflows (E2E needed)
3. [ ] Fix any bugs discovered during testing
4. [x] Improve error handling and user feedback (Toasts implemented)

### Phase 2: Multi-Tenancy (Weeks 5-8)
1. [ ] Implement user authentication system (Full management)
2. [ ] Add multi-tenancy support
3. [ ] Migrate existing data structure
4. [ ] Test multi-user scenarios

### Phase 3: Enhanced Features (Weeks 9-12)
1. [ ] Budget planning and alerts
2. [ ] Advanced analytics
3. [ ] Recurring transaction detection
4. [x] Manual transaction import functionality (CSV & LLM)

### Phase 4: Scale & Optimize (Ongoing)
1. [ ] Performance optimization
2. [ ] Mobile app development
3. [ ] API development
4. [ ] Advanced integrations

---

## Notes

- Start with UI polish and testing to ensure a solid foundation
- User management is critical before launching as a service
- Consider starting with a beta program to gather feedback
- Prioritize features based on user feedback and usage analytics
- Maintain backward compatibility during major changes
