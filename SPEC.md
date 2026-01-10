# Job Application Copilot - Project Specification

## Overview
A local-first, privacy-focused CLI tool that intelligently automates job application workflows while maintaining strict compliance and human oversight. The tool aggregates job postings, assists with triaging applications, automates browser-based form filling using Playwright, and generates personalized application answers using AI - all while ensuring every submission requires explicit user confirmation.

## Problem Statement
Job searching is time-consuming and repetitive. Applicants spend hours:
- Manually searching across multiple job boards and company career pages
- Copy-pasting the same information into different application forms
- Writing custom answers to similar questions repeatedly
- Dealing with interruptions from CAPTCHAs and verification steps
- Losing track of which jobs they've applied to

This tool solves these pain points by automating the repetitive parts while keeping the human in full control, especially for compliance-sensitive actions like final submission.

## Target Audience
**Primary:** Will Reynoir (personal use)
**Future:** General public - job seekers who want to apply to more positions efficiently while maintaining quality and compliance

## Core Features (MVP)

### 1. Job Aggregation System
- Pull job listings from multiple sources:
  - RSS feeds (generic connector)
  - Greenhouse API (if available)
  - Lever API (if available)
  - Approved HTML pages (with strict rate limiting and robots.txt compliance)
- Normalize job data: title, company, location, remote/hybrid, salary, URL, posted date, source
- De-duplicate jobs using (source, external_id) or hash(url+title+company)
- Store in local SQLite database

### 2. Job Triage & Queue Management
- Score/rank jobs based on user preferences and keywords
- Filter out irrelevant or duplicate postings
- CLI commands:
  - `copilot jobs:sync` - Fetch new jobs from all sources
  - `copilot jobs:list --filter <criteria>` - View available jobs
  - `copilot jobs:queue <jobId>` - Add job to application queue
  - `copilot jobs:open <jobId>` - Open job posting in browser

### 3. User Profile & Onboarding
- Interactive CLI wizard: `copilot onboard`
- Collect comprehensive career context:
  - Work history with accomplishments (STAR format encouraged)
  - Key projects (problem → approach → impact)
  - Skills, tech stack, preferences, values
  - Industries of interest
  - Portfolio links and writing samples
  - "Canonical" answers to common questions (Why this company/role, strengths/weaknesses, conflict resolution, leadership examples, etc.)
- Store as structured JSON in SQLite with optional markdown export
- Allow updates and refinements over time

### 4. AI-Powered Draft Answer Generation
- **Command:** `copilot draft --job <id>`
- Extract job description and application question prompts
- Generate personalized draft answers using:
  - User profile context
  - Job-specific details
  - Configurable length (75/150/250 words)
  - Style options: concise, confident, truthful
- Provide 2-3 variants per question:
  - "Direct" - straightforward answer
  - "Story/STAR" - narrative with situation, task, action, result
  - "Metrics-heavy" - emphasizes quantifiable achievements
- Include "claim check" section:
  - Lists all facts used in the draft
  - Identifies which came from user profile vs. job posting
  - Flags [NEEDS INPUT] where information is missing
- **Critical:** Never fabricate facts. Ask user for missing details.
- Common question types to support:
  - "Why this role/company?"
  - "Describe a project you're proud of"
  - "A challenge you overcame"
  - "Tell us about your experience with [technology/skill]"

