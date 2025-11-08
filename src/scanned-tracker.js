// Scanned Email Tracker - Tracks ALL emails that have been scanned (not just confirmations)
// This prevents re-scanning emails that were already checked, saving AI tokens and API calls

class ScannedTracker {
  constructor() {
    this.storageKey = 'scannedEmailIds';
  }

  /**
   * Get all scanned email IDs from storage
   * @returns {Promise<Set>} Set of email message IDs
   */
  async getScannedIds() {
    try {
      const result = await chrome.storage.local.get(this.storageKey);
      const ids = result[this.storageKey] || [];
      return new Set(ids);
    } catch (error) {
      console.error('Error reading scanned IDs:', error);
      return new Set();
    }
  }

  /**
   * Mark emails as scanned
   * @param {Array<string>} messageIds - Array of email message IDs
   * @returns {Promise<void>}
   */
  async markAsScanned(messageIds) {
    try {
      const scannedIds = await this.getScannedIds();

      // Add new IDs
      messageIds.forEach(id => scannedIds.add(id));

      // Store back (convert Set to Array for storage)
      await chrome.storage.local.set({
        [this.storageKey]: Array.from(scannedIds)
      });

      console.log(`Marked ${messageIds.length} emails as scanned. Total scanned: ${scannedIds.size}`);
    } catch (error) {
      console.error('Error marking emails as scanned:', error);
      throw error;
    }
  }

  /**
   * Check if an email has been scanned
   * @param {string} messageId - Email message ID
   * @returns {Promise<boolean>}
   */
  async isScanned(messageId) {
    const scannedIds = await this.getScannedIds();
    return scannedIds.has(messageId);
  }

  /**
   * Get count of scanned emails
   * @returns {Promise<number>}
   */
  async getScannedCount() {
    const scannedIds = await this.getScannedIds();
    return scannedIds.size;
  }

  /**
   * Clear all scanned email tracking (use with caution)
   * @returns {Promise<void>}
   */
  async clearAll() {
    try {
      await chrome.storage.local.remove(this.storageKey);
      console.log('Cleared all scanned email tracking');
    } catch (error) {
      console.error('Error clearing scanned tracking:', error);
      throw error;
    }
  }

  /**
   * Remove specific email IDs from tracking
   * @param {Array<string>} messageIds - IDs to remove
   * @returns {Promise<void>}
   */
  async removeIds(messageIds) {
    try {
      const scannedIds = await this.getScannedIds();

      messageIds.forEach(id => scannedIds.delete(id));

      await chrome.storage.local.set({
        [this.storageKey]: Array.from(scannedIds)
      });

      console.log(`Removed ${messageIds.length} emails from scanned tracking`);
    } catch (error) {
      console.error('Error removing IDs:', error);
      throw error;
    }
  }

  /**
   * Get statistics about scanned emails
   * @returns {Promise<Object>}
   */
  async getStats() {
    const scannedIds = await this.getScannedIds();

    return {
      totalScanned: scannedIds.size,
      storageKey: this.storageKey
    };
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ScannedTracker;
}
