# Chrome Web Store Privacy Justifications

## Single Purpose Description
**"Applying Assistant's single purpose is to help users speed up job applications by autofilling text fields with pre-written templates."**

## Permission Justifications

### storage
**Why needed:** Saves user-created templates and extension settings locally in Chrome storage. No data is shared outside the browser or transmitted to external servers.

### scripting  
**Why needed:** Used to inject content scripts into web pages so templates can be inserted into form fields on job application sites.

### activeTab
**Why needed:** Required to detect and interact with text fields on the currently active job application page. Only accesses the tab the user is actively working on.

## Data Usage Compliance
- ✅ No user data is collected or transmitted to external servers
- ✅ All data stays local to the user's browser
- ✅ No tracking or analytics beyond basic Chrome extension usage
- ✅ Templates and settings are stored only in Chrome's local storage
- ✅ Extension only operates on pages where user explicitly activates it

## What Was Removed to Minimize Permissions
- ❌ Removed `tabs` permission (uses `activeTab` instead)
- ❌ Removed `alarms` permission (removed periodic cleanup)
- ❌ Removed `contextMenus` permission (removed right-click menu)
- ❌ Removed `host_permissions` (not needed with content scripts)

This creates a minimal, privacy-focused extension that only requests essential permissions. 