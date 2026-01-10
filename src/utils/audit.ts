/**
 * Audit logging utility
 */

import { addAuditLog } from '../db/client';
import { logger } from './logger';
import type { ActionType, EntityType } from '../types';

/**
 * Log an auditable action
 */
export function audit(
  actionType: ActionType,
  entityType: EntityType,
  entityId: number | null,
  userConfirmed: boolean,
  metadata: Record<string, unknown> = {}
): void {
  try {
    addAuditLog(actionType, entityType, entityId, userConfirmed, metadata);
    logger.info(`Audit: ${actionType} on ${entityType}${entityId ? ` #${entityId}` : ''}`, {
      userConfirmed,
      ...metadata,
    });
  } catch (error) {
    logger.error('Failed to write audit log', { error, actionType, entityType, entityId });
  }
}
