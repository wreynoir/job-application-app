/**
 * Human-step detection system
 * Detects CAPTCHAs, 2FA, file uploads, and other steps requiring human intervention
 */

import type { Page } from 'playwright';
import { logger } from '../utils/logger';
import type { HumanStepType } from '../types';

export interface DetectionResult {
  detected: boolean;
  type: HumanStepType;
  description: string;
  element?: string;
}

/**
 * Detect if human intervention is required
 */
export async function detectHumanStep(page: Page): Promise<DetectionResult | null> {
  // Check for CAPTCHAs first (most common)
  const captchaResult = await detectCaptcha(page);
  if (captchaResult.detected) {
    return captchaResult;
  }

  // Check for 2FA/verification
  const twoFAResult = await detect2FA(page);
  if (twoFAResult.detected) {
    return twoFAResult;
  }

  // Check for file uploads
  const fileUploadResult = await detectFileUpload(page);
  if (fileUploadResult.detected) {
    return fileUploadResult;
  }

  // Check for consent forms
  const consentResult = await detectConsent(page);
  if (consentResult.detected) {
    return consentResult;
  }

  return null;
}

/**
 * Detect CAPTCHA challenges
 */
async function detectCaptcha(page: Page): Promise<DetectionResult> {
  try {
    // Check for reCAPTCHA
    const recaptchaFrame = page.frameLocator('iframe[src*="recaptcha"]').first();
    const recaptchaVisible = await recaptchaFrame.locator('body').count().catch(() => 0);

    if (recaptchaVisible > 0) {
      logger.info('reCAPTCHA detected');
      return {
        detected: true,
        type: 'captcha',
        description: 'reCAPTCHA verification required',
        element: 'iframe[src*="recaptcha"]',
      };
    }

    // Check for hCaptcha
    const hcaptchaFrame = page.frameLocator('iframe[src*="hcaptcha"]').first();
    const hcaptchaVisible = await hcaptchaFrame.locator('body').count().catch(() => 0);

    if (hcaptchaVisible > 0) {
      logger.info('hCaptcha detected');
      return {
        detected: true,
        type: 'captcha',
        description: 'hCaptcha verification required',
        element: 'iframe[src*="hcaptcha"]',
      };
    }

    // Check for text-based CAPTCHA indicators
    const captchaKeywords = [
      'text*="I\'m not a robot"',
      'text*="Verify you are human"',
      'text*="Complete the CAPTCHA"',
      'text*="Security check"',
      '[class*="captcha" i]',
      '[id*="captcha" i]',
    ];

    for (const selector of captchaKeywords) {
      const count = await page.locator(selector).count().catch(() => 0);
      if (count > 0) {
        logger.info(`CAPTCHA detected via selector: ${selector}`);
        return {
          detected: true,
          type: 'captcha',
          description: 'CAPTCHA verification required',
          element: selector,
        };
      }
    }

    return { detected: false, type: 'captcha', description: '' };
  } catch (error) {
    logger.error('Error detecting CAPTCHA:', error);
    return { detected: false, type: 'captcha', description: '' };
  }
}

/**
 * Detect 2FA/verification prompts
 */
async function detect2FA(page: Page): Promise<DetectionResult> {
  try {
    const twoFAKeywords = [
      'text*="verification code"',
      'text*="Enter the code"',
      'text*="Two-factor authentication"',
      'text*="2FA"',
      'text*="authenticator"',
      'text*="security code"',
      'input[type="text"][autocomplete*="one-time"]',
      'input[placeholder*="code" i]',
      'input[placeholder*="OTP" i]',
    ];

    for (const selector of twoFAKeywords) {
      const count = await page.locator(selector).count().catch(() => 0);
      if (count > 0) {
        logger.info(`2FA/verification detected via selector: ${selector}`);
        return {
          detected: true,
          type: '2fa',
          description: 'Two-factor authentication or verification code required',
          element: selector,
        };
      }
    }

    return { detected: false, type: '2fa', description: '' };
  } catch (error) {
    logger.error('Error detecting 2FA:', error);
    return { detected: false, type: '2fa', description: '' };
  }
}

/**
 * Detect file upload requirements
 */
async function detectFileUpload(page: Page): Promise<DetectionResult> {
  try {
    // Look for visible file inputs that might need manual interaction
    const fileInputs = await page.locator('input[type="file"]:visible').count().catch(() => 0);

    if (fileInputs > 0) {
      // Check if it's asking for resume/CV
      const uploadLabels = [
        'text*="Upload resume"',
        'text*="Upload CV"',
        'text*="Attach resume"',
        'text*="Choose file"',
      ];

      for (const selector of uploadLabels) {
        const count = await page.locator(selector).count().catch(() => 0);
        if (count > 0) {
          logger.info(`File upload detected via selector: ${selector}`);
          return {
            detected: true,
            type: 'file_upload',
            description: 'File upload required (resume/CV or document)',
            element: selector,
          };
        }
      }
    }

    return { detected: false, type: 'file_upload', description: '' };
  } catch (error) {
    logger.error('Error detecting file upload:', error);
    return { detected: false, type: 'file_upload', description: '' };
  }
}

/**
 * Detect consent/EEO forms requiring manual review
 */
async function detectConsent(page: Page): Promise<DetectionResult> {
  try {
    const consentKeywords = [
      'text*="Equal Employment Opportunity"',
      'text*="EEO"',
      'text*="Voluntary Self-Identification"',
      'text*="Demographics"',
      'text*="I consent to"',
      'text*="I agree to"',
      'text*="Terms and Conditions"',
      'text*="Privacy Policy"',
    ];

    for (const selector of consentKeywords) {
      const count = await page.locator(selector).count().catch(() => 0);
      if (count > 0) {
        // Check if there are unchecked checkboxes nearby
        const checkboxes = await page
          .locator('input[type="checkbox"]:not(:checked)')
          .count()
          .catch(() => 0);

        if (checkboxes > 0) {
          logger.info(`Consent form detected via selector: ${selector}`);
          return {
            detected: true,
            type: 'consent',
            description: 'Consent or EEO form requires review and confirmation',
            element: selector,
          };
        }
      }
    }

    return { detected: false, type: 'consent', description: '' };
  } catch (error) {
    logger.error('Error detecting consent:', error);
    return { detected: false, type: 'consent', description: '' };
  }
}

/**
 * Wait for human step to be resolved
 */
export async function waitForHumanStepResolution(
  page: Page,
  detectionResult: DetectionResult,
  timeoutMs = 300000 // 5 minutes
): Promise<boolean> {
  logger.info('Waiting for human step resolution', {
    type: detectionResult.type,
    timeout: timeoutMs,
  });

  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    // Re-check if the human step is still present
    const currentResult = await detectHumanStep(page);

    if (!currentResult || currentResult.type !== detectionResult.type) {
      logger.info('Human step resolved');
      return true;
    }

    // Wait a bit before checking again
    await page.waitForTimeout(2000);
  }

  logger.warn('Timeout waiting for human step resolution');
  return false;
}
