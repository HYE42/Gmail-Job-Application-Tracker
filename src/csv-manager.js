// CSV Manager - Handles CSV file operations for job application records

class CSVManager {
  constructor() {
    this.filename = 'job_applications.csv';
    this.headers = ['email_date', 'company', 'position', 'email_title', 'processed_timestamp', 'message_id'];
    this.fileHandle = null;
  }

  /**
   * Format ISO timestamp to readable format (MM-DD-YYYY HH:MM:SS)
   * @param {string} isoTimestamp - ISO formatted timestamp
   * @returns {string} Formatted timestamp
   */
  formatTimestamp(isoTimestamp) {
    if (!isoTimestamp) return '';

    try {
      const date = new Date(isoTimestamp);

      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const year = date.getFullYear();

      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');

      return `${month}-${day}-${year} ${hours}:${minutes}:${seconds}`;
    } catch (error) {
      console.error('Failed to format timestamp:', error);
      return isoTimestamp;
    }
  }

  /**
   * Read existing CSV records from Chrome storage
   * @returns {Promise<Array>} Array of record objects
   */
  async readCSV() {
    try {
      // Read records from Chrome storage
      const result = await chrome.storage.local.get(['csvRecords']);
      return result.csvRecords || [];
    } catch (error) {
      console.error('Error reading CSV records:', error);
      return [];
    }
  }

  /**
   * Parse CSV content to array of objects
   * @param {string} content - CSV content
   * @returns {Array} Array of record objects
   */
  parseCSV(content) {
    if (!content || content.trim() === '') {
      return [];
    }

    const lines = content.trim().split('\n');

    if (lines.length <= 1) {
      return []; // Only header or empty
    }

    // Skip header row
    const dataLines = lines.slice(1);
    const records = [];

    for (const line of dataLines) {
      if (!line.trim()) continue;

      const values = this.parseCSVLine(line);

      if (values.length === this.headers.length) {
        const record = {};
        this.headers.forEach((header, index) => {
          record[header] = values[index];
        });
        records.push(record);
      }
    }

    return records;
  }

  /**
   * Parse a single CSV line (handles quoted values)
   * @param {string} line - CSV line
   * @returns {Array} Array of values
   */
  parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"' && inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else if (char === '"') {
        // Toggle quotes
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        // End of value
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    // Add last value
    values.push(current);