### 5. Browser Automation with Human-in-the-Loop
- **Command:** `copilot apply --job <id>`
- Use Playwright with persistent browser context pointing to real Chrome profile
- Simplify extension integration (assumes installed in user's profile)
- Workflow:
  1. Navigate to job application URL
  2. Wait for Simplify to perform baseline autofill
  3. Detect custom application questions
  4. Show AI-generated draft answers
  5. Request user approval to insert each answer
  6. Continue form filling with user supervision
  7. Pause before final submission for manual confirmation
- Log all steps and outcomes in audit log

### 6. Human-Step Detection & Notifications
- **"Human Step Detector"** monitors DOM for:
  - **CAPTCHAs:** reCAPTCHA/hCaptcha iframes, known script URLs, "I'm not a robot" text, "captcha" keywords
  - **2FA/Verification:** "verification code", "authenticator", OTP input fields
  - **File uploads:** Resume/cover letter upload prompts (if Simplify doesn't handle)
  - **Consent pages:** EEO forms, checkbox agreements requiring manual verification
- When human step detected:
  1. Pause automation safely
  2. Emit desktop notification (node-notifier) with clear instruction
  3. Display CLI prompt explaining what action is needed
  4. Wait for completion (poll DOM for disappearance or success condition)
  5. Resume automation after human intervention

### 7. Compliance & Safety Guarantees
- **NO CAPTCHA BYPASSES:** Never implement automated CAPTCHA solving
- **NO BOT DETECTION EVASION:** No "undetected" browser modes or stealth plugins
- **EXPLICIT SUBMISSION APPROVAL:** Every final submit requires user confirmation (manual click preferred, or double-confirmation + countdown)
- **RATE LIMITING:** Respect API limits and implement backoff strategies
- **ROBOTS.TXT COMPLIANCE:** Check and honor robots.txt for web scraping
- **AUDIT LOGGING:** Comprehensive logs of all actions, API calls, and user confirmations
- **LOCAL DATA ONLY:** All personal data stored locally in SQLite; never store passwords

## UI/UX Specifications

### Design Style
**Modern CLI tools** (Vercel/Next.js style):
- Clean, colored output with semantic meaning (green = success, yellow = warning, red = error, blue = info)
- Subtle spinners and progress indicators during async operations
- Nice spacing and typography for readability
- Professional and polished appearance

### CLI Output Elements
- Bold headers for sections
- Colored status indicators (✓ ✗ ⚠ ℹ)
- Tables for job listings and data display
- Tree structures for hierarchical information
- Progress bars for long-running operations
- Interactive prompts with clear instructions

### Key UX Priorities
1. **Speed & Efficiency:** Optimize for applying to many jobs quickly
2. **Clear Feedback:** Always show what's happening and what's needed from user
3. **Error Recovery:** Graceful handling with helpful error messages
4. **Low Friction:** Minimal keystrokes for common operations

## Success Criteria

### MVP is successful when:
1. User can onboard and create complete profile in under 15 minutes
2. Tool successfully syncs jobs from at least RSS + one ATS API
3. Human-step detection catches CAPTCHAs 100% of the time and notifies user
4. AI generates relevant, truthful draft answers for top 3 question types
5. User can complete an end-to-end application workflow with tool assistance
6. Audit log captures all significant actions with timestamps
7. No ToS violations or compliance issues occur during testing

### Quality Metrics
- Zero fabricated facts in AI-generated answers
- 100% human-step detection rate for CAPTCHAs/2FA
- Clear error messages with actionable next steps
- Fast job sync (< 30 seconds for typical RSS/API fetch)
- Responsive browser automation (< 3 seconds between steps)

## Constraints & Requirements

### Technical Constraints
- Must run on macOS (primary), with consideration for cross-platform compatibility
- Requires modern Node.js (v18+)
- Requires Chrome/Chromium browser installed
- Requires internet connection for job syncing and AI API calls
- Stores all data locally in SQLite (no cloud dependencies for data)

### Compliance Requirements
- Respect all website ToS and robots.txt
- Never bypass security measures (CAPTCHAs, bot detection, logins)
- Implement proper rate limiting and backoff
- Maintain comprehensive audit logs
- No password storage
- User confirmation required for all submissions

### Performance Requirements
- Job sync: < 30 seconds for typical batch
- AI draft generation: < 5 seconds per answer
- Browser automation: responsive (< 3 second delays between steps)
- Database queries: < 100ms for typical operations
- Desktop notifications: < 1 second latency

### Security Requirements
- TypeScript strict mode enabled
- Input validation at all system boundaries
- Secure storage of API keys (environment variables)
- .env files never committed to git
- No sensitive data in logs
- Sanitize all user inputs before database insertion or browser interaction

## Technical Approach

### Technology Stack
- **Runtime:** Node.js v18+ with TypeScript (strict mode)
- **Browser Automation:** Playwright with persistent user context
- **Database:** SQLite with better-sqlite3
- **CLI Framework:** Commander.js for command parsing
- **Output Formatting:** Chalk for colors, cli-table3 for tables, ora for spinners
- **Notifications:** node-notifier (cross-platform desktop notifications)
- **AI Integration:** Anthropic Claude API (Claude 3.5 Sonnet) or OpenAI GPT-4
- **HTTP Client:** axios for API calls with retry logic
- **RSS Parsing:** rss-parser
- **Configuration:** dotenv for environment variables

### Project Structure
```
job-application-app/
├── src/
│   ├── cli/               # CLI command definitions
│   │   ├── index.ts       # Main CLI entry point
│   │   ├── onboard.ts     # Onboarding wizard
│   │   ├── jobs.ts        # Job management commands
│   │   ├── draft.ts       # Draft answer generation
│   │   └── apply.ts       # Application automation
│   ├── db/                # Database layer
│   │   ├── schema.sql     # SQLite schema
│   │   ├── migrations/    # Database migrations
│   │   └── client.ts      # Database client & queries
│   ├── connectors/        # Job source connectors
│   │   ├── base.ts        # Abstract base connector
│   │   ├── rss.ts         # RSS feed connector
│   │   ├── greenhouse.ts  # Greenhouse ATS API
│   │   └── lever.ts       # Lever ATS API
│   ├── browser/           # Playwright automation
│   │   ├── launcher.ts    # Browser context management
│   │   ├── detector.ts    # Human-step detection
│   │   ├── automator.ts   # Application form automation
│   │   └── notifier.ts    # Desktop notifications
│   ├── ai/                # AI answer generation
│   │   ├── client.ts      # AI API client (Claude/GPT)
│   │   ├── prompts.ts     # Prompt templates
│   │   ├── generator.ts   # Draft answer generator
│   │   └── validator.ts   # Claim checking & validation
│   ├── utils/             # Shared utilities
│   │   ├── logger.ts      # Logging utility
│   │   ├── rate-limit.ts  # Rate limiting
│   │   ├── config.ts      # Configuration management
│   │   └── audit.ts       # Audit log writer
│   └── types/             # TypeScript type definitions
│       └── index.ts
├── tests/                 # Unit and integration tests
├── .env.example           # Environment variable template
├── .gitignore
├── package.json
├── tsconfig.json
├── README.md
└── SPEC.md
```

### Database Schema

#### Tables
1. **sources** - Job source configurations
   - id, name, type (rss|api|html), url, config_json, enabled, last_sync_at, created_at

2. **jobs** - Job postings
   - id, source_id, external_id, url, title, company, location, remote_type, salary, description, posted_at, discovered_at, hash, status

3. **job_runs** - Sync execution history
   - id, source_id, started_at, completed_at, jobs_found, jobs_new, errors

4. **applications** - Application attempts
   - id, job_id, status (queued|in_progress|paused|completed|failed), started_at, completed_at, notes

5. **application_steps** - Step-by-step application log
   - id, application_id, step_type, description, timestamp, metadata_json

6. **qa_pairs** - Application questions and drafted answers
   - id, job_id, question, draft_answers_json, selected_answer, approved_at

7. **user_profile** - User career context
   - id, section (work_history|projects|skills|canonical_answers), content_json, updated_at

8. **documents** - Resumes, cover letters, portfolios
   - id, doc_type, file_path, description, created_at

9. **audit_log** - Comprehensive action logging
   - id, timestamp, action_type, entity_type, entity_id, user_confirmed, metadata_json

### AI Answer Generation Architecture

#### Prompt Engineering Strategy
- **System Prompt:** Establishes role as professional career writer, emphasizes truthfulness, no fabrication
- **Context Injection:**
  - User profile sections relevant to question type
  - Job description and company info
  - Specific question being answered
- **Constraints:** Word count, style preference, required elements
- **Output Format:** JSON with variants, claim_check, and confidence scores

#### Claim Checking Process
1. Parse generated answer for factual claims
2. Match each claim against user profile database
3. Flag claims not found in profile as [NEEDS INPUT]
4. Provide source references for verified claims
5. Calculate confidence score based on claim verification rate

### Human-Step Detection Logic

#### Detection Patterns
```typescript
interface HumanStepDetector {
  detectCaptcha(): boolean;      // Check for CAPTCHA iframes, scripts
  detect2FA(): boolean;          // Check for OTP inputs, verification prompts
  detectFileUpload(): boolean;   // Check for file input fields
  detectConsent(): boolean;      // Check for EEO, consent checkboxes
}
```

#### Notification Flow
1. Detector runs on DOM mutation or periodic interval
2. On detection, pause browser automation
3. Emit desktop notification with specific instruction
4. Show CLI prompt with clear guidance
5. Poll for resolution (element disappears, success state, or timeout)
6. Resume automation or fail gracefully

### Rate Limiting Strategy
- **RSS Feeds:** 1 request per minute per source
- **API Calls:** Respect API-specific limits (typically 100/hour)
- **Web Scraping:** 1 request per 5 seconds with jitter
- **AI API:** Batch requests where possible, implement exponential backoff on rate limit errors

## Implementation Milestones

### Milestone 1: Project Foundation
- Initialize TypeScript project with strict mode
- Set up database schema and migrations
- Create CLI skeleton with Commander.js
- Implement logging and audit system
- Write .env.example and README setup instructions

### Milestone 2: Job Aggregation
- Implement RSS connector with rate limiting
- Implement Greenhouse API connector (or Lever if Greenhouse unavailable)
- Create job normalization and de-duplication logic
- Build `jobs:sync` and `jobs:list` commands
- Add unit tests for connectors and normalization

### Milestone 3: User Profile & Onboarding
- Design onboarding wizard flow
- Implement `copilot onboard` interactive CLI
- Create user profile storage in SQLite
- Support profile updates and exports
- Test onboarding UX with sample data

### Milestone 4: AI Draft Generation
- Set up AI API client (Claude or GPT-4)
- Create prompt templates for top 3 question types
- Implement draft answer generator with variants
- Build claim-checking validator
- Create `copilot draft --job <id>` command
- Test with real job postings and user profile

### Milestone 5: Browser Automation
- Set up Playwright with persistent browser context
- Implement human-step detector (CAPTCHA, 2FA, file upload, consent)
- Create desktop notification system
- Build form automation with pause/resume capability
- Implement `copilot apply --job <id>` command

### Milestone 6: Integration & Testing
- End-to-end workflow testing
- Audit log verification
- Error handling and recovery testing
- Performance optimization
- Documentation and demo video

### Milestone 7: Polish & Refinement
- Rich CLI output (colors, tables, spinners)
- Improved error messages
- Additional question type support
- Enhanced claim checking
- User feedback incorporation

## Verification & Testing

### Manual Testing Checklist
- [ ] Onboard new user profile successfully
- [ ] Sync jobs from RSS feed
- [ ] Sync jobs from at least one ATS API
- [ ] List and filter jobs correctly
- [ ] Queue a job for application
- [ ] Generate draft answers for queued job
- [ ] Verify claim checking flags fabricated facts
- [ ] Open application in browser with Playwright
- [ ] Verify CAPTCHA detection pauses and notifies
- [ ] Complete application with human-in-the-loop workflow
- [ ] Verify audit log captures all steps
- [ ] Confirm no ToS violations during test applications

### Automated Testing
- Unit tests for:
  - Job normalization and de-duplication
  - Human-step detection patterns
  - Prompt template rendering
  - Claim checking logic
  - Rate limiting enforcement
- Integration tests for:
  - Database operations
  - API connector reliability
  - End-to-end command execution

### Performance Testing
- Job sync benchmark (target: <30s for 50 jobs)
- AI draft generation benchmark (target: <5s per answer)
- Database query performance (target: <100ms)
- Browser automation responsiveness

## Quality Standards

### Code Quality
- TypeScript strict mode with no `any` types
- ESLint configuration for code consistency
- Prettier for code formatting
- Comprehensive error handling with typed errors
- Meaningful variable and function names
- Comments for complex logic only

### Documentation
- README.md with clear setup and usage instructions
- SPEC.md (this document) for complete project overview
- Inline JSDoc comments for public APIs
- .env.example with all required variables documented

### Security
- No hardcoded credentials or API keys
- .env in .gitignore
- Input sanitization for all user inputs
- No sensitive data in logs or error messages
- Secure storage of user profile data

---

**Created:** January 9, 2026
**For:** Will Reynoir (@wreynoir)
**Version:** 1.0 - MVP Specification
