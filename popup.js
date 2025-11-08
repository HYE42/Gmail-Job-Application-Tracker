// UI Elements
const elements = {
  aiProviderSelect: document.getElementById('ai-provider-select'),
  openaiKey: document.getElementById('openai-key'),
  geminiKey: document.getElementById('gemini-key'),
  claudeKey: document.getElementById('claude-key'),
  deepseekKey: document.getElementById('deepseek-key'),
  timePeriod: document.getElementById('time-period'),
  emailLimit: document.getElementById('email-limit'),
  processEmailsBtn: document.getElementById('process-emails-btn'),
  authenticateGmailBtn: document.getElementById('authenticate-gmail-btn'),
  statusSection: document.getElementById('status-section'),
  spinner: document.getElementById('spinner'),
  statusMessage: document.getElementById('status-message'),
  resultsSummary: document.getElementById('results-summary'),
  emailsScanned: document.getElementById('emails-scanned'),
  confirmationsFound: document.getElementById('confirmations-found'),
  newRecords: document.getElementById('new-records'),
  duplicatesSkipped: document.getElementById('duplicates-skipped'),
  errorsCount: document.getElementById('errors-count'),
  openCsvBtn: document.getElementById('open-csv-btn'),
  stopProcessingBtn: document.getElementById('stop-processing-btn'),
  emailDetailsSection: document.getElementById('email-details-section'),
  emailDetailsContainer: document.getElementById('email-details-container'),
  errorSection: document.getElementById('error-section'),
  errorMessage: document.getElementById('error-message'),
  totalScanned: document.getElementById('total-scanned'),
  clearScannedBtn: document.getElementById('clear-scanned-btn'),
  connectedAccount: document.getElementById('connected-account'),
  notConnected: document.getElementById('not-connected'),
  userEmail: document.getElementById('user-email'),
  disconnectBtn: document.getElementById('disconnect-btn')
};

// Global flag to track if processing should be stopped
let shouldStopProcessing = false;

// Load saved settings on popup open
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  updateVisibleApiKeyField(); // Show only the relevant API key field
  checkAuthStatus();
  await loadLastResults();
  await loadScannedStats();
  await checkProcessingState(); // Check if processing is ongoing
});

// Load settings from Chrome storage
async function loadSettings() {
  try {
    const settings = await chrome.storage.local.get([
      'activeProvider',
      'openaiKey',
      'geminiKey',
      'claudeKey',
      'deepseekKey',
      'timePeriod',
      'emailLimit'
    ]);

    if (settings.activeProvider) {
      elements.aiProviderSelect.value = settings.activeProvider;
    }
    if (settings.openaiKey) {
      elements.openaiKey.value = settings.openaiKey;
    }
    if (settings.geminiKey) {
      elements.geminiKey.value = settings.geminiKey;
    }
    if (settings.claudeKey) {
      elements.claudeKey.value = settings.claudeKey;
    }
    if (settings.deepseekKey) {
      elements.deepseekKey.value = settings.deepseekKey;
    }
    if (settings.timePeriod) {
      elements.timePeriod.value = settings.timePeriod;
    }
    if (settings.emailLimit) {
      elements.emailLimit.value = settings.emailLimit;
    }
  } catch (error) {
    showError('Failed to load settings: ' + error.message);
  }
}

// Save settings to Chrome storage
async function saveSettings() {
  try {
    const settings = {
      activeProvider: elements.aiProviderSelect.value,
      openaiKey: elements.openaiKey.value.trim(),
      geminiKey: elements.geminiKey.value.trim(),
      claudeKey: elements.claudeKey.value.trim(),
      deepseekKey: elements.deepseekKey.value.trim(),
      timePeriod: elements.timePeriod.value,
      emailLimit: parseInt(elements.emailLimit.value)
    };

    await chrome.storage.local.set(settings);
    return true;
  } catch (error) {
    showError('Failed to save settings: ' + error.message);
    return false;
  }
}

