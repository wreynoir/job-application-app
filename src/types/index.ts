/**
 * Core type definitions for Job Application Copilot
 */

// Job Source Types
export type SourceType = 'rss' | 'api' | 'html';

export interface JobSource {
  id: number;
  name: string;
  type: SourceType;
  url: string;
  config: Record<string, unknown>;
  enabled: boolean;
  lastSyncAt: Date | null;
  createdAt: Date;
}

// Job Types
export type RemoteType = 'remote' | 'hybrid' | 'onsite' | 'unknown';
export type JobStatus = 'new' | 'reviewed' | 'queued' | 'applied' | 'rejected' | 'archived';

export interface Job {
  id: number;
  sourceId: number;
  externalId: string | null;
  url: string;
  title: string;
  company: string;
  location: string | null;
  remoteType: RemoteType;
  salary: string | null;
  description: string | null;
  postedAt: Date | null;
  discoveredAt: Date;
  hash: string;
  status: JobStatus;
}

// Application Types
export type ApplicationStatus = 'queued' | 'in_progress' | 'paused' | 'completed' | 'failed';

export interface Application {
  id: number;
  jobId: number;
  status: ApplicationStatus;
  startedAt: Date | null;
  completedAt: Date | null;
  notes: string | null;
}

export type StepType =
  | 'navigation'
  | 'form_fill'
  | 'human_step_detected'
  | 'human_step_resolved'
  | 'draft_generated'
  | 'answer_inserted'
  | 'submission'
  | 'error';

export interface ApplicationStep {
  id: number;
  applicationId: number;
  stepType: StepType;
  description: string;
  timestamp: Date;
  metadata: Record<string, unknown>;
}

// Q&A Types
export type AnswerVariant = 'direct' | 'star' | 'metrics';

export interface DraftAnswer {
  variant: AnswerVariant;
  content: string;
  wordCount: number;
  claimCheck: ClaimCheck;
}

export interface ClaimCheck {
  claims: Claim[];
  confidenceScore: number;
  needsInput: string[];
}

export interface Claim {
  text: string;
  source: 'profile' | 'job' | 'unknown';
  verified: boolean;
  profileSection?: string;
}

export interface QAPair {
  id: number;
  jobId: number;
  question: string;
  draftAnswers: DraftAnswer[];
  selectedAnswer: string | null;
  approvedAt: Date | null;
}

// User Profile Types
export type ProfileSection = 'work_history' | 'projects' | 'skills' | 'canonical_answers';

export interface UserProfile {
  id: number;
  section: ProfileSection;
  content: Record<string, unknown>;
  updatedAt: Date;
}

export interface WorkHistoryEntry {
  company: string;
  title: string;
  startDate: string;
  endDate: string | null;
  current: boolean;
  accomplishments: AccomplishmentEntry[];
  technologies: string[];
}

export interface AccomplishmentEntry {
  description: string;
  situation?: string;
  task?: string;
  action?: string;
  result?: string;
  metrics?: string[];
}

export interface ProjectEntry {
  name: string;
  description: string;
  problem: string;
  approach: string;
  impact: string;
  technologies: string[];
  url?: string;
}

export interface SkillsEntry {
  category: string;
  skills: string[];
  proficiency?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

export interface CanonicalAnswer {
  questionType: string;
  answer: string;
  variants?: Record<string, string>;
}

// Document Types
export type DocumentType = 'resume' | 'cover_letter' | 'portfolio' | 'other';

export interface Document {
  id: number;
  docType: DocumentType;
  filePath: string;
  description: string | null;
  createdAt: Date;
}

// Audit Log Types
export type ActionType =
  | 'job_sync'
  | 'job_queue'
  | 'draft_generate'
  | 'application_start'
  | 'human_step_pause'
  | 'human_step_resume'
  | 'answer_insert'
  | 'submission_confirm'
  | 'submission_cancel'
  | 'profile_create'
  | 'profile_update'
  | 'profile_export';

export type EntityType = 'job' | 'application' | 'source' | 'profile';

export interface AuditLog {
  id: number;
  timestamp: Date;
  actionType: ActionType;
  entityType: EntityType;
  entityId: number | null;
  userConfirmed: boolean;
  metadata: Record<string, unknown>;
}

// Human Step Detection Types
export type HumanStepType = 'captcha' | '2fa' | 'file_upload' | 'consent' | 'unknown';

export interface HumanStep {
  type: HumanStepType;
  description: string;
  detected: boolean;
  resolved: boolean;
  detectedAt: Date;
  resolvedAt: Date | null;
}

// AI Generation Types
export interface GenerationRequest {
  jobId: number;
  question: string;
  questionType: string;
  wordLimit: number;
  style: 'concise' | 'detailed' | 'story';
}

export interface GenerationResponse {
  variants: DraftAnswer[];
  processingTime: number;
  tokensUsed: number;
}

// CLI Types
export interface CLIOptions {
  verbose?: boolean;
  debug?: boolean;
  quiet?: boolean;
}

export interface JobListOptions extends CLIOptions {
  filter?: string;
  status?: JobStatus;
  remote?: boolean;
  company?: string;
  title?: string;
  limit?: number;
}

export interface ApplyOptions extends CLIOptions {
  jobId: number;
  skipDrafts?: boolean;
  autoResume?: boolean;
}

// Configuration Types
export interface AppConfig {
  aiProvider: 'anthropic' | 'openai';
  aiModel: string;
  dbPath: string;
  chromeProfilePath: string;
  rateLimits: {
    rss: number;
    api: number;
    web: number;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    file?: string;
  };
  notifications: {
    enabled: boolean;
  };
}

// Error Types
export class CopilotError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'CopilotError';
  }
}

export class RateLimitError extends CopilotError {
  constructor(message: string, public retryAfter: number) {
    super(message, 'RATE_LIMIT_EXCEEDED', { retryAfter });
    this.name = 'RateLimitError';
  }
}

export class HumanStepRequiredError extends CopilotError {
  constructor(message: string, public stepType: HumanStepType) {
    super(message, 'HUMAN_STEP_REQUIRED', { stepType });
    this.name = 'HumanStepRequiredError';
  }
}
