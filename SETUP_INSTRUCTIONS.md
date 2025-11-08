# Setup Instructions for GitHub Version

This is the open-source version of the Gmail Job Application Tracker Chrome Extension.

## Important: OAuth Setup Required

For security reasons, the OAuth client ID is not included in this repository. You'll need to create your own Google Cloud project and OAuth credentials.

### Quick Setup

1. **Follow the Development Setup Guide**
   - See [DEV_SETUP.md](DEV_SETUP.md) for complete instructions
   - You'll need to create a Google Cloud project
   - Enable Gmail API
   - Create OAuth 2.0 credentials

2. **Update manifest.json**
   - Add your OAuth client ID to the oauth2 section:
   `json
   "oauth2": {
     "client_id": "YOUR-CLIENT-ID.apps.googleusercontent.com",
     "scopes": [
       "https://www.googleapis.com/auth/gmail.readonly"
     ]
   }
   `

3. **Get an AI API Key**
   - At least one API key from:
     - [OpenAI](https://platform.openai.com/api-keys)
     - [Google Gemini](https://aistudio.google.com/app/apikey)
     - [Anthropic Claude](https://console.anthropic.com/)
     - [DeepSeek](https://platform.deepseek.com/)

4. **Load the Extension**
   - Open Chrome and go to chrome://extensions/
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select this folder

## Alternative: Install from Chrome Web Store

If you don't want to set up OAuth yourself, you can install the published version from the Chrome Web Store (link coming soon), which has OAuth pre-configured.

## Support

For detailed setup instructions, see:
- [DEV_SETUP.md](DEV_SETUP.md) - Development setup guide
- [README.md](README.md) - Full documentation
- [PRIVACY_POLICY.md](PRIVACY_POLICY.md) - Privacy policy

## License

See [LICENSE.md](LICENSE.md)
