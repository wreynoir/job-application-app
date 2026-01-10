# 🚀 Job Application Copilot

> **Stop spending hours on job applications. Let AI do the heavy lifting while you stay in control.**

Job hunting is exhausting. Between searching for roles, customizing applications, and filling out endless forms, it's a full-time job just to find a job. **Job Application Copilot** changes that.

Our AI-powered tool automates the tedious parts of job hunting—aggregating listings, generating personalized answers, and filling forms—while keeping you in the driver's seat. Every application gets your approval. Your privacy stays intact. Your data stays local.

---

## ✨ Why Job Application Copilot?

### **Save 10+ Hours Per Week**
Stop copying and pasting the same information into dozens of applications. Let AI draft your answers based on your experience, then review and customize them.

### **Never Miss Great Opportunities**
Automatically aggregate jobs from 55+ sources including LinkedIn (via aggregators), Indeed, Greenhouse, Lever, and more. Smart filtering helps you focus on roles that match your goals.

### **Apply with Confidence**
AI generates 2-3 answer variants for every question—direct, story-based (STAR), and metrics-focused. Choose what fits your style, edit as needed, and submit.

### **100% Privacy-First**
Everything runs locally on your computer. Your resume, experience, and applications never leave your machine. No cloud storage, no data mining, no privacy compromises.

### **Human-in-the-Loop Safety**
This isn't a "set it and forget it" bot. The tool **requires your approval** at every step:
- Review AI-generated answers before inserting them
- Manually complete CAPTCHAs and verification steps
- Explicitly confirm before any application is submitted

---

## 🎯 Perfect For

- **Job seekers** applying to 20+ positions per week
- **Career changers** who need to customize their story for different roles
- **Professionals** who value their time and privacy
- **Anyone** tired of repetitive application tasks

---

## 🌟 Coming Soon: Desktop App (No Command Line Required!)

**We're building a beautiful desktop app** for Windows, Mac, and Linux. You'll get all the power of Job Application Copilot with a friendly point-and-click interface—no terminal required.

