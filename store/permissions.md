# Permission Justifications for Chrome Web Store

Use these when filling out the CWS submission form. Each permission requires a justification explaining why it is needed.

## Required Permissions

### `tabs`
**Justification:** TabPilot is a tab manager. It reads tab titles, URLs, favicons, and audio status to display them in the dashboard and side panel. Without this permission, the extension cannot function.

### `tabGroups`
**Justification:** TabPilot creates and manages Chrome tab groups as part of the AI grouping and manual organization features. It reads existing groups to display them and creates new groups when the user applies suggested groupings.

### `storage`
**Justification:** TabPilot stores user preferences (theme, layout, auto-suspend timer) and saved session projects in chrome.storage.local. No data is sent externally.

### `alarms`
**Justification:** TabPilot uses chrome.alarms to schedule automatic tab suspension. When a user configures an auto-suspend timer (e.g., suspend tabs inactive for 30 minutes), alarms trigger the suspension check.

### `sidePanel`
**Justification:** TabPilot provides a side panel UI that shows the current window's tabs grouped by domain, acting as a vertical tab bar. This is a core feature of the extension.

### `contextMenus`
**Justification:** TabPilot adds an "Open Tab Manager" item to the extension icon's right-click menu. This provides an alternative way to open the dashboard in browsers (like Opera) that override the new tab page and don't load the extension's new tab override.

### `declarativeNetRequest`
**Justification:** When the user configures an AI provider (OpenAI or Anthropic) with their own API key, the browser's CORS policy blocks direct requests. TabPilot uses declarativeNetRequest to strip the Origin header on requests to the user-configured AI API endpoints only. No other network requests are modified.

## Host Permissions

### `https://api.openai.com/*`
**Justification:** Used only when the user explicitly configures an OpenAI API key for the optional AI tab grouping feature. TabPilot sends only tab titles and domain names to generate grouping suggestions. No page content or browsing history is transmitted.

### `https://api.anthropic.com/*`
**Justification:** Used only when the user explicitly configures an Anthropic API key for the optional AI tab grouping feature. Same data scope as OpenAI — only tab titles and domain names.

## Optional Permissions

### `scripting` (optional)
**Justification:** Used for tab suspension. When suspending a tab, TabPilot may inject a minimal script to capture the page state before replacing it with a lightweight suspended page. Only requested when the user first uses the suspend feature.

### `<all_urls>` (optional host permission)
**Justification:** Required only for tab suspension to work on all pages. Without this, suspension is limited to pages matching the default host permissions. Only requested when the user enables suspension.

## Data Use Disclosure

- **Personally identifiable information:** Not collected
- **Health information:** Not collected
- **Financial and payment information:** Not collected
- **Authentication information:** Not collected
- **Personal communications:** Not collected
- **Location:** Not collected
- **Web history:** Tab titles and URLs are read locally for display; never transmitted except to user-configured AI APIs (titles and domains only)
- **User activity:** Not collected
- **Website content:** Not collected