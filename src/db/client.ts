/**
 * Database client and query functions
 */

import Database from 'better-sqlite3';
import { getConfig } from '../utils/config';
import fs from 'fs';
import path from 'path';
import type {
  JobSource,
  Job,
  Application,
  ApplicationStep,
  AuditLog,
  SourceType,
  RemoteType,
  JobStatus,
  ApplicationStatus,
  StepType,
  ProfileSection,
  ActionType,
  EntityType,
} from '../types';

let dbInstance: Database.Database | null = null;

/**
 * Get database instance (singleton)
 */
export function getDatabase(): Database.Database {
  if (!dbInstance) {
    const config = getConfig();
    const dbPath = config.dbPath;

    // Ensure data directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    dbInstance = new Database(dbPath);
    dbInstance.pragma('journal_mode = WAL');
    dbInstance.pragma('foreign_keys = ON');
  }

  return dbInstance;
}

/**
 * Initialize database with schema
 */
export function initializeDatabase(): void {
  const db = getDatabase();
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');

  db.exec(schema);
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

// ==================== Job Sources ====================

export function createSource(
  name: string,
  type: SourceType,
  url: string,
  config: Record<string, unknown> = {}
): JobSource {
  const db = getDatabase();
  const stmt = db.prepare(
    'INSERT INTO sources (name, type, url, config_json) VALUES (?, ?, ?, ?)'
  );
  const result = stmt.run(name, type, url, JSON.stringify(config));

  return getSourceById(Number(result.lastInsertRowid))!;
}

export function getSourceById(id: number): JobSource | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM sources WHERE id = ?');
  const row = stmt.get(id) as any;

  return row ? mapSourceFromDb(row) : null;
}

export function getAllSources(enabledOnly = false): JobSource[] {
  const db = getDatabase();
  const sql = enabledOnly
    ? 'SELECT * FROM sources WHERE enabled = 1 ORDER BY name'
    : 'SELECT * FROM sources ORDER BY name';
  const stmt = db.prepare(sql);
  const rows = stmt.all() as any[];

  return rows.map(mapSourceFromDb);
}

export function updateSourceLastSync(id: number): void {
  const db = getDatabase();
  const stmt = db.prepare('UPDATE sources SET last_sync_at = CURRENT_TIMESTAMP WHERE id = ?');
  stmt.run(id);
}

// ==================== Jobs ====================

export function createJob(job: Omit<Job, 'id' | 'discoveredAt'>): Job {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO jobs (
      source_id, external_id, url, title, company, location,
      remote_type, salary, description, posted_at, hash, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    job.sourceId,
    job.externalId,
    job.url,
    job.title,
    job.company,
    job.location,
    job.remoteType,
    job.salary,
    job.description,
    job.postedAt?.toISOString(),
    job.hash,
    job.status
  );

  return getJobById(Number(result.lastInsertRowid))!;
}

export function getJobById(id: number): Job | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM jobs WHERE id = ?');
  const row = stmt.get(id) as any;

  return row ? mapJobFromDb(row) : null;
}

export function getJobByHash(hash: string): Job | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM jobs WHERE hash = ?');
  const row = stmt.get(hash) as any;

  return row ? mapJobFromDb(row) : null;
}

export function getAllJobs(filters: {
  status?: JobStatus;
  remote?: boolean;
  company?: string;
  title?: string;
  limit?: number;
} = {}): Job[] {
  const db = getDatabase();
  let sql = 'SELECT * FROM jobs WHERE 1=1';
  const params: any[] = [];

  if (filters.status) {
    sql += ' AND status = ?';
    params.push(filters.status);
  }

  if (filters.remote) {
    sql += ' AND remote_type = ?';
    params.push('remote');
  }

  if (filters.company) {
    sql += ' AND company LIKE ?';
    params.push(`%${filters.company}%`);
  }

  if (filters.title) {
    sql += ' AND title LIKE ?';
    params.push(`%${filters.title}%`);
  }

  sql += ' ORDER BY discovered_at DESC';

  if (filters.limit) {
    sql += ' LIMIT ?';
    params.push(filters.limit);
  }

  const stmt = db.prepare(sql);
  const rows = stmt.all(...params) as any[];

  return rows.map(mapJobFromDb);
}

export function updateJobStatus(id: number, status: JobStatus): void {
  const db = getDatabase();
  const stmt = db.prepare('UPDATE jobs SET status = ? WHERE id = ?');
  stmt.run(status, id);
}

// ==================== Applications ====================

