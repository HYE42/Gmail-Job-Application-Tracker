// Configuration Manager - Handles settings persistence using Chrome Storage API

class ConfigManager {
  constructor() {
    this.defaultSettings = {
      activeProvider: 'openai',
      openaiKey: '',
      geminiKey: '',
      claudeKey: '',
      deepseekKey: '',
      timePeriod: 14,
      emailLimit: 50,
      gmailAuthenticated: false,
      lastCheckpoint: null // Timestamp of last processed email
    };
  }

  /**
   * Get all settings from Chrome storage
   * @returns {Promise<Object>} Settings object
   */
  async getSettings() {
    try {
      const settings = await chrome.storage.local.get(Object.keys(this.defaultSettings));
      // Merge with defaults to ensure all keys exist
      return { ...this.defaultSettings, ...settings };
    } catch (error) {
      console.error('Failed to get settings:', error);
      return this.defaultSettings;
    }
  }

  /**
   * Get a specific setting value
   * @param {string} key - Setting key
   * @returns {Promise<any>} Setting value
   */
  async getSetting(key) {
    try {
      const result = await chrome.storage.local.get(key);
      return result[key] !== undefined ? result[key] : this.defaultSettings[key];
    } catch (error) {
      console.error(`Failed to get setting ${key}:`, error);
      return this.defaultSettings[key];
    }
  }

  /**
   * Save settings to Chrome storage
   * @param {Object} settings - Settings object
   * @returns {Promise<boolean>} Success status
   */
  async saveSettings(settings) {
    try {
      await chrome.storage.local.set(settings);
      return true;
    } catch (error) {
      console.error('Failed to save settings:', error);
      return false;
    }
  }

  /**
   * Save a specific setting
   * @param {string} key - Setting key
   * @param {any} value - Setting value
   * @returns {Promise<boolean>} Success status
   */
  async saveSetting(key, value) {
    try {
      await chrome.storage.local.set({ [key]: value });
      return true;
    } catch (error) {
      console.error(`Failed to save setting ${key}:`, error);
      return false;
    }
  }

  /**
   * Get API key for active provider
   * @returns {Promise<Object>} Object with provider name and API key
   */
  async getActiveProviderConfig() {
    try {
      const settings = await this.getSettings();
      const provider = settings.activeProvider;
      const apiKey = settings[`${provider}Key`];

      if (!apiKey || apiKey.trim() === '') {
        throw new Error(`No API key configured for ${provider}`);
      }

      return {
        provider,
        apiKey: apiKey.trim()
      };
    } catch (error) {
      throw new Error('Failed to get active provider config: ' + error.message);
    }
  }

  /**
   * Update last checkpoint timestamp
   * @param {string} timestamp - ISO timestamp of last processed email
   * @returns {Promise<boolean>} Success status
   */
  async updateCheckpoint(timestamp) {
    return await this.saveSetting('lastCheckpoint', timestamp);
  }

  /**
   * Get last checkpoint timestamp
   * @returns {Promise<string|null>} ISO timestamp or null
   */
  async getCheckpoint() {
    return await this.getSetting('lastCheckpoint');
  }

  /**
   * Clear all settings (useful for debugging/reset)
   * @returns {Promise<boolean>} Success status
   */
  async clearSettings() {
    try {
      await chrome.storage.local.clear();
      return true;
    } catch (error) {
      console.error('Failed to clear settings:', error);
      return false;
    }
  }

  /**
   * Validate settings before processing
   * @returns {Promise<Object>} Validation result {valid: boolean, errors: string[]}
   */
  async validateSettings() {
    const errors = [];
    const settings = await this.getSettings();

    // Check if active provider has API key
    const provider = settings.activeProvider;
    const apiKey = settings[`${provider}Key`];

    if (!apiKey || apiKey.trim() === '') {
      errors.push(`No API key configured for ${provider.toUpperCase()}`);
    }

    // Validate email limit
    if (settings.emailLimit < 1 || settings.emailLimit > 500) {
      errors.push('Email limit must be between 1 and 500');
    }

    // Validate time period
    if (![7, 14, 30, 60, 90].includes(settings.timePeriod)) {
      errors.push('Invalid time period selected');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ConfigManager;
}
