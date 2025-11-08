# Privacy Policy for Gmail Job Application Tracker

**Last Updated:** January 2025

## Overview

Gmail Job Application Tracker ("the Extension") is committed to protecting your privacy. This privacy policy explains how the Extension handles your data.

## Data Collection and Usage

### What Data We Access

The Extension accesses:
- **Gmail emails**: Read-only access to scan for job application confirmation emails
- **Email content**: Subject lines, sender information, email body, and dates to identify job applications

### What Data We Store

All data is stored **locally on your device** using Chrome's storage API:
- Your AI provider preference (OpenAI, Gemini, Claude, or DeepSeek)
- Your AI provider API key (encrypted and stored locally)
- Tracked job application data (company names, positions, dates, email subjects)
- List of scanned email IDs to prevent duplicate processing

### What Data We DO NOT Collect

We do NOT:
- Collect or store any data on external servers
- Sell or share your data with third parties
- Track your browsing history
- Access your personal information beyond job-related emails
- Store your Gmail password or credentials

## Data Processing

### AI Processing

When you scan emails:
1. Email content is sent to your chosen AI provider's API (OpenAI, Google Gemini, Anthropic Claude, or DeepSeek)
2. You provide your own API key for the AI service
3. The AI analyzes email content to determine if it's a job application confirmation
4. If confirmed, the AI extracts company name and position information
5. This data is stored locally in your browser

**Important**: Your data is processed by the AI provider you select according to their privacy policy:
- OpenAI Privacy Policy: https://openai.com/privacy
- Google Gemini Privacy Policy: https://policies.google.com/privacy
- Anthropic Claude Privacy Policy: https://www.anthropic.com/privacy
- DeepSeek Privacy Policy: https://www.deepseek.com/privacy

### Gmail API Usage

- We use Gmail API with read-only access (`gmail.readonly` scope)
- We only read emails; we never modify, delete, or send emails
- Gmail authentication is handled securely through Google OAuth2

## Data Storage and Security

- All data is stored locally in your browser using Chrome's secure storage API
- Your API keys are stored encrypted in Chrome's local storage
- No data is transmitted to our servers (we don't have any servers)
- Data persists only on your device and is deleted if you uninstall the extension

## Data Sharing

We do NOT:
- Sell your data to third parties
- Share your data with advertisers
- Use your data for purposes unrelated to tracking job applications
- Transfer your data outside of your device (except to the AI API you choose)

## Your Data Rights

You have the right to:
- **Access**: View all your tracked applications in the extension popup
- **Export**: Download your data as a CSV file at any time
- **Delete**: Clear all tracked applications from the extension settings
- **Control**: Choose which AI provider to use or stop using the extension entirely

## Data Retention

- Data is retained locally until you delete it or uninstall the extension
- You can clear all data at any time through the extension interface
- Uninstalling the extension removes all locally stored data

## Third-Party Services

The Extension connects to:
1. **Gmail API** (Google) - To read your emails
2. **AI Provider APIs** (your choice of OpenAI, Gemini, Claude, or DeepSeek) - To analyze email content

Each service has its own privacy policy. Please review them:
- Google Privacy Policy: https://policies.google.com/privacy
- OpenAI: https://openai.com/privacy
- Anthropic: https://www.anthropic.com/privacy
- DeepSeek: https://www.deepseek.com/privacy

## Children's Privacy

The Extension is not intended for use by children under 13 years of age. We do not knowingly collect data from children.

## Changes to This Privacy Policy

We may update this privacy policy from time to time. Any changes will be posted in the Chrome Web Store listing and within the extension's description.

## Contact

If you have questions about this privacy policy or data handling practices, please:
- Open an issue on our GitHub repository (if applicable)
- Contact us through the Chrome Web Store support section

## Compliance

This Extension complies with:
- Chrome Web Store Developer Program Policies
- Google API Services User Data Policy
- General Data Protection Regulation (GDPR) principles
- California Consumer Privacy Act (CCPA) principles

## Your Consent

By using the Extension, you consent to this privacy policy.

---

**Summary**: We don't collect your data. Everything stays on your device. You control your own AI API keys and data.
