-- Job Application Copilot Database Schema
-- SQLite Database

-- Job Sources Configuration
CREATE TABLE IF NOT EXISTS sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('rss', 'api', 'html')),
  url TEXT NOT NULL,
  config_json TEXT NOT NULL DEFAULT '{}',
  enabled INTEGER NOT NULL DEFAULT 1,
  last_sync_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sources_enabled ON sources(enabled);
CREATE INDEX IF NOT EXISTS idx_sources_type ON sources(type);

-- Job Postings
CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id INTEGER NOT NULL,
  external_id TEXT,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT,
  remote_type TEXT NOT NULL DEFAULT 'unknown' CHECK(remote_type IN ('remote', 'hybrid', 'onsite', 'unknown')),
  salary TEXT,
  description TEXT,
  posted_at TEXT,
  discovered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new', 'reviewed', 'queued', 'applied', 'rejected', 'archived')),
  FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_jobs_source_id ON jobs(source_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company);
CREATE INDEX IF NOT EXISTS idx_jobs_remote_type ON jobs(remote_type);
CREATE INDEX IF NOT EXISTS idx_jobs_discovered_at ON jobs(discovered_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_source_external ON jobs(source_id, external_id) WHERE external_id IS NOT NULL;

-- Job Sync Run History
CREATE TABLE IF NOT EXISTS job_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id INTEGER NOT NULL,
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  jobs_found INTEGER DEFAULT 0,
  jobs_new INTEGER DEFAULT 0,
  errors TEXT,
  FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_job_runs_source_id ON job_runs(source_id);
CREATE INDEX IF NOT EXISTS idx_job_runs_started_at ON job_runs(started_at DESC);

-- Application Attempts
CREATE TABLE IF NOT EXISTS applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued', 'in_progress', 'paused', 'completed', 'failed')),
  started_at TEXT,
  completed_at TEXT,
  notes TEXT,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_started_at ON applications(started_at DESC);

-- Application Step Log
CREATE TABLE IF NOT EXISTS application_steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER NOT NULL,
  step_type TEXT NOT NULL CHECK(step_type IN ('navigation', 'form_fill', 'human_step_detected', 'human_step_resolved', 'draft_generated', 'answer_inserted', 'submission', 'error')),
  description TEXT NOT NULL,
  timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_application_steps_application_id ON application_steps(application_id);
CREATE INDEX IF NOT EXISTS idx_application_steps_timestamp ON application_steps(timestamp DESC);

-- Question & Answer Pairs
CREATE TABLE IF NOT EXISTS qa_pairs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  question TEXT NOT NULL,
  draft_answers_json TEXT NOT NULL,
  selected_answer TEXT,
  approved_at TEXT,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_qa_pairs_job_id ON qa_pairs(job_id);

-- User Profile
CREATE TABLE IF NOT EXISTS user_profile (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  section TEXT NOT NULL CHECK(section IN ('work_history', 'projects', 'skills', 'canonical_answers')),
  content_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profile_section ON user_profile(section);

-- Documents (Resumes, Cover Letters, etc.)
CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  doc_type TEXT NOT NULL CHECK(doc_type IN ('resume', 'cover_letter', 'portfolio', 'other')),
  file_path TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_documents_doc_type ON documents(doc_type);

-- Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  action_type TEXT NOT NULL CHECK(action_type IN ('job_sync', 'job_queue', 'draft_generate', 'application_start', 'human_step_pause', 'human_step_resume', 'answer_insert', 'submission_confirm', 'submission_cancel', 'profile_create', 'profile_update', 'profile_export')),
  entity_type TEXT NOT NULL CHECK(entity_type IN ('job', 'application', 'source', 'profile')),
  entity_id INTEGER,
  user_confirmed INTEGER NOT NULL DEFAULT 0,
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action_type ON audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
