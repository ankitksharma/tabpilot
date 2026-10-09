# TabPilot

Window & Tab Manager for Google Chrome.

## Features

- **Bird's-eye dashboard** — see every tab across all windows in a multi-column layout
- **Organize Chrome's tab strip** (toolbar popup) — group tabs into native Chrome tab groups by site or routing rules, sort A–Z or by site, collapse inactive groups, undo; works with Chrome's native vertical tabs
- **Drag-and-drop** — reorder tabs, move between windows, or drop to create a new window
- **Session projects** — save/restore workspaces with tabs suspended to avoid reload storms
- **Tab suspension** — suspend tabs manually or automatically after inactivity to free RAM
- **AI workspaces** — connect OpenAI, Claude, or Chrome's built-in AI to auto-group tabs (sends only titles and domains, never page content)
- **Duplicate detection** — find dupes by exact URL, canonical URL, or title similarity
- **Bulk actions** — select multiple tabs to close, mute, suspend, or move, with undo support
- **Search and sort** — live-filter by title/URL, sort alphabetically or by domain
- **Keyboard shortcuts** — full keyboard navigation, `Ctrl+Shift+M` opens the dashboard
- **Privacy-first** — no data collection, no accounts, no analytics, everything stays local

## Tech Stack

- [WXT](https://wxt.dev/) — Chromium extension framework (Manifest V3)
- [Svelte 5](https://svelte.dev/) — UI with runes reactivity
- [Tailwind CSS](https://tailwindcss.com/) — styling
- TypeScript

## Development

```bash
pnpm install
pnpm dev          # dev mode with hot reload
pnpm build        # production build → .output/chrome-mv3/
pnpm zip          # packaged zip → .output/tabpilot-<version>-chrome.zip
```

Load the unpacked extension from `.output/chrome-mv3/` in `chrome://extensions` with developer mode enabled.

## Browser Support

Google Chrome only. Other Chromium browsers are not tested or supported.

## Permissions

| Permission | Why |
|---|---|
| `tabs` | Read tab titles/URLs to display in dashboard |
| `tabGroups` | Read and create Chrome tab groups |
| `storage` | Persist settings and saved sessions locally |
| `alarms` | Auto-suspend inactive tabs on a timer |
| `declarativeNetRequest` | Strip Origin header for AI API CORS |

Host permissions for `api.openai.com` and `api.anthropic.com` are used only when you configure an API key for the optional AI feature.

## Privacy

TabPilot collects no user data. All data stays in `chrome.storage.local`. The AI feature sends only tab titles and domain names to the provider you configure with your own API key. See the full [privacy policy](https://ankitksharma.github.io/tabpilot/privacy.html).

## License

MIT