// Function to update visible API key field based on selected provider
function updateVisibleApiKeyField() {
  const selectedProvider = elements.aiProviderSelect.value;
  const allApiKeyFields = document.querySelectorAll('.api-key-field');

  allApiKeyFields.forEach(field => {
    const provider = field.getAttribute('data-provider');
    if (provider === selectedProvider) {
      field.style.display = 'block';
    } else {
      field.style.display = 'none';
    }
  });
}

// Auto-save when AI provider changes
elements.aiProviderSelect.addEventListener('change', async () => {
  updateVisibleApiKeyField();
  await chrome.storage.local.set({ activeProvider: elements.aiProviderSelect.value });
});

// Auto-save when API keys change
elements.openaiKey.addEventListener('input', async () => {
  await chrome.storage.local.set({ openaiKey: elements.openaiKey.value.trim() });
});

elements.geminiKey.addEventListener('input', async () => {
  await chrome.storage.local.set({ geminiKey: elements.geminiKey.value.trim() });
});

elements.claudeKey.addEventListener('input', async () => {
  await chrome.storage.local.set({ claudeKey: elements.claudeKey.value.trim() });
});

elements.deepseekKey.addEventListener('input', async () => {
  await chrome.storage.local.set({ deepseekKey: elements.deepseekKey.value.trim() });
});

// Auto-save scan settings when they change (already handled above)
elements.timePeriod.addEventListener('change', async () => {
  await chrome.storage.local.set({ timePeriod: elements.timePeriod.value });
});

elements.emailLimit.addEventListener('change', async () => {
  await chrome.storage.local.set({ emailLimit: parseInt(elements.emailLimit.value) });
});

// Check Gmail authentication status
async function checkAuthStatus() {
  try {
    const result = await chrome.storage.local.get(['gmailAuthenticated', 'userEmail']);

    if (result.gmailAuthenticated) {
      // Show connected
      elements.connectedAccount.style.display = 'block';
      elements.notConnected.style.display = 'none';
      elements.userEmail.textContent = result.userEmail || 'Gmail Connected';
    } else {
      // Show not connected
      elements.connectedAccount.style.display = 'none';
      elements.notConnected.style.display = 'block';
    }
  } catch (error) {
    console.error('Error checking auth status:', error);
    elements.connectedAccount.style.display = 'none';
    elements.notConnected.style.display = 'block';
  }
}

// Check if processing is currently ongoing
async function checkProcessingState() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'checkProcessingState' });
    if (response.isProcessing) {
      // Show processing UI
      elements.processEmailsBtn.disabled = true;
      elements.processEmailsBtn.textContent = 'Processing...';
      elements.statusSection.style.display = 'block';
      elements.spinner.style.display = 'block';
      elements.stopProcessingBtn.style.display = 'inline-block';
      elements.stopProcessingBtn.disabled = false;
      elements.stopProcessingBtn.textContent = 'Stop Processing';
      elements.statusMessage.textContent = 'Processing in progress...';
    }
  } catch (error) {
    console.error('Error checking processing state:', error);
  }
}

// Authenticate with Gmail - Use Chrome's native account picker
elements.authenticateGmailBtn.addEventListener('click', async () => {
  try {
    elements.authenticateGmailBtn.disabled = true;
    elements.authenticateGmailBtn.textContent = 'Authenticating...';

    // Direct authentication - Chrome will show native account picker
    const response = await chrome.runtime.sendMessage({ action: 'authenticate' });

    if (response.success) {
      // Update UI to show connected with actual email
      elements.connectedAccount.style.display = 'block';
      elements.notConnected.style.display = 'none';
      elements.userEmail.textContent = response.email;

      showStatus('Gmail authentication successful! Connected as: ' + response.email);
    } else {
      showError('Authentication failed: ' + response.error);
      elements.authenticateGmailBtn.disabled = false;
      elements.authenticateGmailBtn.textContent = 'Connect Gmail Account';
    }
  } catch (error) {
    showError('Authentication error: ' + error.message);
    elements.authenticateGmailBtn.disabled = false;
    elements.authenticateGmailBtn.textContent = 'Connect Gmail Account';
  }
});