👉 **[Join the Waitlist](https://github.com/wreynoir/job-application-app/issues/new?title=Waitlist%3A+Desktop+App)** to be notified when the GUI launches!

---

## 🚦 Current Status: Beta (Command Line)

Right now, Job Application Copilot runs via command line (terminal). This version is **perfect for technical users** and **early adopters** who want to:
- Validate the tool's effectiveness
- Provide feedback to shape the desktop app
- Start automating applications today

**Not technical?** No problem! We're working on the desktop app. Join the waitlist above.

---

## ⚡ Quick Start (For Technical Users)

### Prerequisites
- **Node.js** v18+ ([Download here](https://nodejs.org/))
- **Chrome browser** with [Simplify extension](https://simplify.jobs/) (optional but recommended)
- **AI API key** from [Anthropic](https://anthropic.com/) (Claude API, ~$5-10/month for typical use)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/wreynoir/job-application-app.git
cd job-application-app

# 2. Install dependencies
npm install

# 3. Set up your configuration
cp .env.example .env
# Edit .env with your API key and Chrome profile path

# 4. Build the project
npm run build

# 5. Optional: Make it available globally
npm link
```

### First-Time Setup

```bash
# Create your profile (work history, skills, projects)
npm start -- onboard

# Sync jobs from sources
npm start -- jobs sync

# Browse available jobs
npm start -- jobs list
```

### Daily Usage

```bash
# 1. Sync new jobs
npm start -- jobs sync

# 2. Browse and queue interesting jobs
npm start -- jobs list --remote
npm start -- jobs queue <jobId>

# 3. Generate AI draft answers
npm start -- draft --job <jobId>

# 4. Apply with browser automation
npm start -- apply --job <jobId>
```

---

## 📖 How It Works

### 1. **Create Your Profile Once**
Tell the tool about your work history, projects, skills, and common answers. This takes 10-15 minutes upfront and powers all future applications.

### 2. **Aggregate Jobs Automatically**
The tool pulls jobs from 55+ pre-configured sources:
- **30+ Greenhouse companies**: Anthropic, Vercel, Notion, OpenAI, Stripe, Figma, Discord, and more
- **20+ Lever companies**: Netflix, Shopify, Robinhood, Carta, Cloudflare, GitLab, and more
- **LinkedIn jobs** (via Indeed, Adzuna, and Google Jobs aggregators)
- **Indeed Publisher API**: Tens of thousands of jobs (free)
- **Adzuna API**: Aggregates LinkedIn, Indeed, Monster (1,000 free calls/month)
- **JSearch/Google Jobs**: Includes LinkedIn postings via Google (100 free calls/month)
- **RSS feeds**: RemoteOK, We Work Remotely, AngelList
- Custom sources you add

All jobs are de-duplicated and stored locally for easy browsing.

### 3. **Generate Personalized Answers**
When you're ready to apply, the AI:
- Analyzes the job description and questions
- Generates 2-3 answer variants based on your profile
- Flags any claims it can't verify against your experience
- Lets you edit, approve, or regenerate

### 4. **Apply with Browser Automation**
The tool opens the application in your browser and:
- Detects form fields and custom questions
- Shows you the AI-generated answers for review
- Waits for your approval before inserting text
- **Pauses automatically** for CAPTCHAs, 2FA, file uploads
- Requires your explicit "Submit" confirmation

---

## 🔒 Privacy & Compliance

### Your Data Stays Local
- All profile data, resumes, and answers stored in local SQLite database
- No cloud uploads, no external servers
- You can delete everything with `rm -rf data/`

### Fully Compliant Automation
- **No CAPTCHA bypasses** – Always pauses for human solving
- **No bot detection evasion** – Uses standard browser automation
- **Manual submission required** – You must click "Submit"
- **Rate limiting** – Respects API limits and robots.txt
- **Audit logs** – Track every action for transparency

---

## 📊 Features

### ✅ Current Features (Beta)
- [x] **55+ job sources** including LinkedIn (via aggregators), Indeed, Greenhouse, Lever, RSS feeds
- [x] **LinkedIn access** via Indeed, Adzuna, and Google Jobs APIs (no direct LinkedIn scraping)
- [x] Smart job filtering (remote, company, title, location, salary)
- [x] User profile with work history and projects
- [x] AI-powered answer generation (Claude 3.5 Sonnet)
- [x] Browser automation with Playwright
- [x] Human-step detection (CAPTCHA, 2FA, uploads)
- [x] Desktop notifications for manual steps
- [x] Audit logging and compliance checks
- [x] Local SQLite database

### 🚧 Coming in Desktop App
- [ ] Point-and-click interface (no terminal required)
- [ ] Visual job board with search and filters
- [ ] Resume parser (auto-fill from uploaded resume)
- [ ] Additional job sources and custom integrations
- [ ] Cover letter generation
- [ ] Application tracking dashboard
- [ ] Multi-resume support (tailor by role)
- [ ] Auto-save draft answers
- [ ] Application analytics (acceptance rates, response times)

---

## 🎥 Demo

*Coming soon! We're creating a demo video showing the tool in action.*

---

## 💰 Pricing (Future)

**Current Beta: Free**
Use it for free while we're building the desktop app. Pay only for your Anthropic API usage (~$5-10/month).

**Desktop App Pricing (Planned):**
- **Free Tier:** 10 applications/month
- **Pro Tier:** $19/month – Unlimited applications, premium features
- **Lifetime Access:** $199 one-time – All features, forever

*Pricing subject to change. Early adopters will get grandfathered discounts.*

---

## 🤝 Contributing & Feedback

We'd love your feedback!

- **Feature requests:** [Open an issue](https://github.com/wreynoir/job-application-app/issues/new)
- **Bug reports:** [File a bug](https://github.com/wreynoir/job-application-app/issues/new?template=bug_report.md)
- **Desktop app waitlist:** [Join here](https://github.com/wreynoir/job-application-app/issues/new?title=Waitlist%3A+Desktop+App)

---

## 📚 Documentation

- [Full Specification (SPEC.md)](SPEC.md) – Technical details and architecture
- [Configuration Guide](#configuration) – Setting up your environment
- [Troubleshooting](#troubleshooting) – Common issues and fixes

---

## 🛠️ Configuration

### Environment Variables

Create a `.env` file in the project root:

```bash
# Required: Anthropic Claude API Key
# Get yours at: https://console.anthropic.com/
ANTHROPIC_API_KEY=sk-ant-api03-...

# Required for browser automation: Chrome Profile Path
# Find yours: Open Chrome → chrome://version/ → Copy "Profile Path"
# macOS example:
CHROME_PROFILE_PATH=/Users/YOUR_USERNAME/Library/Application Support/Google/Chrome/Default

# Optional: Job Aggregator API Keys (for LinkedIn access & expanded sources)
# Indeed Publisher API (Free) - Get at: https://publishers.indeed.com/
INDEED_PUBLISHER_ID=

# Adzuna API (Free: 1,000 calls/month) - Get at: https://developer.adzuna.com/
ADZUNA_APP_ID=
ADZUNA_APP_KEY=

# JSearch/Google Jobs API (Free: 100 calls/month) - Get at: https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
JSEARCH_API_KEY=

# Optional: Database location (defaults to ./data/copilot.db)
DB_PATH=./data/copilot.db

# Optional: Log level (debug, info, warn, error)
LOG_LEVEL=info

# Optional: Enable/disable desktop notifications
ENABLE_DESKTOP_NOTIFICATIONS=true
```

### Adding Job Sources

The tool comes pre-configured with 55+ job sources. To enable them:

```bash
# Seed all 55+ pre-configured sources (Greenhouse, Lever, RSS feeds, aggregators)
npm start -- sources seed

# List all available sources
npm start -- sources list

# Add custom Greenhouse company
npm start -- sources add-greenhouse "Company Name" board-token

# Add custom Lever company
npm start -- sources add-lever "Company Name" company-site

# Add custom RSS feed
npm start -- sources add-rss "Feed Name" https://example.com/feed.rss
```

**Note:** Job aggregator sources (Indeed, Adzuna, JSearch) require API keys in your `.env` file. They're free to get but optional - the tool works great with just the company-specific sources!

---

## 🐛 Troubleshooting

### **"Cannot find module" or build errors**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
npm run build
```

### **"ANTHROPIC_API_KEY is not set"**
Make sure you have a `.env` file with your API key. Copy from `.env.example` if needed.

### **Browser automation not working**
1. Verify Chrome profile path in `.env`
2. Install [Simplify extension](https://simplify.jobs/) in Chrome
3. Make sure Chrome isn't running when you start the tool

### **Database errors**
```bash
# Reset database
rm -rf data/
npm start -- onboard  # Re-create profile
```

---

## 📈 Roadmap

### ✅ Phase 1: CLI Beta (Current)
Build and validate core features with technical early adopters.

### 🚧 Phase 2: Desktop App (In Progress)
Beautiful Electron app for Mac, Windows, Linux. No terminal required.

### 🔮 Phase 3: Advanced Features
- LinkedIn/Indeed integration
- Cover letter generation
- Application analytics
- Team features for recruiters

---

## 📄 License

MIT License – See [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

Built with:
- [Anthropic Claude API](https://anthropic.com/) – AI answer generation
- [Playwright](https://playwright.dev/) – Browser automation
- [SQLite](https://sqlite.org/) – Local database
- [Node.js](https://nodejs.org/) – Runtime
- [TypeScript](https://www.typescriptlang.org/) – Type safety

---

## 📬 Stay Updated

⭐ **Star this repo** to follow development
👀 **Watch releases** to get notified of new versions
🔔 **Join the waitlist** for the desktop app

---

**Created by Will Reynoir** | [GitHub](https://github.com/wreynoir) | [Twitter](https://twitter.com/wreynoir)

*Powered by Claude 3.5 Sonnet. Job hunting shouldn't be a full-time job.*