    return values;
  }

  /**
   * Convert record to CSV line
   * @param {Object} record - Record object
   * @returns {string} CSV line
   */
  recordToCSVLine(record) {
    const values = this.headers.map(header => {
      let value = record[header] || '';

      // Format timestamps to readable format
      if ((header === 'email_date' || header === 'processed_timestamp') && value) {
        value = this.formatTimestamp(value);
      }

      // Escape quotes and wrap in quotes if contains comma or quote
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        value = '"' + value.replace(/"/g, '""') + '"';
      }
      return value;
    });
    return values.join(',');
  }

  /**
   * Write records to Chrome storage
   * @param {Array} records - Array of record objects
   * @returns {Promise<boolean>} Success status
   */
  async writeCSV(records) {
    try {
      // Save records to Chrome storage
      await chrome.storage.local.set({ csvRecords: records });
      console.log(`Saved ${records.length} records to storage`);
      return true;
    } catch (error) {
      console.error('Error writing CSV records:', error);
      throw new Error('Failed to write CSV records: ' + error.message);
    }
  }

  /**
   * Add new records to existing CSV
   * @param {Array} newRecords - Array of new record objects
   * @returns {Promise<Object>} Result with counts
   */
  async addRecords(newRecords) {
    try {
      // Read existing records
      const existingRecords = await this.readCSV();

      // Create set of existing message IDs for fast lookup
      const existingIds = new Set(existingRecords.map(r => r.message_id));

      // Filter out duplicates
      const uniqueNewRecords = newRecords.filter(record => !existingIds.has(record.message_id));

      // Combine records
      const allRecords = [...existingRecords, ...uniqueNewRecords];

      // Write back to file
      await this.writeCSV(allRecords);

      return {
        success: true,
        total: allRecords.length,
        added: uniqueNewRecords.length,
        duplicatesSkipped: newRecords.length - uniqueNewRecords.length
      };
    } catch (error) {
      console.error('Error adding records:', error);
      throw new Error('Failed to add records: ' + error.message);
    }
  }

  /**
   * Get or create file handle using File System Access API
   * @returns {Promise<FileSystemFileHandle>} File handle
   */
  async getOrCreateFileHandle() {
    // Try to get stored handle first
    const storedHandle = await this.getStoredFileHandle();

    if (storedHandle) {
      // Verify we still have permission
      const permission = await storedHandle.queryPermission({ mode: 'readwrite' });
      if (permission === 'granted') {
        return storedHandle;
      }
    }

    // Need to request new file handle
    try {
      // Show save file picker
      const handle = await window.showSaveFilePicker({
        suggestedName: this.filename,
        types: [{
          description: 'CSV Files',
          accept: { 'text/csv': ['.csv'] }
        }]
      });

      // Store handle for future use
      await this.storeFileHandle(handle);

      return handle;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('File selection cancelled');
      }
      throw error;
    }
  }

  /**
   * Store file handle in IndexedDB (Chrome extension compatible)
   * @param {FileSystemFileHandle} handle - File handle
   */
  async storeFileHandle(handle) {
    try {
      // For Chrome extensions, we'll use chrome.storage.local to store a reference
      // Note: FileSystemFileHandle cannot be directly stored, so we use a workaround
      this.fileHandle = handle;

      // Store filename preference
      await chrome.storage.local.set({
        csvFileSelected: true,
        csvFileName: this.filename
      });
    } catch (error) {
      console.error('Error storing file handle:', error);
    }
  }

  /**
   * Get stored file handle
   * @returns {Promise<FileSystemFileHandle|null>} File handle or null
   */
  async getStoredFileHandle() {
    try {
      // Check if we have a cached handle
      if (this.fileHandle) {
        return this.fileHandle;
      }

      // Check storage for reference
      const result = await chrome.storage.local.get(['csvFileSelected']);
      if (!result.csvFileSelected) {
        return null;
      }

      // If we had a handle but lost it (extension restart), return null
      // User will need to select file again
      return null;
    } catch (error) {
      console.error('Error getting stored file handle:', error);
      return null;
    }
  }

  /**
   * Export CSV as downloadable file
   * Uses consistent filename so browser replaces previous version
   * @param {Array} records - Array of record objects
   * @returns {Promise<string>} Download URL
   */
  async exportAsDownload(records) {
    try {
      // Add UTF-8 BOM to ensure proper encoding
      const BOM = '\uFEFF';

      // Create CSV content
      let content = BOM + this.headers.join(',') + '\n';
      for (const record of records) {
        content += this.recordToCSVLine(record) + '\n';
      }

      // Use data URL instead of blob URL (works in service worker context)
      // Properly encode UTF-8 content to base64
      const utf8Bytes = new TextEncoder().encode(content);

      // Convert Uint8Array to base64 using a proper method for binary data
      let binaryString = '';
      for (let i = 0; i < utf8Bytes.length; i++) {
        binaryString += String.fromCharCode(utf8Bytes[i]);
      }
      const base64Content = btoa(binaryString);

      // Specify UTF-8 charset in the data URL
      const dataUrl = `data:text/csv;charset=utf-8;base64,${base64Content}`;

      // Use consistent filename (no timestamp) so it updates the same file
      const filename = 'job_applications.csv';

      // Use Chrome downloads API with overwrite option
      return new Promise((resolve, reject) => {
        chrome.downloads.download({
          url: dataUrl,
          filename: filename,
          conflictAction: 'overwrite', // Always overwrite existing file
          saveAs: false // Don't prompt, auto-download to Downloads folder
        }, (downloadId) => {
          if (chrome.runtime.lastError) {
            console.error('Download error:', chrome.runtime.lastError);
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            console.log(`CSV downloaded with ID: ${downloadId}, filename: ${filename}`);
            resolve(dataUrl);
          }
        });
      });
    } catch (error) {
      console.error('Error exporting CSV:', error);
      throw new Error('Failed to export CSV: ' + error.message);
    }
  }

  /**
   * Check if record already exists by message_id
   * @param {string} messageId - Gmail message ID
   * @returns {Promise<boolean>} True if exists
   */
  async recordExists(messageId) {
    const records = await this.readCSV();
    return records.some(r => r.message_id === messageId);
  }

  /**
   * Get all existing message IDs
   * @returns {Promise<Set>} Set of message IDs
   */
  async getExistingMessageIds() {
    const records = await this.readCSV();
    return new Set(records.map(r => r.message_id));
  }

  /**
   * Get CSV file path or prompt user to select
   * @returns {Promise<string>} File path
   */
  async getFilePath() {
    const result = await chrome.storage.local.get(['csvFilePath']);
    if (result.csvFilePath) {
      return result.csvFilePath;
    }

    // Prompt user to select location
    return null;
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CSVManager;
}