// Disconnect Gmail
elements.disconnectBtn.addEventListener('click', async () => {
  try {
    if (!confirm('Are you sure you want to disconnect your Gmail account? This will not delete your saved application data.')) {
      return;
    }

    // Revoke the token to force account selection on next login
    await chrome.runtime.sendMessage({ action: 'revokeToken' });

    // Clear the auth flag and email
    await chrome.storage.local.set({ gmailAuthenticated: false, userEmail: '' });

    // Update UI to show not connected
    elements.connectedAccount.style.display = 'none';
    elements.notConnected.style.display = 'block';

    // Make sure the connect button is enabled and has correct text
    elements.authenticateGmailBtn.disabled = false;
    elements.authenticateGmailBtn.textContent = 'Connect Gmail Account';

    showStatus('Gmail account disconnected successfully!');
  } catch (error) {
    showError('Disconnect error: ' + error.message);
  }
});

// Process emails
elements.processEmailsBtn.addEventListener('click', async () => {
  try {
    // Hide previous results and errors
    elements.errorSection.style.display = 'none';
    elements.resultsSummary.style.display = 'none';
    elements.emailDetailsSection.style.display = 'none';

    // Validate settings
    const settings = await chrome.storage.local.get([
      'activeProvider',
      'openaiKey',
      'geminiKey',
      'claudeKey',
      'deepseekKey'
    ]);

    const provider = settings.activeProvider || 'openai';
    const apiKey = settings[`${provider}Key`];

    if (!apiKey || apiKey.trim() === '') {
      showError(`Please configure API key for ${provider.toUpperCase()} in settings.`);
      return;
    }

    // Reset stop flag
    shouldStopProcessing = false;

    // Disable button and show processing state
    elements.processEmailsBtn.disabled = true;
    elements.processEmailsBtn.textContent = 'Processing...';
    elements.statusSection.style.display = 'block';
    elements.spinner.style.display = 'block';
    elements.stopProcessingBtn.style.display = 'inline-block';
    elements.statusMessage.textContent = 'Starting email processing...';

    // Send message to background script to start processing
    const response = await chrome.runtime.sendMessage({
      action: 'processEmails',
      settings: {
        provider,
        apiKey,
        timePeriod: parseInt(elements.timePeriod.value),
        emailLimit: parseInt(elements.emailLimit.value)
      }
    });

    // Hide spinner and stop button
    elements.spinner.style.display = 'none';
    elements.stopProcessingBtn.style.display = 'none';

    if (response.success) {
      // Show results
      if (response.stopped) {
        elements.statusMessage.textContent = 'Processing stopped by user. Partial results shown below.';
      } else {
        elements.statusMessage.textContent = 'Processing complete!';
      }

      elements.resultsSummary.style.display = 'block';
      elements.emailsScanned.textContent = response.results.emailsScanned;
      elements.confirmationsFound.textContent = response.results.confirmationsFound;
      elements.newRecords.textContent = response.results.newRecords;
      elements.duplicatesSkipped.textContent = response.results.duplicatesSkipped;
      elements.errorsCount.textContent = response.results.errors;

      // Display email details
      if (response.results.emailDetails && response.results.emailDetails.length > 0) {
        displayEmailDetails(response.results.emailDetails);
      }

      // Save results to storage so they persist when popup closes
      await chrome.storage.local.set({
        lastResults: response.results,
        lastProcessedTime: new Date().toISOString()
      });

      // Refresh scanned email statistics
      await loadScannedStats();
    } else {
      showError('Processing failed: ' + response.error);
    }

    // Re-enable button
    elements.processEmailsBtn.disabled = false;
    elements.processEmailsBtn.textContent = 'Process Emails';

  } catch (error) {
    elements.spinner.style.display = 'none';
    elements.stopProcessingBtn.style.display = 'none';
    elements.processEmailsBtn.disabled = false;
    elements.processEmailsBtn.textContent = 'Process Emails';
    showError('Error processing emails: ' + error.message);
  }
});

