/**
 * Desktop notification system
 */

import notifier from 'node-notifier';
import { getConfig } from '../utils/config';
import { logger } from '../utils/logger';
import type { HumanStepType } from '../types';

/**
 * Send desktop notification
 */
export function sendNotification(title: string, message: string, sound = true): void {
  const config = getConfig();

  if (!config.notifications.enabled) {
    logger.debug('Notifications disabled, skipping notification');
    return;
  }

  try {
    notifier.notify({
      title,
      message,
      sound: sound,
      wait: false,
      timeout: 10,
    });

    logger.info('Desktop notification sent', { title, message });
  } catch (error) {
    logger.error('Failed to send desktop notification:', error);
    // Don't throw - notifications are nice-to-have
  }
}

/**
 * Send human-step notification
 */
export function notifyHumanStepDetected(type: HumanStepType, description: string): void {
  const titles: Record<HumanStepType, string> = {
    captcha: '🤖 CAPTCHA Detected',
    '2fa': '🔐 Verification Required',
    file_upload: '📎 File Upload Needed',
    consent: '✅ Consent Required',
    unknown: '⚠️ Action Required',
  };

  const instructions: Record<HumanStepType, string> = {
    captcha: 'Please solve the CAPTCHA in the browser window',
    '2fa': 'Please enter your verification code in the browser',
    file_upload: 'Please upload the required file in the browser',
    consent: 'Please review and check the consent boxes',
    unknown: 'Please complete the required action in the browser',
  };

  const title = titles[type] || titles.unknown;
  const instruction = instructions[type] || instructions.unknown;

  sendNotification(title, `${description}\n\n${instruction}`, true);
}

/**
 * Send application progress notification
 */
export function notifyApplicationProgress(jobTitle: string, company: string, status: string): void {
  sendNotification(
    '📝 Application Progress',
    `${jobTitle} at ${company}\nStatus: ${status}`,
    false
  );
}

/**
 * Send application complete notification
 */
export function notifyApplicationComplete(jobTitle: string, company: string, success: boolean): void {
  const title = success ? '✅ Application Complete' : '❌ Application Failed';
  const message = `${jobTitle} at ${company}`;

  sendNotification(title, message, true);
}
