// Email Processor - Orchestrates email categorization and information extraction

class EmailProcessor {
  constructor(aiProvider) {
    this.aiProvider = aiProvider;
    this.stats = {
      emailsScanned: 0,
      confirmationsFound: 0,
      successfulExtractions: 0,
      errors: 0
    };
    this.emailDetails = [];
  }

  /**
   * Process a batch of emails
   * @param {Array} emails - Array of email objects
   * @param {Function} progressCallback - Callback for progress updates
   * @param {Function} shouldStopCallback - Callback to check if processing should stop
   * @returns {Promise<Array>} Array of extracted application records
   */
  async processEmails(emails, progressCallback = null, shouldStopCallback = null) {
    const records = [];
    this.resetStats();
    this.emailDetails = []; // Store detailed info about each email

    for (let i = 0; i < emails.length; i++) {
      // Check if processing should stop
      if (shouldStopCallback && shouldStopCallback()) {
        console.log('Processing stopped by user');
        break;
      }

      const email = emails[i];
      const emailInfo = {
        index: i + 1,
        subject: email.subject,
        from: email.from,
        date: email.date,
        isConfirmation: false,
        extracted: null,
        error: null
      };

      try {
        // Update progress
        if (progressCallback) {
          progressCallback({
            current: i + 1,
            total: emails.length,
            message: `Processing email ${i + 1} of ${emails.length}: "${email.subject.substring(0, 50)}..."`,
            emailDetails: emailInfo
          });
        }

        this.stats.emailsScanned++;

        // Step 1: Categorize email
        console.log(`[${i + 1}/${emails.length}] Categorizing: "${email.subject}"`);
        console.log(`  From: ${email.from}`);
        console.log(`  Date: ${email.date}`);

        const isJobConfirmation = await this.categorizeEmail(email);
        emailInfo.isConfirmation = isJobConfirmation;

        console.log(`  Is Job Confirmation: ${isJobConfirmation ? 'YES' : 'NO'}`);

        if (!isJobConfirmation) {
          emailInfo.status = 'Skipped - Not a job confirmation';
          this.emailDetails.push(emailInfo);
          continue; // Skip this email
        }

        this.stats.confirmationsFound++;

        // Step 2: Extract information
        console.log(`  Extracting information...`);
        const extractedData = await this.extractInformation(email);
        emailInfo.extracted = extractedData;

        if (extractedData) {
          console.log(`  ✓ Company: ${extractedData.company}`);
          console.log(`  ✓ Position: ${extractedData.position}`);

          // Create record
          const record = {
            message_id: email.messageId,
            company: extractedData.company,
            position: extractedData.position,
            email_title: email.subject,
            email_date: email.date,
            processed_timestamp: new Date().toISOString()
          };

          records.push(record);
          this.stats.successfulExtractions++;
          emailInfo.status = 'Successfully extracted';
        } else {
          console.log(`  ✗ Extraction failed - missing required fields`);
          emailInfo.status = 'Extraction failed';
        }

        this.emailDetails.push(emailInfo);

        // Add delay to avoid rate limiting
        await this.delay(500);

      } catch (error) {
        console.error(`Error processing email ${email.messageId}:`, error);
        emailInfo.error = error.message;
        emailInfo.status = `Error: ${error.message}`;
        this.emailDetails.push(emailInfo);
        this.stats.errors++;

        // Continue processing other emails even if one fails
        if (progressCallback) {
          progressCallback({
            current: i + 1,
            total: emails.length,
            message: `Error processing email ${i + 1}, continuing...`,
            error: error.message,
            emailDetails: emailInfo
          });
        }
      }
    }

    return records;
  }

  /**
   * Categorize a single email
   * @param {Object} email - Email object
   * @returns {Promise<boolean>} True if job application confirmation
   */
  async categorizeEmail(email) {
    try {
      return await this.aiProvider.categorizeEmail(email);
    } catch (error) {
      // Implement exponential backoff for rate limits
      if (error.message.includes('rate limit') || error.message.includes('429')) {
        console.warn('Rate limit hit, retrying after delay...');
        await this.delay(2000);
        return await this.aiProvider.categorizeEmail(email);
      }
      throw error;
    }
  }

  /**
   * Extract information from a single email
   * @param {Object} email - Email object
   * @returns {Promise<Object|null>} Extracted data or null
   */
  async extractInformation(email) {
    try {
      return await this.aiProvider.extractInformation(email);
    } catch (error) {
      // Implement exponential backoff for rate limits
      if (error.message.includes('rate limit') || error.message.includes('429')) {
        console.warn('Rate limit hit, retrying after delay...');
        await this.delay(2000);
        return await this.aiProvider.extractInformation(email);
      }

      // If extraction fails, log and return null (skip this email)
      console.error('Extraction failed:', error);
      return null;
    }
  }

  /**
   * Process a single email (convenience method)
   * @param {Object} email - Email object
   * @returns {Promise<Object|null>} Extracted record or null
   */
  async processSingleEmail(email) {
    try {
      const isJobConfirmation = await this.categorizeEmail(email);

      if (!isJobConfirmation) {
        return null;
      }

      const extractedData = await this.extractInformation(email);

      if (!extractedData) {
        return null;
      }

      return {
        message_id: email.messageId,
        company: extractedData.company,
        position: extractedData.position,
        email_title: email.subject,
        email_date: email.date,
        processed_timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error processing single email:', error);
      return null;
    }
  }

  /**
   * Get processing statistics
   * @returns {Object} Stats object
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Get detailed email processing information
   * @returns {Array} Array of email details
   */
  getEmailDetails() {
    return this.emailDetails || [];
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      emailsScanned: 0,
      confirmationsFound: 0,
      successfulExtractions: 0,
      errors: 0
    };
  }

  /**
   * Delay helper for rate limiting
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate extracted record
   * @param {Object} record - Record object
   * @returns {boolean} True if valid
   */
  validateRecord(record) {
    return (
      record &&
      record.message_id &&
      record.company &&
      record.position &&
      record.email_title &&
      record.email_date
    );
  }

  /**
   * Batch process with retry logic
   * @param {Array} emails - Array of emails
   * @param {Object} options - Options
   * @param {number} options.maxRetries - Max retries per email
   * @param {Function} options.progressCallback - Progress callback
   * @returns {Promise<Array>} Array of records
   */
  async processWithRetry(emails, options = {}) {
    const maxRetries = options.maxRetries || 2;
    const progressCallback = options.progressCallback;
    const records = [];
    const failedEmails = [];

    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      let attempt = 0;
      let success = false;

      while (attempt < maxRetries && !success) {
        try {
          if (progressCallback) {
            progressCallback({
              current: i + 1,
              total: emails.length,
              message: `Processing email ${i + 1} of ${emails.length}${attempt > 0 ? ` (retry ${attempt})` : ''}...`
            });
          }

          const record = await this.processSingleEmail(email);

          if (record && this.validateRecord(record)) {
            records.push(record);
            success = true;
          } else {
            success = true; // Not a job confirmation, move on
          }

        } catch (error) {
          attempt++;
          console.error(`Attempt ${attempt} failed for email ${email.messageId}:`, error);

          if (attempt >= maxRetries) {
            failedEmails.push({ email, error: error.message });
            this.stats.errors++;
          } else {
            // Wait before retry
            await this.delay(1000 * attempt);
          }
        }
      }

      // Rate limiting delay between emails
      await this.delay(500);
    }

    // Log failed emails
    if (failedEmails.length > 0) {
      console.warn('Failed to process emails:', failedEmails);
    }

    return records;
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EmailProcessor;
}
