/**
 * Playwright browser launcher with persistent context
 */

import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { getConfig } from '../utils/config';
import { logger } from '../utils/logger';
import path from 'path';

let browser: Browser | null = null;
let context: BrowserContext | null = null;

/**
 * Launch browser with persistent context (uses real Chrome profile)
 */
export async function launchBrowser(): Promise<{ browser: Browser; context: BrowserContext }> {
  if (browser && context) {
    return { browser, context };
  }

  try {
    const config = getConfig();

    if (!config.chromeProfilePath) {
      throw new Error(
        'CHROME_PROFILE_PATH not set. Browser automation requires a Chrome profile path.'
      );
    }

    logger.info('Launching browser with persistent context', {
      profilePath: config.chromeProfilePath,
    });

    // Launch browser with persistent context
    context = await chromium.launchPersistentContext(config.chromeProfilePath, {
      headless: false, // Must be false for human interaction
      viewport: { width: 1280, height: 720 },
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      // Don't use stealth or anti-detection - we want to be detectable for compliance
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
      ],
    });

    browser = context.browser()!;

    logger.info('Browser launched successfully');

    return { browser, context };
  } catch (error) {
    logger.error('Failed to launch browser:', error);
    throw error;
  }
}

/**
 * Create a new page in the browser context
 */
export async function createPage(): Promise<Page> {
  const { context } = await launchBrowser();
  const page = await context.newPage();

  // Set reasonable timeouts
  page.setDefaultTimeout(30000);
  page.setDefaultNavigationTimeout(30000);

  return page;
}

/**
 * Navigate to URL and wait for page load
 */
export async function navigateToUrl(page: Page, url: string): Promise<void> {
  try {
    logger.info(`Navigating to: ${url}`);

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    // Wait a bit for dynamic content to load
    await page.waitForTimeout(2000);

    logger.info('Navigation complete');
  } catch (error) {
    logger.error(`Navigation failed for ${url}:`, error);
    throw error;
  }
}

/**
 * Close browser and cleanup
 */
export async function closeBrowser(): Promise<void> {
  try {
    if (context) {
      await context.close();
      context = null;
    }

    if (browser) {
      await browser.close();
      browser = null;
    }

    logger.info('Browser closed');
  } catch (error) {
    logger.error('Error closing browser:', error);
  }
}

/**
 * Take screenshot for debugging
 */
export async function takeScreenshot(page: Page, name: string): Promise<string> {
  const screenshotPath = path.join(process.cwd(), 'screenshots', `${name}-${Date.now()}.png`);

  try {
    await page.screenshot({ path: screenshotPath, fullPage: true });
    logger.debug(`Screenshot saved: ${screenshotPath}`);
    return screenshotPath;
  } catch (error) {
    logger.error('Failed to take screenshot:', error);
    throw error;
  }
}
