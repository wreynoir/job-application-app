# Job Application Copilot

> A local-first, privacy-focused CLI tool that intelligently automates job application workflows while maintaining strict compliance and human oversight.

## Overview

Job Application Copilot helps you apply to more jobs efficiently by automating repetitive tasks while keeping you in control. It aggregates job postings, generates personalized application answers using AI, and assists with browser-based form filling - all while ensuring every submission requires your explicit approval.

### Key Features

- **Job Aggregation:** Pull listings from RSS feeds, Greenhouse, Lever, and approved web pages
- **Smart Triage:** Score and filter jobs based on your preferences
- **AI-Powered Drafts:** Generate personalized answers to application questions using your profile
- **Browser Automation:** Playwright-based form filling with human-in-the-loop safety
- **Human-Step Detection:** Automatically pauses for CAPTCHAs, 2FA, and file uploads
- **Compliance First:** No bot detection bypasses, respects ToS, requires explicit submission approval
- **Local & Private:** All data stored locally in SQLite, no cloud dependencies

## Prerequisites

- **Node.js:** v18 or higher
- **Chrome/Chromium:** Installed with [Simplify](https://simplify.jobs/) extension
- **AI API Key:** Anthropic Claude API (recommended) or OpenAI API

## Installation

```bash
# Clone the repository
git clone https://github.com/wreynoir/job-application-app.git
cd job-application-app

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys and Chrome profile path

# Build the project
npm run build

# Optional: Link for global CLI access
npm link
```

## Configuration

### 1. Environment Variables

Edit [.env](.env) file with your settings:

```bash
# Required: AI API Key
ANTHROPIC_API_KEY=your_api_key_here

# Required: Chrome Profile Path
# Find your Chrome profile path:
# macOS: ~/Library/Application Support/Google/Chrome/Default
# Windows: C:\Users\YOUR_USERNAME\AppData\Local\Google\Chrome\User Data\Default
# Linux: ~/.config/google-chrome/Default
CHROME_PROFILE_PATH=/path/to/your/chrome/profile

# Optional: Database path (defaults to ./data/copilot.db)
DB_PATH=./data/copilot.db
```

### 2. Initialize Database

The database will be created automatically on first run. To manually initialize:

```bash
npm run db:migrate
```

## Usage

### First Time Setup

Start by onboarding your profile:

```bash
copilot onboard
```

This interactive wizard will collect:
- Work history and accomplishments
- Key projects (problem → approach → impact)
- Skills, tech stack, and preferences
- Canonical answers to common questions

### Job Management

**Sync jobs from configured sources:**
```bash
copilot jobs:sync
```

**List available jobs:**
```bash
copilot jobs:list

# With filters
copilot jobs:list --remote
copilot jobs:list --company "Acme Corp"
copilot jobs:list --title "Software Engineer"
```

**Queue a job for application:**
```bash
copilot jobs:queue <jobId>
```

**Open job posting in browser:**
```bash
copilot jobs:open <jobId>
```

### Drafting Answers

Generate AI-powered draft answers for application questions:

```bash
copilot draft --job <jobId>
```

This will:
1. Extract questions from the job application
2. Generate 2-3 answer variants (Direct, STAR, Metrics-heavy)
3. Include claim-check to verify facts against your profile
4. Flag any [NEEDS INPUT] where information is missing

### Applying to Jobs

Run the human-in-the-loop application workflow:

```bash
copilot apply --job <jobId>
```

This will:
1. Open application in your browser (with Simplify extension active)
2. Detect custom questions and show AI-generated drafts
3. Request your approval before inserting answers
4. **Pause automatically** when it detects:
   - CAPTCHAs (solve manually, then continue)
   - 2FA/verification (complete verification, then continue)
   - File uploads (upload resume, then continue)
   - Consent forms (review and check boxes, then continue)
5. Require explicit confirmation before final submission

## Project Structure

```
job-application-app/
├── src/
│   ├── cli/          # CLI commands (onboard, jobs, draft, apply)
│   ├── db/           # Database schema and client
│   ├── connectors/   # Job source connectors (RSS, Greenhouse, Lever)
│   ├── browser/      # Playwright automation and human-step detection
│   ├── ai/           # AI answer generation and claim checking
│   ├── utils/        # Logging, rate limiting, config, audit
│   └── types/        # TypeScript type definitions
├── tests/            # Unit and integration tests
├── SPEC.md           # Detailed project specification
└── README.md         # This file
```

## Compliance & Safety

This tool is designed with strict compliance in mind:

- **No CAPTCHA bypasses** - Always pauses for human intervention
- **No bot detection evasion** - Uses standard Playwright with your real Chrome profile
- **Explicit submission approval** - Never submits applications without your confirmation
- **Rate limiting** - Respects API limits and implements backoff strategies
- **Robots.txt compliance** - Honors robots.txt for web scraping
- **Audit logging** - Comprehensive logs of all actions
- **Local data only** - All personal data stored locally; no passwords stored

## Development

```bash
# Development mode with hot reload
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm test:watch

# Lint code
npm run lint

# Format code
npm run format

# Build for production
npm run build
```

## Troubleshooting

### Chrome Profile Not Found
Ensure `CHROME_PROFILE_PATH` in [.env](.env) points to your Chrome profile directory. Find it by:
- Chrome → `chrome://version/` → Look for "Profile Path"

### API Rate Limits
Adjust rate limiting in [.env](.env):
```bash
RATE_LIMIT_RSS=1        # Requests per minute
RATE_LIMIT_API=100      # Requests per hour
RATE_LIMIT_WEB=12       # Requests per minute
```

### Database Issues
Reset the database:
```bash
rm data/copilot.db
npm run db:migrate
```

## Roadmap

See [SPEC.md](SPEC.md) for detailed implementation milestones.

- [x] Milestone 1: Project Foundation
- [ ] Milestone 2: Job Aggregation
- [ ] Milestone 3: User Profile & Onboarding
- [ ] Milestone 4: AI Draft Generation
- [ ] Milestone 5: Browser Automation
- [ ] Milestone 6: Integration & Testing
- [ ] Milestone 7: Polish & Refinement

## Contributing

This is currently a personal project. If you'd like to contribute, please open an issue first to discuss proposed changes.

## License

MIT License - see LICENSE file for details

---

**Created by:** Will Reynoir (@wreynoir)
**Powered by:** Claude 3.5 Sonnet, Playwright, SQLite