// Stop processing
elements.stopProcessingBtn.addEventListener('click', async () => {
  try {
    shouldStopProcessing = true;
    elements.stopProcessingBtn.disabled = true;
    elements.stopProcessingBtn.textContent = 'Stopping...';

    // Send stop message to background
    await chrome.runtime.sendMessage({ action: 'stopProcessing' });

    elements.statusMessage.textContent = 'Processing stopped by user';
    elements.spinner.style.display = 'none';
    elements.stopProcessingBtn.style.display = 'none';
    elements.processEmailsBtn.disabled = false;
    elements.processEmailsBtn.textContent = 'Process Emails';
  } catch (error) {
    console.error('Error stopping processing:', error);
    elements.stopProcessingBtn.disabled = false;
    elements.stopProcessingBtn.textContent = 'Stop Processing';
  }
});

// Open CSV file
elements.openCsvBtn.addEventListener('click', async () => {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'openCSV' });
    if (response.success) {
      // Don't clear the results, just show a success message briefly
      const originalText = elements.statusMessage.textContent;
      elements.statusMessage.textContent = 'CSV file downloaded!';
      setTimeout(() => {
        elements.statusMessage.textContent = originalText;
      }, 2000);
    } else {
      showError('Failed to open CSV: ' + response.error);
    }
  } catch (error) {
    showError('Error opening CSV: ' + error.message);
  }
});

// Listen for progress updates from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'progress') {
    elements.statusMessage.textContent = message.message;
  }
});

// Helper functions
function showStatus(message) {
  elements.statusSection.style.display = 'block';
  elements.statusMessage.textContent = message;
  elements.errorSection.style.display = 'none';
}

function showError(message) {
  elements.errorSection.style.display = 'block';
  elements.errorMessage.textContent = message;
  // Don't hide status section, just show error above it
}

// Load last results from storage
async function loadLastResults() {
  try {
    const result = await chrome.storage.local.get(['lastResults', 'lastProcessedTime']);

    if (result.lastResults) {
      // Show the last results
      elements.statusSection.style.display = 'block';
      elements.resultsSummary.style.display = 'block';

      const lastTime = result.lastProcessedTime ?
        new Date(result.lastProcessedTime).toLocaleString() : 'Unknown';

      elements.statusMessage.textContent = `Last processed: ${lastTime}`;
      elements.emailsScanned.textContent = result.lastResults.emailsScanned;
      elements.confirmationsFound.textContent = result.lastResults.confirmationsFound;
      elements.newRecords.textContent = result.lastResults.newRecords;
      elements.duplicatesSkipped.textContent = result.lastResults.duplicatesSkipped;
      elements.errorsCount.textContent = result.lastResults.errors;

      // Display email details if available
      if (result.lastResults.emailDetails && result.lastResults.emailDetails.length > 0) {
        displayEmailDetails(result.lastResults.emailDetails);
      }
    }
  } catch (error) {
    console.error('Error loading last results:', error);
  }
}

