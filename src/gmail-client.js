// Gmail Client - Handles Gmail API authentication and email fetching

class GmailClient {
  constructor() {
    this.accessToken = null;
    this.baseUrl = 'https://www.googleapis.com/gmail/v1/users/me';
  }

  /**
   * Authenticate with Gmail using Chrome Identity API
   * Uses getAuthToken but clears cache first to allow account selection
   * @returns {Promise<string>} Access token
   */
  async authenticate() {
    try {
      // Get token with interactive prompt
      // After revoking token, this should prompt for account selection
      const token = await chrome.identity.getAuthToken({
        interactive: true
      });

      this.accessToken = token.token || token;
      return this.accessToken;
    } catch (error) {
      throw new Error('Gmail authentication failed: ' + error.message);
    }
  }

  /**
   * Get cached access token or authenticate if needed
   * @returns {Promise<string>} Access token
   */
  async getAccessToken() {
    if (this.accessToken) {
      return this.accessToken;
    }
    return await this.authenticate();
  }

  /**
   * Fetch emails from Gmail inbox
   * @param {Object} options - Fetch options
   * @param {number} options.timePeriod - Days to look back
   * @param {number} options.maxResults - Maximum emails to fetch
   * @param {string} options.checkpoint - ISO timestamp of last processed email
   * @returns {Promise<Array>} Array of email objects
   */
  async fetchEmails({ timePeriod = 14, maxResults = 50, checkpoint = null }) {
    try {
      const token = await this.getAccessToken();

      // Build query
      let query = 'in:inbox';

      // Add date filter
      const dateAfter = new Date();
      if (checkpoint) {
        // If checkpoint exists, use it for more precise filtering
        const checkpointDate = new Date(checkpoint);
        dateAfter.setTime(checkpointDate.getTime());
      } else {
        // Otherwise, use time period
        dateAfter.setDate(dateAfter.getDate() - timePeriod);
      }

      const formattedDate = this.formatDateForGmail(dateAfter);
      query += ` after:${formattedDate}`;

      // List messages
      const listUrl = `${this.baseUrl}/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`;
      const listResponse = await fetch(listUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!listResponse.ok) {
        const error = await listResponse.json();
        throw new Error(`Gmail API error: ${error.error?.message || listResponse.statusText}`);
      }

      const listData = await listResponse.json();

      if (!listData.messages || listData.messages.length === 0) {
        return [];
      }

      // Fetch full details for each message
      // Use Promise.allSettled to handle failures gracefully
      const emailResults = await Promise.allSettled(
        listData.messages.map(msg => this.fetchEmailDetails(msg.id, token))
      );

      // Filter out failed requests and extract successful emails
      const emails = emailResults
        .filter(result => {
          if (result.status === 'rejected') {
            console.error('Failed to fetch email:', result.reason);
            return false;
          }
          return true;
        })
        .map(result => result.value);

      // Filter out emails before checkpoint if it exists
      let filteredEmails = emails;
      if (checkpoint) {
        const checkpointTime = new Date(checkpoint).getTime();
        filteredEmails = emails.filter(email => {
          const emailTime = new Date(email.date).getTime();
          return emailTime > checkpointTime;
        });
      }

      return filteredEmails;
    } catch (error) {
      throw new Error('Failed to fetch emails: ' + error.message);
    }
  }

  /**
   * Fetch full details for a specific email
   * @param {string} messageId - Gmail message ID
   * @param {string} token - Access token
   * @returns {Promise<Object>} Email object
   */
  async fetchEmailDetails(messageId, token) {
    try {
      const url = `${this.baseUrl}/messages/${messageId}?format=full`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch email ${messageId}`);
      }

      const data = await response.json();
      return this.parseEmailData(data);
    } catch (error) {
      console.error(`Error fetching email ${messageId}:`, error);
      throw error;
    }
  }

  /**
   * Parse Gmail API response into simplified email object
   * @param {Object} data - Gmail API message object
   * @returns {Object} Parsed email object
   */
  parseEmailData(data) {
    const headers = data.payload.headers;
    const getHeader = (name) => {
      const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
      return header ? header.value : '';
    };

    // Extract email body
    let body = '';
    if (data.payload.body.data) {
      body = this.decodeBase64(data.payload.body.data);
    } else if (data.payload.parts) {
      // Multi-part email, look for text/plain or text/html
      for (const part of data.payload.parts) {
        if (part.mimeType === 'text/plain' && part.body.data) {
          body = this.decodeBase64(part.body.data);
          break;
        } else if (part.mimeType === 'text/html' && part.body.data) {
          body = this.decodeBase64(part.body.data);
        }
      }
    }

    // Remove HTML tags if body is HTML
    body = this.stripHtml(body);

    return {
      messageId: data.id,
      threadId: data.threadId,
      subject: getHeader('Subject'),
      from: getHeader('From'),
      to: getHeader('To'),
      date: this.parseEmailDate(getHeader('Date')),
      body: body.substring(0, 10000), // Limit body length to avoid token issues
      snippet: data.snippet
    };
  }

  /**
   * Decode base64url encoded string
   * @param {string} encoded - Base64url encoded string
   * @returns {string} Decoded string
   */
  decodeBase64(encoded) {
    try {
      // Replace URL-safe characters
      const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
      // Decode
      const decoded = atob(base64);
      // Convert to UTF-8
      return decodeURIComponent(escape(decoded));
    } catch (error) {
      console.error('Failed to decode base64:', error);
      return '';
    }
  }

  /**
   * Strip HTML tags from text
   * @param {string} html - HTML string
   * @returns {string} Plain text
   */
  stripHtml(html) {
    // Basic HTML tag removal
    return html
      .replace(/<style[^>]*>.*<\/style>/gm, '')
      .replace(/<script[^>]*>.*<\/script>/gm, '')
      .replace(/<[^>]+>/gm, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Parse email date header to ISO format
   * @param {string} dateString - Email date header
   * @returns {string} ISO formatted date
   */
  parseEmailDate(dateString) {
    try {
      const date = new Date(dateString);
      return date.toISOString();
    } catch (error) {
      console.error('Failed to parse email date:', error);
      return new Date().toISOString();
    }
  }

  /**
   * Format date for Gmail API query
   * @param {Date} date - Date object
   * @returns {string} Formatted date (YYYY/MM/DD)
   */
  formatDateForGmail(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  }

  /**
   * Get user's email address from Gmail profile
   * @returns {Promise<string>} User's email address
   */
  async getUserEmail() {
    try {
      const token = await this.getAccessToken();
      const response = await fetch(`${this.baseUrl}/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch Gmail profile');
      }

      const data = await response.json();
      return data.emailAddress;
    } catch (error) {
      console.error('Failed to get user email:', error);
      throw new Error('Failed to get user email: ' + error.message);
    }
  }

  /**
   * Revoke access token (for logout)
   * @returns {Promise<boolean>} Success status
   */
  async revokeToken() {
    try {
      if (this.accessToken) {
        await chrome.identity.removeCachedAuthToken({ token: this.accessToken });
        this.accessToken = null;
      }

      // Also clear any cached tokens from Chrome
      // This forces Chrome to prompt for account selection on next login
      try {
        await chrome.identity.clearAllCachedAuthTokens();
      } catch (e) {
        // clearAllCachedAuthTokens might not be available in all Chrome versions
        console.warn('clearAllCachedAuthTokens not available:', e);
      }

      return true;
    } catch (error) {
      console.error('Failed to revoke token:', error);
      return false;
    }
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GmailClient;
}
