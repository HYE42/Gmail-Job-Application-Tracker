// Background Service Worker - Orchestrates the entire workflow

// Import required classes
importScripts(
  'src/config-manager.js',
  'src/gmail-client.js',
  'src/ai-provider.js',
  'src/email-processor.js',
  'src/csv-manager.js',
  'src/scanned-tracker.js'
);

// Initialize managers
const configManager = new ConfigManager();
const gmailClient = new GmailClient();
const csvManager = new CSVManager();
const scannedTracker = new ScannedTracker();

// Global flag to track if processing should be stopped
let shouldStopProcessing = false;

// Global flag to track if processing is currently running
let isProcessing = false;

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'authenticate') {
    handleAuthentication(sendResponse);
    return true; // Will respond asynchronously
  }

  if (message.action === 'revokeToken') {
    handleRevokeToken(sendResponse);
    return true; // Will respond asynchronously
  }

  if (message.action === 'processEmails') {
    handleProcessEmails(message.settings, sendResponse);
    return true; // Will respond asynchronously
  }

  if (message.action === 'stopProcessing') {
    shouldStopProcessing = true;
    sendResponse({ success: true });
    return true;
  }

  if (message.action === 'checkProcessingState') {
    sendResponse({ isProcessing: isProcessing });
    return true;
  }

  if (message.action === 'openCSV') {
    handleOpenCSV(sendResponse);
    return true; // Will respond asynchronously
  }
});

/**
 * Handle Gmail authentication
 * @param {Function} sendResponse - Response callback
 */