// Display email details in a formatted table
function displayEmailDetails(emailDetails) {
  elements.emailDetailsSection.style.display = 'block';
  elements.emailDetailsContainer.innerHTML = '';

  // Store reference to the actual container (don't overwrite it)
  let tableContainer = elements.emailDetailsContainer;

  // Add collapsible header if many emails
  if (emailDetails.length > 10) {
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'btn btn-secondary';
    toggleBtn.textContent = 'Show/Hide Email Details';
    toggleBtn.style.marginBottom = '10px';
    toggleBtn.style.width = 'auto';
    toggleBtn.style.padding = '5px 15px';

    const tableWrapper = document.createElement('div');
    tableWrapper.id = 'email-table-wrapper';
    tableWrapper.style.display = 'none';

    toggleBtn.addEventListener('click', () => {
      tableWrapper.style.display = tableWrapper.style.display === 'none' ? 'block' : 'none';
    });

    elements.emailDetailsContainer.appendChild(toggleBtn);
    elements.emailDetailsContainer.appendChild(tableWrapper);

    // Use the wrapper as the container for the table
    tableContainer = tableWrapper;
  }

  // Create a table
  const table = document.createElement('table');
  table.className = 'email-details-table';

  // Create header
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  ['#', 'Subject', 'From', 'Status', 'Details'].forEach(text => {
    const th = document.createElement('th');
    th.textContent = text;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Create body
  const tbody = document.createElement('tbody');

  // Determine which emails to display
  let emailsToDisplay = emailDetails;
  let showEllipsis = false;

  if (emailDetails.length > 6) {
    // Show first 3 and last 3
    const first3 = emailDetails.slice(0, 3);
    const last3 = emailDetails.slice(-3);
    emailsToDisplay = [...first3, ...last3];
    showEllipsis = true;
  }

  let ellipsisInserted = false;

  emailsToDisplay.forEach((email, arrayIndex) => {
    // Insert ellipsis row after first 3 items if needed
    if (showEllipsis && arrayIndex === 3 && !ellipsisInserted) {
      const ellipsisRow = document.createElement('tr');
      ellipsisRow.className = 'ellipsis-row';
      const ellipsisCell = document.createElement('td');
      ellipsisCell.colSpan = 5;
      ellipsisCell.textContent = `... (${emailDetails.length - 6} more records) ...`;
      ellipsisCell.style.textAlign = 'center';
      ellipsisCell.style.fontStyle = 'italic';
      ellipsisCell.style.color = '#666';
      ellipsisRow.appendChild(ellipsisCell);
      tbody.appendChild(ellipsisRow);
      ellipsisInserted = true;
    }

    const row = document.createElement('tr');
    row.className = email.isConfirmation ? 'confirmation-row' : 'skipped-row';

    // Email number
    const numCell = document.createElement('td');
    numCell.textContent = email.index;
    row.appendChild(numCell);

    // Subject
    const subjectCell = document.createElement('td');
    subjectCell.textContent = email.subject.substring(0, 50) + (email.subject.length > 50 ? '...' : '');
    subjectCell.title = email.subject; // Show full subject on hover
    row.appendChild(subjectCell);

    // From
    const fromCell = document.createElement('td');
    fromCell.textContent = email.from.substring(0, 30) + (email.from.length > 30 ? '...' : '');
    fromCell.title = email.from; // Show full email on hover
    row.appendChild(fromCell);

    // Status
    const statusCell = document.createElement('td');
    statusCell.textContent = email.status;
    statusCell.className = email.isConfirmation ? 'status-success' : 'status-skipped';
    row.appendChild(statusCell);

    // Details
    const detailsCell = document.createElement('td');
    if (email.extracted) {
      detailsCell.innerHTML = `
        <strong>Company:</strong> ${email.extracted.company}<br>
        <strong>Position:</strong> ${email.extracted.position}<br>
        <strong>Date:</strong> ${email.extracted.application_date}
      `;
      detailsCell.className = 'details-extracted';
    } else if (email.error) {
      detailsCell.textContent = email.error;
      detailsCell.className = 'details-error';
    } else {
      detailsCell.textContent = '-';
    }
    row.appendChild(detailsCell);

    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  tableContainer.appendChild(table);
}

// Load scanned email statistics
async function loadScannedStats() {
  try {
    const result = await chrome.storage.local.get('scannedEmailIds');
    const scannedIds = result.scannedEmailIds || [];
    elements.totalScanned.textContent = scannedIds.length;
  } catch (error) {
    console.error('Error loading scanned stats:', error);
    elements.totalScanned.textContent = 'Error';
  }
}

// Clear scanned email history
elements.clearScannedBtn.addEventListener('click', async () => {
  if (!confirm('Are you sure you want to clear all scanned email history? This will cause all emails to be re-scanned on the next run, consuming AI tokens again.')) {
    return;
  }

  try {
    await chrome.storage.local.remove('scannedEmailIds');
    elements.totalScanned.textContent = '0';
    alert('Scanned email history cleared successfully!');
  } catch (error) {
    console.error('Error clearing scanned history:', error);
    showError('Failed to clear scanned history: ' + error.message);
  }
});