export function createApplication(jobId: number, notes?: string): Application {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO applications (job_id, status, notes)
    VALUES (?, 'queued', ?)
  `);

  const result = stmt.run(jobId, notes || null);
  return getApplicationById(Number(result.lastInsertRowid))!;
}

export function getApplicationById(id: number): Application | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM applications WHERE id = ?');
  const row = stmt.get(id) as any;

  return row ? mapApplicationFromDb(row) : null;
}

export function getApplicationByJobId(jobId: number): Application | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM applications WHERE job_id = ? ORDER BY id DESC LIMIT 1');
  const row = stmt.get(jobId) as any;

  return row ? mapApplicationFromDb(row) : null;
}

export function updateApplicationStatus(id: number, status: ApplicationStatus): void {
  const db = getDatabase();
  const updates: string[] = ['status = ?'];
  const params: any[] = [status];

  if (status === 'in_progress' || status === 'paused') {
    updates.push('started_at = COALESCE(started_at, CURRENT_TIMESTAMP)');
  } else if (status === 'completed' || status === 'failed') {
    updates.push('completed_at = CURRENT_TIMESTAMP');
  }

  const stmt = db.prepare(`UPDATE applications SET ${updates.join(', ')} WHERE id = ?`);
  stmt.run(...params, id);
}

// ==================== Application Steps ====================

export function addApplicationStep(
  applicationId: number,
  stepType: StepType,
  description: string,
  metadata: Record<string, unknown> = {}
): ApplicationStep {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO application_steps (application_id, step_type, description, metadata_json)
    VALUES (?, ?, ?, ?)
  `);

  const result = stmt.run(applicationId, stepType, description, JSON.stringify(metadata));

  const row = db.prepare('SELECT * FROM application_steps WHERE id = ?').get(result.lastInsertRowid) as any;
  return mapApplicationStepFromDb(row);
}

// ==================== Audit Log ====================

export function addAuditLog(
  actionType: ActionType,
  entityType: EntityType,
  entityId: number | null,
  userConfirmed: boolean,
  metadata: Record<string, unknown> = {}
): AuditLog {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO audit_log (action_type, entity_type, entity_id, user_confirmed, metadata_json)
    VALUES (?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    actionType,
    entityType,
    entityId,
    userConfirmed ? 1 : 0,
    JSON.stringify(metadata)
  );

  const row = db.prepare('SELECT * FROM audit_log WHERE id = ?').get(result.lastInsertRowid) as any;
  return mapAuditLogFromDb(row);
}

// ==================== User Profile ====================

export function upsertUserProfile(section: ProfileSection, content: Record<string, unknown>): void {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO user_profile (section, content_json, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(section) DO UPDATE SET
      content_json = excluded.content_json,
      updated_at = CURRENT_TIMESTAMP
  `);

  stmt.run(section, JSON.stringify(content));
}

export function getUserProfile(section: ProfileSection): Record<string, unknown> | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT content_json FROM user_profile WHERE section = ?');
  const row = stmt.get(section) as any;

  return row ? JSON.parse(row.content_json) : null;
}

// ==================== Mapping Functions ====================

function mapSourceFromDb(row: any): JobSource {
  return {
    id: row.id,
    name: row.name,
    type: row.type as SourceType,
    url: row.url,
    config: JSON.parse(row.config_json),
    enabled: Boolean(row.enabled),
    lastSyncAt: row.last_sync_at ? new Date(row.last_sync_at) : null,
    createdAt: new Date(row.created_at),
  };
}

function mapJobFromDb(row: any): Job {
  return {
    id: row.id,
    sourceId: row.source_id,
    externalId: row.external_id,
    url: row.url,
    title: row.title,
    company: row.company,
    location: row.location,
    remoteType: row.remote_type as RemoteType,
    salary: row.salary,
    description: row.description,
    postedAt: row.posted_at ? new Date(row.posted_at) : null,
    discoveredAt: new Date(row.discovered_at),
    hash: row.hash,
    status: row.status as JobStatus,
  };
}

function mapApplicationFromDb(row: any): Application {
  return {
    id: row.id,
    jobId: row.job_id,
    status: row.status as ApplicationStatus,
    startedAt: row.started_at ? new Date(row.started_at) : null,
    completedAt: row.completed_at ? new Date(row.completed_at) : null,
    notes: row.notes,
  };
}

function mapApplicationStepFromDb(row: any): ApplicationStep {
  return {
    id: row.id,
    applicationId: row.application_id,
    stepType: row.step_type as StepType,
    description: row.description,
    timestamp: new Date(row.timestamp),
    metadata: JSON.parse(row.metadata_json),
  };
}

function mapAuditLogFromDb(row: any): AuditLog {
  return {
    id: row.id,
    timestamp: new Date(row.timestamp),
    actionType: row.action_type as ActionType,
    entityType: row.entity_type as EntityType,
    entityId: row.entity_id,
    userConfirmed: Boolean(row.user_confirmed),
    metadata: JSON.parse(row.metadata_json),
  };
}
