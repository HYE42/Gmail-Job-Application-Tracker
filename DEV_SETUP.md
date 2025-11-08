# Development Setup Guide

This guide shows you how to set up the extension for **local development** using a custom OAuth client ID while keeping the production version simple with auto-generated OAuth.

## Hybrid Approach Overview

```
┌─────────────────────────────────────────────────────────┐
│                    DEVELOPMENT                          │
│  manifest.dev.json → Custom OAuth Client ID             │
│  ✅ Works with unpacked extension                       │
│  ✅ Full local testing capability                       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    PRODUCTION                           │
│  manifest.json → No client_id (auto-generated)          │
│  ✅ Works on Chrome Web Store                           │
│  ✅ No Google Cloud setup for users                     │
└─────────────────────────────────────────────────────────┘
```

---

## Step 1: Create Development OAuth Client

### 1.1 Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"New Project"**
3. Name: `Gmail Job Tracker - Dev`
4. Click **"Create"**

### 1.2 Enable Gmail API

1. In your project, go to **"APIs & Services"** → **"Library"**
2. Search for: `Gmail API`
3. Click **"Enable"**

### 1.3 Configure OAuth Consent Screen

1. Go to **"APIs & Services"** → **"OAuth consent screen"**
2. Choose **"External"**
3. Fill in:
   - **App name:** `Gmail Job Application Tracker - Dev`
   - **User support email:** Your email
   - **Developer contact:** Your email
4. Click **"Save and Continue"**
5. **Add scopes:**
   - Click **"Add or Remove Scopes"**
   - Find: `https://www.googleapis.com/auth/gmail.readonly`
   - Click **"Update"** → **"Save and Continue"**
6. **Add test users:**
   - Add your Gmail address(es)
   - Click **"Save and Continue"**
7. Review and click **"Back to Dashboard"**

### 1.4 Create OAuth Client ID

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"Create Credentials"** → **"OAuth client ID"**
3. Application type: **"Chrome extension"**
4. Name: `Gmail Job Tracker - Dev Extension`
5. Item ID: Leave this **BLANK for now** (we'll update it after loading the extension)
6. Click **"Create"**
7. **Copy the Client ID** (looks like: `123456789-abcdefg.apps.googleusercontent.com`)

---

## Step 2: Set Up Development Environment

### 2.1 Update manifest.dev.json

1. Open [manifest.dev.json](manifest.dev.json)
2. Replace `YOUR_DEV_CLIENT_ID.apps.googleusercontent.com` with your actual Client ID from Step 1.4

### 2.2 Copy to manifest.json for Development

When developing locally, replace `manifest.json` with the dev version:

**Option A: Manual Copy (Windows)**
```powershell
Copy-Item manifest.dev.json manifest.json -Force
```

**Option B: Use the Build Script**
```powershell
.\build-dev.ps1
```

### 2.3 Load Extension in Chrome

1. Go to `chrome://extensions/`
2. Enable **"Developer mode"** (top-right toggle)
3. Click **"Load unpacked"**
4. Select the `ApplicationTracking` folder
5. **Copy the Extension ID** (looks like: `abcdefghijklmnopqrstuvwxyz123456`)

### 2.4 Update OAuth Client with Extension ID

1. Go back to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **"APIs & Services"** → **"Credentials"**
3. Click on your OAuth client
4. In **"Item ID"** field, paste the Extension ID from Step 2.3
5. Click **"Save"**

### 2.5 Test OAuth Flow

1. Click the extension icon in Chrome
2. Click **"Process Emails"**
3. You should see the OAuth consent screen
4. Authorize the app
5. OAuth should complete successfully!

---

## Step 3: Development Workflow

### Daily Development

1. **Load dev manifest:**
   ```powershell
   Copy-Item manifest.dev.json manifest.json -Force
   ```

2. **Make your changes** to the extension code

3. **Reload extension** in `chrome://extensions/`

4. **Test thoroughly**

### Before Publishing to Chrome Web Store

1. **Restore production manifest:**
   ```powershell
   Copy-Item manifest.prod.json manifest.json -Force
   # OR use git to restore:
   git checkout manifest.json
   ```

2. **Verify no client_id in manifest.json**

3. **Update version number** in manifest.json

4. **Create release package:**
   ```powershell
   .\create-release-zip.ps1
   ```

5. **Upload to Chrome Web Store**

---

## Build Scripts

### build-dev.ps1 (Create this)

```powershell
# Switch to development mode
Copy-Item manifest.dev.json manifest.json -Force
Write-Host "✓ Switched to DEVELOPMENT mode" -ForegroundColor Green
Write-Host "  manifest.json now uses custom OAuth client ID" -ForegroundColor Gray
```

### build-prod.ps1 (Create this)

```powershell
# Switch to production mode
git checkout manifest.json 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Switched to PRODUCTION mode (from git)" -ForegroundColor Green
} else {
    # Fallback: Remove client_id manually
    $manifest = Get-Content manifest.json -Raw | ConvertFrom-Json
    $manifest.oauth2.PSObject.Properties.Remove('client_id')
    $manifest | ConvertTo-Json -Depth 10 | Set-Content manifest.json
    Write-Host "✓ Switched to PRODUCTION mode" -ForegroundColor Green
}
Write-Host "  manifest.json now uses auto-generated OAuth" -ForegroundColor Gray
```

---

## Important Notes

### ⚠️ Don't Commit manifest.json

Add this to your `.gitignore`:

```
manifest.json
```

This prevents accidentally committing the dev version.

### ✅ Commit Both Templates

Always commit both:
- `manifest.dev.json` (with placeholder client_id)
- `manifest.prod.json` (without client_id)

Or use git to track the production version:
```bash
git add -f manifest.json  # Force add the production version
```

### 🔄 Quick Switch Commands

**Switch to Dev:**
```powershell
Copy-Item manifest.dev.json manifest.json -Force
```

**Switch to Prod:**
```powershell
git checkout manifest.json
```

---

## Troubleshooting

### Error: "OAuth2 request failed" in Development

**Cause:** Extension ID changed or not added to OAuth client.

**Fix:**
1. Check your extension ID in `chrome://extensions/`
2. Update the OAuth client in Google Cloud Console with the correct ID
3. Reload the extension

### Error: "Access blocked: This app's request is invalid"

**Cause:** Gmail scope not added to OAuth consent screen, or you're not a test user.

**Fix:**
1. Add the scope in Google Cloud Console OAuth consent screen
2. Add your email as a test user
3. Try authenticating again

### Extension Works in Dev but Not in Production

**Cause:** Forgot to remove `client_id` from production manifest.

**Fix:**
1. Run `build-prod.ps1` or `git checkout manifest.json`
2. Verify `client_id` is removed from manifest.json
3. Rebuild the release package

---

## Summary

### Development Setup (One-time)
1. ✅ Create Google Cloud project
2. ✅ Enable Gmail API
3. ✅ Configure OAuth consent screen
4. ✅ Create OAuth client ID
5. ✅ Update manifest.dev.json with client ID
6. ✅ Load extension and get extension ID
7. ✅ Update OAuth client with extension ID

### Daily Development
1. ✅ Copy manifest.dev.json → manifest.json
2. ✅ Develop and test locally
3. ✅ Before publishing: restore production manifest
4. ✅ Create release ZIP
5. ✅ Upload to Chrome Web Store

This approach gives you:
- ✅ **Full local testing** with OAuth working
- ✅ **Simple production** with auto-generated OAuth
- ✅ **No user setup required** for published extension
- ✅ **Best developer experience**
