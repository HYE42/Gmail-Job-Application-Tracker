# Gmail Job Application Tracker

A Chrome extension that automatically tracks job applications from Gmail confirmation emails using AI.

## Features

- **Automatic Email Scanning**: Scans Gmail inbox for job application confirmation emails
- **AI-Powered Detection**: Uses AI to identify confirmation emails and extract relevant information
- **Multi-Provider Support**: Works with OpenAI (ChatGPT), Google Gemini, Anthropic Claude, and DeepSeek
- **Local CSV Storage**: Maintains a local CSV file with all your job applications
- **Duplicate Prevention**: Uses Gmail message IDs to prevent duplicate records
- **Checkpoint System**: Only processes new emails since the last run
- **Configurable Settings**: Customize time period, scan limits, and AI provider

## Installation

### For Users (Installing from Chrome Web Store)

1. Visit the [Chrome Web Store listing](#) (link coming soon)
2. Click **"Add to Chrome"**
3. Follow the prompts to install
4. No OAuth setup needed - it works automatically!

### For Developers (Local Development)

We use a **hybrid approach** for OAuth:
- **Production (Chrome Web Store)**: Auto-generated OAuth (no setup needed)
- **Development (Local testing)**: Custom OAuth client ID

**📖 See [DEV_SETUP.md](DEV_SETUP.md) for complete development setup instructions**

#### Quick Dev Setup

1. **Set up development OAuth client** (one-time):
   - Create Google Cloud project
   - Enable Gmail API
   - Create OAuth client ID
   - See [DEV_SETUP.md](DEV_SETUP.md) for detailed steps

2. **Configure development environment**:
   ```powershell
   # Copy manifest.dev.json and update with your OAuth client ID
   # Then switch to dev mode:
   .\build-dev.ps1
   ```

3. **Load Extension in Chrome**:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `ApplicationTracking` folder

4. **Before publishing**:
   ```powershell
   .\build-prod.ps1          # Switch to production manifest
   .\create-release-zip.ps1  # Create release package
   ```

### Prerequisites (For All Users)

**AI API Key**: At least one API key from:
- [OpenAI API](https://platform.openai.com/api-keys)
- [Google Gemini API](https://aistudio.google.com/app/apikey)
- [Anthropic Claude API](https://console.anthropic.com/)
- [DeepSeek API](https://platform.deepseek.com/)

### Generate Icons (Optional)

1. Open `icons/create-icons.html` in your browser
2. Click each canvas to download the icon files
3. Save them in the `icons/` folder

## Usage

### First-Time Setup

1. Click the extension icon in Chrome toolbar
2. Enter API key(s) for your preferred AI provider(s)
3. Select the active AI provider from dropdown
4. Configure settings:
   - **Time Period**: How far back to scan (default: 14 days)
   - **Email Scan Limit**: Maximum emails to process per run (default: 50)
5. Click "Save Settings"

### Processing Emails

1. Click "Process Emails" button
2. On first run, you'll be prompted to authenticate with Gmail
3. The extension will:
   - Scan your Gmail inbox
   - Identify job application confirmation emails using AI
   - Extract company name, position, and application date
   - Save new records to CSV file
4. View results summary when complete

### Accessing Your Data

1. After processing, click "Open CSV File" to download the current data
2. The CSV file includes:
   - Gmail message ID (unique identifier)
   - Company name
   - Job position
   - Application date
   - Email received date
   - Processing timestamp

### Subsequent Runs

- The extension maintains a checkpoint of the last processed email
- Each run will only process new emails since the last run
- Duplicate detection prevents the same email from being added twice

## Configuration

### AI Providers

#### OpenAI (ChatGPT)
- Model: `gpt-4o-mini`
- Get API key: https://platform.openai.com/api-keys

#### Google Gemini
- Model: `gemini-pro`
- Get API key: https://aistudio.google.com/app/apikey

#### Anthropic Claude
- Model: `claude-3-5-haiku-20241022`
- Get API key: https://console.anthropic.com/

#### DeepSeek
- Model: `deepseek-chat`
- Get API key: https://platform.deepseek.com/

### Settings

- **Active Provider**: Switch between AI providers
- **Time Period**: 7, 14, 30, 60, or 90 days
- **Email Limit**: 1-500 emails per run (recommend 50-100)

## CSV File Format

```csv
message_id,company,position,application_date,email_date,processed_timestamp
18c2f5a8b9d3e1f0,Acme Corp,Software Engineer,2025-10-28,2025-10-28T14:32:00Z,2025-11-03T09:15:00Z
```

**Fields:**
- `message_id`: Gmail's unique message identifier
- `company`: Company name extracted from email
- `position`: Job title/position extracted from email
- `application_date`: Date the application was submitted
- `email_date`: Date the confirmation email was received
- `processed_timestamp`: When the extension processed this email

## Architecture

### File Structure

```
ApplicationTracking/
├── manifest.json              # Chrome extension configuration
├── popup.html                 # Extension popup UI
├── popup.js                   # Popup logic
├── popup.css                  # Popup styling
├── background.js              # Background service worker
├── src/
│   ├── config-manager.js     # Settings persistence
│   ├── gmail-client.js       # Gmail API integration
│   ├── ai-provider.js        # Multi-AI provider abstraction
│   ├── email-processor.js    # Email processing logic
│   └── csv-manager.js        # CSV file operations
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── prd.md                     # Product Requirements Document
└── README.md                  # This file
```

### Workflow

1. **Authentication**: OAuth2 with Gmail API
2. **Fetch Emails**: Retrieve emails from inbox based on date range and limit
3. **Filter Duplicates**: Check against existing CSV records
4. **Categorization**: AI determines if email is a job application confirmation
5. **Extraction**: AI extracts company, position, and application date
6. **Storage**: Append new records to CSV file
7. **Checkpoint**: Update last processed timestamp

## Troubleshooting

### Gmail Authentication Failed

**For Chrome Web Store users:**
- The extension should work automatically with no setup
- If you see OAuth errors, try reinstalling the extension
- Make sure you're using the latest version

**For developers (local development):**
- See [DEV_SETUP.md](DEV_SETUP.md) for development OAuth setup
- Ensure Gmail API is enabled in Google Cloud Console
- Verify OAuth Client ID is correctly configured in manifest.dev.json
- Check that extension ID is added to OAuth credentials in Google Cloud Console

### AI API Errors
- Verify API key is correct and active
- Check API provider status (some providers have rate limits)
- Try switching to a different AI provider

### No Emails Found
- Confirm emails are in your Inbox (not other folders)
- Check time period setting (increase if needed)
- Verify emails are within the selected date range

### CSV File Issues
- On first run, you'll be prompted to select a save location
- The extension uses Chrome's File System Access API
- You may need to grant permission to access the file

### Extension Not Loading
- Check for errors in `chrome://extensions/` (click "Errors")
- Ensure all files are in the correct locations
- Verify manifest.json is valid JSON

## Privacy & Security

- **API Keys**: Stored locally in Chrome's secure storage
- **Email Data**: Only sent to your selected AI provider for processing
- **CSV Storage**: Saved locally on your machine, never uploaded
- **Permissions**: Only requests Gmail read-only access

## Limitations

- Only scans inbox folder (not other Gmail labels/folders)
- Requires active internet connection
- AI accuracy depends on email content clarity
- Rate limits apply based on AI provider's terms

## Future Enhancements

- Google Sheets integration
- Custom field extraction
- Email filters by sender/keywords
- Application status tracking (interview invites, rejections)
- Dashboard view within extension
- Browser notifications for new confirmations

## Cost Considerations

### AI API Costs
- **OpenAI**: ~$0.0001-0.0002 per email (using gpt-4o-mini)
- **Gemini**: Free tier available, then ~$0.00001 per email
- **Claude**: ~$0.0001 per email (using Haiku model)
- **DeepSeek**: ~$0.00001 per email

**Example**: Processing 100 emails = $0.01-0.02 USD (OpenAI)

### Gmail API
- Free for personal use (up to 1 billion quota units/day)
- Each email fetch = 5 units
- You're very unlikely to hit limits with personal use

## Support

For issues, questions, or feature requests:
1. Check the Troubleshooting section above
2. Review the [Product Requirements Document](prd.md)
3. Verify your setup follows all installation steps

## License

This project is provided as-is for personal use. Modify and distribute as needed.

## Version

**Current Version**: 1.0.0

## Changelog

### v1.0.0 (2025-11-03)
- Initial release
- Multi-AI provider support (OpenAI, Gemini, Claude, DeepSeek)
- Gmail inbox scanning with date range filters
- CSV storage with duplicate prevention
- Checkpoint system for incremental processing
- Configurable settings with Chrome storage