async function handleAuthentication(sendResponse) {
  try {
    // Chrome will show native account picker if multiple accounts are available
    await gmailClient.authenticate();

    // Get user email and store it
    const userEmail = await gmailClient.getUserEmail();
    await configManager.saveSetting('gmailAuthenticated', true);
    await configManager.saveSetting('userEmail', userEmail);

    sendResponse({ success: true, email: userEmail });
  } catch (error) {
    console.error('Authentication error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle token revocation (for disconnect)
 * @param {Function} sendResponse - Response callback
 */
async function handleRevokeToken(sendResponse) {
  try {
    const success = await gmailClient.revokeToken();
    sendResponse({ success: success });
  } catch (error) {
    console.error('Revoke token error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle email processing workflow
 * @param {Object} settings - Processing settings
 * @param {Function} sendResponse - Response callback
 */
async function handleProcessEmails(settings, sendResponse) {
  try {
    // Set processing flag
    isProcessing = true;

    // Reset stop flag at the start of processing
    shouldStopProcessing = false;

    // Send progress update to popup
    const sendProgress = (message) => {
      chrome.runtime.sendMessage({ type: 'progress', message });
    };

    sendProgress('Initializing...');

    // Step 1: Authenticate with Gmail if needed
    sendProgress('Authenticating with Gmail...');
    const token = await gmailClient.getAccessToken();

    if (!token) {
      throw new Error('Gmail authentication required');
    }

    // Step 2: Get settings
    const config = await configManager.getSettings();
    const checkpoint = await configManager.getCheckpoint();

    // Step 3: Fetch emails
    sendProgress('Fetching emails from Gmail...');

    // Get already scanned email IDs first
    const scannedIds = await scannedTracker.getScannedIds();

    // Fetch more emails than requested to account for already-scanned ones
    // This allows us to get "deeper" into the inbox on subsequent runs
    const requestedLimit = settings.emailLimit || config.emailLimit;
    const fetchLimit = Math.min(requestedLimit + scannedIds.size, 500); // Cap at Gmail API limit

    const emails = await gmailClient.fetchEmails({
      timePeriod: settings.timePeriod || config.timePeriod,
      maxResults: fetchLimit,
      checkpoint: null // Don't use checkpoint for filtering, we'll filter by scanned IDs instead
    });

    if (emails.length === 0) {
      sendResponse({
        success: true,
        results: {
          emailsScanned: 0,
          confirmationsFound: 0,
          newRecords: 0,
          duplicatesSkipped: 0,
          errors: 0
        }
      });
      return;
    }

    sendProgress(`Found ${emails.length} emails. Filtering already scanned emails...`);

    // Step 4: Filter out already scanned emails and limit to requested amount
    const unscannedEmails = emails
      .filter(email => !scannedIds.has(email.messageId))
      .slice(0, requestedLimit); // Only process the requested number

    const alreadyScanned = emails.length - (emails.filter(email => !scannedIds.has(email.messageId)).length);

    if (unscannedEmails.length === 0) {
      sendResponse({
        success: true,
        results: {
          emailsScanned: 0,
          confirmationsFound: 0,
          newRecords: 0,
          duplicatesSkipped: alreadyScanned,
          errors: 0,
          emailDetails: [],
          message: `All ${emails.length} emails in the time period have already been scanned. Try increasing the time period or clearing scan history.`
        }
      });
      return;
    }

    sendProgress(`Processing ${unscannedEmails.length} new emails (${alreadyScanned} already scanned)...`);

    // Step 5: Initialize AI Provider
    const aiProvider = new AIProvider(settings.provider, settings.apiKey);

    // Step 6: Process emails
    const emailProcessor = new EmailProcessor(aiProvider);

    const records = await emailProcessor.processEmails(
      unscannedEmails,
      (progress) => {
        sendProgress(progress.message);
      },
      () => shouldStopProcessing // Pass stop check function
    );

    const stats = emailProcessor.getStats();
    const emailDetails = emailProcessor.getEmailDetails();

    // Check if processing was stopped
    if (shouldStopProcessing) {
      sendProgress('Processing stopped by user. Saving partial results...');
    }

    // Mark all processed emails as scanned (even if they weren't confirmations)
    // Only mark the ones we actually processed (up to the point we stopped)
    const processedIds = emailDetails.map((_, idx) => unscannedEmails[idx].messageId).filter(id => id);
    if (processedIds.length > 0) {
      await scannedTracker.markAsScanned(processedIds);
      console.log(`Marked ${processedIds.length} emails as scanned`);
    }

    // Step 7: Check for duplicates in CSV (for confirmed applications only)
    const existingIds = await csvManager.getExistingMessageIds();
    const newRecords = records.filter(record => !existingIds.has(record.message_id));
    const csvDuplicates = records.length - newRecords.length;

    // Step 8: Save records to CSV
    if (newRecords.length > 0) {
      sendProgress(`Saving ${newRecords.length} new applications to CSV...`);
      const result = await csvManager.addRecords(newRecords);

      sendProgress('Updating checkpoint...');

      // Update checkpoint with the latest email date
      if (emails.length > 0) {
        const latestEmail = emails.reduce((latest, email) => {
          return new Date(email.date) > new Date(latest.date) ? email : latest;
        });
        await configManager.updateCheckpoint(latestEmail.date);
      }

      sendResponse({
        success: true,
        stopped: shouldStopProcessing,
        results: {
          emailsScanned: stats.emailsScanned,
          confirmationsFound: stats.confirmationsFound,
          newRecords: newRecords.length,
          duplicatesSkipped: alreadyScanned + csvDuplicates,
          errors: stats.errors,
          emailDetails: emailDetails,
          message: shouldStopProcessing ? 'Processing stopped by user. Partial results saved.' : null
        }
      });
    } else {
      sendResponse({
        success: true,
        stopped: shouldStopProcessing,
        results: {
          emailsScanned: stats.emailsScanned,
          confirmationsFound: stats.confirmationsFound,
          newRecords: 0,
          duplicatesSkipped: alreadyScanned + csvDuplicates,
          errors: stats.errors,
          emailDetails: emailDetails,
          message: shouldStopProcessing ? 'Processing stopped by user. Partial results saved.' : null
        }
      });
    }

  } catch (error) {
    console.error('Processing error:', error);
    sendResponse({ success: false, error: error.message });
  } finally {
    // Clear processing flag when done (success or error)
    isProcessing = false;
  }
}

/**
 * Handle opening CSV file
 * @param {Function} sendResponse - Response callback
 */
async function handleOpenCSV(sendResponse) {
  try {
    // Read current records and trigger download
    const records = await csvManager.readCSV();

    if (records.length === 0) {
      sendResponse({
        success: false,
        error: 'No records found. Process some emails first.'
      });
      return;
    }

    await csvManager.exportAsDownload(records);

    sendResponse({ success: true });
  } catch (error) {
    console.error('Error opening CSV:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Extension installation handler
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Extension installed');
    // Initialize default settings
    configManager.saveSettings(configManager.defaultSettings);
  } else if (details.reason === 'update') {
    console.log('Extension updated');
  }
});

// Keep service worker alive
chrome.runtime.onStartup.addListener(() => {
  console.log('Extension started');
});
