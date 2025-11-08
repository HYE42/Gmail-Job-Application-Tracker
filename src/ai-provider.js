// AI Provider - Multi-provider abstraction for AI APIs (OpenAI, Gemini, Claude, DeepSeek)

class AIProvider {
  constructor(provider, apiKey) {
    this.provider = provider;
    this.apiKey = apiKey;
    this.endpoints = {
      openai: 'https://api.openai.com/v1/chat/completions',
      gemini: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
      claude: 'https://api.anthropic.com/v1/messages',
      deepseek: 'https://api.deepseek.com/v1/chat/completions'
    };
  }

  /**
   * Categorize email as job application confirmation
   * @param {Object} email - Email object with subject, from, body
   * @returns {Promise<boolean>} True if job application confirmation
   */
  async categorizeEmail(email) {
    const prompt = this.buildCategorizationPrompt(email);

    try {
      const response = await this.callAI(prompt);
      const answer = response.toLowerCase().trim();

      // Check for affirmative response
      return answer.includes('yes') || answer === 'true' || answer === '1';
    } catch (error) {
      console.error('Email categorization failed:', error);
      throw new Error(`Failed to categorize email: ${error.message}`);
    }
  }

  /**
   * Extract job application information from email
   * @param {Object} email - Email object
   * @returns {Promise<Object>} Extracted information {company, position, application_date}
   */
  async extractInformation(email) {
    const prompt = this.buildExtractionPrompt(email);

    try {
      const response = await this.callAI(prompt);
      console.log('AI Extraction Response:', response);

      const data = this.parseExtractionResponse(response);
      console.log('Parsed Extraction Data:', data);

      // Always use email date for application_date
      data.application_date = this.validateDate(email.date);
      console.log('Set application_date to email date:', data.application_date);

      // Validate: need at least company OR position (not both required)
      if (!data.company && !data.position) {
        console.error('Extraction failed: missing both company and position');
        console.error('Email subject:', email.subject);
        console.error('Email from:', email.from);
        throw new Error('Could not extract company or position from email');
      }

      // Return data even if some fields are missing
      console.log('Final extracted data:', data);
      return data;
    } catch (error) {
      console.error('Information extraction failed:', error);
      console.error('Email subject:', email.subject);
      console.error('Email from:', email.from);
      throw error;
    }
  }

  /**
   * Build categorization prompt
   * @param {Object} email - Email object
   * @returns {string} Prompt text
   */
  buildCategorizationPrompt(email) {
    return `Analyze this email to determine if it is a job application confirmation/acknowledgment.

STRONG INDICATORS (if ANY are present, likely YES):
Subject contains: "thank you for applying", "application received", "thank you for your application", "application submitted", "submission received", "we received your application"

Body contains: "thank you for applying", "application has been received", "we received your application", "your application for the", "application submitted successfully"

From domains: greenhouse-mail.io, greenhouse.io, lever.co, ashbyhq.com, myworkday.com, gem.com, workable.com, taleo.net, icims.com, smartrecruiters.com, appreview.gem.com

CONFIRMATION EMAIL TYPES TO DETECT:
1. Immediate auto-reply after application submission
2. Acknowledgment from company recruiting/HR team
3. ATS system confirmation emails
4. Application status notifications (received/under review)

CRITICAL EXCLUSIONS (answer NO):
- REJECTION emails containing: "unfortunately", "not moving forward", "position has been filled", "decided not to", "not been selected", "have not been selected", "will not be moving forward", "have reviewed your resume", "carefully considered your qualifications", "you have not been selected"
- Emails that say "thank you for your interest" BUT also mention rejection, not being selected, or moving forward with other candidates
- Interview invitations or scheduling
- Job alerts/recommendations from job boards
- Marketing emails from recruiting platforms
- Cold recruiter outreach (not responding to YOUR application)
- General company newsletters
- Follow-up emails after rejection

EMAIL TO ANALYZE:
Subject: ${email.subject}
From: ${email.from}
Body: ${email.body.substring(0, 1000)}

IMPORTANT RULES:
1. If the email mentions "not been selected", "not moving forward", "decided not to", or "carefully considered" followed by rejection language, answer NO even if it says "thank you for your interest"
2. Only answer YES if the email is confirming receipt/submission of an application WITHOUT rejecting it
3. Rejection emails that thank you for applying should be NO

Answer (YES or NO):`;
  }

