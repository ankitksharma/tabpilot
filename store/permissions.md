# Permission Justifications for Chrome Web Store

Use these when filling out the CWS submission form. Each permission requires a justification explaining why it is needed.

## Required Permissions

### `tabs`
**Justification:** TabPilot is a tab manager. It reads tab titles, URLs, favicons, and audio status to display them in the dashboard and to group, sort, and collapse them in the tab strip. Without this permission, the extension cannot function.

### `tabGroups`
**Justification:** TabPilot creates, renames, moves, and collapses Chrome tab groups when the user clicks Group, Sort, or Collapse in the toolbar popup, or applies AI grouping suggestions. It reads existing groups to display them and creates new groups when the user applies suggested groupings.

### `storage`
**Justification:** TabPilot stores user preferences (theme, layout, auto-suspend timer) and saved session projects in chrome.storage.local. No data is sent externally.

### `alarms`
**Justification:** TabPilot uses chrome.alarms to schedule automatic tab suspension. When a user configures an auto-suspend timer (e.g., suspend tabs inactive for 30 minutes), alarms trigger the suspension check.

### `declarativeNetRequest`
**Justification:** When the user configures an AI provider (OpenAI or Anthropic) with their own API key, the browser's CORS policy blocks direct requests. TabPilot uses declarativeNetRequest to strip the Origin header on requests to the user-configured AI API endpoints only. No other network requests are modified.

## Host Permissions

### `https://api.openai.com/*`
**Justification:** Used only when the user explicitly configures an OpenAI API key for the optional AI tab grouping feature. TabPilot sends only tab titles and domain names to generate grouping suggestions. No page content or browsing history is transmitted.

### `https://api.anthropic.com/*`
**Justification:** Used only when the user explicitly configures an Anthropic API key for the optional AI tab grouping feature. Same data scope as OpenAI — only tab titles and domain names.

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