  /**
   * Build extraction prompt
   * @param {Object} email - Email object
   * @returns {string} Prompt text
   */
  buildExtractionPrompt(email) {
    return `Extract company name and job position from this job application confirmation email.

EMAIL:
Subject: ${email.subject}
From: ${email.from}
Body: ${email.body}

EXTRACT:
1. COMPANY NAME:
   - Look in subject: "Thank you for applying to [Company]"
   - Look in body: company name mentioned, email signature
   - From domain: @databricks.com → "Databricks", GDIT@myworkday.com → "GDIT"
   - If using ATS (greenhouse, ashby, workday, gem): find the actual company in the email text

2. JOB POSITION (if available):
   - Look for: "for the [position] role", "your application for [position]"
   - Job titles in email: "Senior Engineer", "Data Scientist", etc.
   - If you cannot find position, use null

IMPORTANT:
- Extract at least the company name
- Position can be null if not found
- Do NOT extract or include application_date in your response

OUTPUT (JSON only, no extra text):
{
  "company": "Company Name or null",
  "position": "Job Title or null"
}`;
  }

  /**
   * Call AI provider with prompt
   * @param {string} prompt - Prompt text
   * @returns {Promise<string>} AI response
   */
  async callAI(prompt) {
    switch (this.provider) {
      case 'openai':
        return await this.callOpenAI(prompt);
      case 'gemini':
        return await this.callGemini(prompt);
      case 'claude':
        return await this.callClaude(prompt);
      case 'deepseek':
        return await this.callDeepSeek(prompt);
      default:
        throw new Error(`Unsupported provider: ${this.provider}`);
    }
  }

  /**
   * Call OpenAI API
   * @param {string} prompt - Prompt text
   * @returns {Promise<string>} Response text
   */
  async callOpenAI(prompt) {
    const response = await fetch(this.endpoints.openai, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenAI API error');
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  }

  /**
   * Call Google Gemini API
   * @param {string} prompt - Prompt text
   * @returns {Promise<string>} Response text
   */
  async callGemini(prompt) {
    const url = `${this.endpoints.gemini}?key=${this.apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 500
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Gemini API error');
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text.trim();
  }

  /**
   * Call Anthropic Claude API
   * @param {string} prompt - Prompt text
   * @returns {Promise<string>} Response text
   */
  async callClaude(prompt) {
    const response = await fetch(this.endpoints.claude, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 500,
        temperature: 0.1,
        messages: [
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Claude API error');
    }

    const data = await response.json();
    return data.content[0].text.trim();
  }

  /**
   * Call DeepSeek API
   * @param {string} prompt - Prompt text
   * @returns {Promise<string>} Response text
   */
  async callDeepSeek(prompt) {
    const response = await fetch(this.endpoints.deepseek, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'DeepSeek API error');
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  }

  /**
   * Parse extraction response to get structured data
   * @param {string} response - AI response text
   * @returns {Object} Parsed data
   */
  parseExtractionResponse(response) {
    try {
      // Try to find JSON in the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);

        // Clean and validate data - handle null/"null" strings
        const cleanValue = (val) => {
          if (!val || val === 'null' || val === 'NULL' || val === 'None') return null;
          return val.trim();
        };

        return {
          company: cleanValue(data.company),
          position: cleanValue(data.position),
          application_date: null // Will be set from email date
        };
      }

      throw new Error('No JSON found in response');
    } catch (error) {
      console.error('Failed to parse extraction response:', error);
      console.error('Response was:', response);
      throw new Error('Failed to parse AI response');
    }
  }

  /**
   * Validate and format date string
   * @param {string} dateString - Date string
   * @returns {string|null} Formatted date (YYYY-MM-DD) or null
   */
  validateDate(dateString) {
    if (!dateString) return null;

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return null;

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (error) {
      return null;
    }
  }

  /**
   * Test API connection
   * @returns {Promise<boolean>} True if API is accessible
   */
  async testConnection() {
    try {
      const testPrompt = 'Respond with only the word "OK"';
      const response = await this.callAI(testPrompt);
      return response.toLowerCase().includes('ok');
    } catch (error) {
      console.error('API connection test failed:', error);
      return false;
    }
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AIProvider;
}
