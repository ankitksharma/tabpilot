# Product Requirements Document (PRD)
## Project **TabPilot** – Window & Tab Manager (Chrome Extension)


---

## 1. Problem Statement
Power users, researchers, developers, and context-switching professionals routinely accumulate dozens—sometimes hundreds—of open tabs across multiple Chrome windows. Native Chrome tools (basic tab search, manual tab groups) fall short when users need:
- A global, fast, searchable overview across all windows.
- Bulk actions (move, close, mute, suspend) without hunting each tab.
- Persistent, recallable *sessions* across machines/projects.
- Intelligent *automatic organisation* (not just manual grouping).
- A way to eliminate *duplicate clutter* that wastes memory and focus.

**TabPilot** solves “browser overload” by combining a real-time global dashboard with automation, memory-saving tools, and AI-assisted organisation.

---

## 2. Goals & Non-Goals

### 2.1 Product Goals (MVP)
1. Provide a **single-pane dashboard** listing all open tabs across all Chrome windows.
2. Enable **fast reorganisation**: drag, drop, multi-select, move to window/new window.
3. Offer **resource-friendly suspension** of tabs and full windows.
4. Allow **session save & restore** (“Projects”) locally; optional cloud sync.
5. Deliver **AI Workspaces**: auto-group & label related tabs; optionally sync to Chrome native Tab Groups.
6. Detect & surface **duplicate tabs**; let users close, merge, or collapse them.
7. Maintain user trust with a **privacy-first**, minimal-permission design.

### 2.2 Stretch (Post-MVP / Pro Tier)
- Inline **AI page summaries** on hover/command.
- Workspace **templates & scheduling** (open Morning Stack, Research Stack).
- Cross-browser sync (Edge/Brave) and mobile companion.
- Notes/todos per group; export to Notion/Todoist.

### 2.3 Non-Goals (MVP)
- Full-blown bookmark manager replacement.
- Automated bookmarking of closed sessions.
- Heavy page-content crawling without user action (privacy/perf risk).
- Enterprise SSO or team collaboration (roadmap consideration).

---

## 3. Target Users
| Segment | Need | Pain Today | Why TabPilot Helps |
|---|---|---|---|
| Researchers / Students | Manage topic-based research bursts | 100+ tabs chaos | AI Workspaces, Projects |
| Developers / PMs | Multiple env docs, tickets, dashboards | Constant context switching | Dashboard + saved stacks |
| Knowledge workers w/ multi-monitor setups | Track windows across displays | Hard to find “that tab” | Global search & jump |
| Content creators / Writers | Compare sources & drafts | Duplicate article tabs | Duplicate detection + notes (later) |

---

## 4. Value Proposition
**“Open 150 tabs and stay sane.”** TabPilot turns the browser into a project workspace: see everything, organise in seconds, save it, reclaim memory, and let AI sort the mess.

---

## 5. Competitive Snapshot
| Product | Strengths | Gaps We Exploit |
|---|---|---|
| **Cluster** | Mature dashboard, session save | No AI grouping; dated UI cadence; limited dedupe logic |
| OneTab | RAM saver via dump | Loses tab context; poor ongoing management |
| Native Chrome Tab Search/Groups | Built-in; fast | Manual grouping; weak global management; no Projects |
| Toby | Bookmark/session style | Heavier workflow; less live-window control |

---

## 6. Core Capabilities (MVP Feature List)

- **Global dashboard** – one shortcut opens a multi-column view of every tab in every Chrome window.
- **Drag-and-drop tab control** – reorder tabs within a window or move to another/new window.
- **Smart suspension** – suspend inactive tabs or suspend-on-restore to reclaim RAM/CPU.
- **Session “Projects”** – save one or many windows/tabs and reopen later; restore suspended.
- **Bulk actions + undo** – multi-select to close, move, mute, suspend; undo last destructive action.
- **Power search & sort** – live-filter by title/URL; sort A→Z, by domain; group by domain.
- **Import / export & cloud sync** – JSON/CSV export; re-import; optional encrypted cloud backup (Pro).
- **Real-URL visibility** – show underlying URL even if another suspender masks it.
- **Audio controls** – detect sound-emitting tabs; mute/unmute inline.
- **Custom UI & shortcuts** – dark mode, column density, nav keys, user-mapped hotkeys.
- **AI Workspaces** – LLM clusters related tabs & assigns readable names (e.g., “Bali Trip Planning,” “Quarterly Budget”). Supports user-defined top-level “rules” that map patterns (domains, keywords, regex) to auto-routing into Chrome native Tab Groups.
- **Duplicate Detection** – highlight identical or near-duplicate tabs (same canonical URL, normalized URL, or high-similarity title). Offer bulk close/merge; optional auto-collapse view.
- **Privacy-first** – no third-party data sales; transparent permission usage; local-first processing where possible.

---

## 7. Detailed Feature Requirements

### 7.1 Global Dashboard
**Trigger:** Default shortcut (user configurable; propose `Ctrl+Shift+M` / `⌘+Shift+M`).  
**Display:** Column = Window; row = Tab. Show favicon, title (ellipsized), domain. Hover reveals full URL.  
**Actions:** Click to activate tab; drag to reorder/move; right-click context menu.

**AC:** Opens <150ms; supports 500 tabs across 20 windows with smooth scroll.

### 7.2 Smart Suspension
- Manual suspend per tab/window/group.
- Auto-suspend rule: “Suspend tabs inactive > X minutes”.
- Restore session loads suspended placeholders until focused.

**AC:** Suspended tab must show title + domain; clicking loads original URL.

### 7.3 Session “Projects”
- Save windows/tabs → Named Project.
- Restore: open new window(s) or merge into current.
- Autosave diffs when re-saving (stretch).

**AC:** Restore fidelity >95%.

### 7.4 AI Workspaces
- Auto-group tabs by title/domain/metadata.
- Suggest names via LLM; low-confidence groups flagged for user edit.
- Optional sync with Chrome native Tab Groups.

**AC:** 80%+ grouping precision.

### 7.5 Duplicate Detection
- Exact URL, canonical URL, or high-similarity title (>0.9) detection.
- Badge count, highlight duplicates, collapse duplicates view.
- Bulk close/merge options.

**AC:** Detect 95% of duplicates; false positive <5% for title similarity.

### 7.6 Bulk Actions & Undo
- Multi-select with Shift-click or drag marquee.
- Actions: Close, Move, New Window, Suspend, Mute, Add to Project.
- Undo last 3 destructive actions.

**AC:** Restores tabs to original state within 5s.

---

## 8. UX Flows

### First-Run Setup
1. Permissions prompt.
2. Choose shortcut.
3. Enable AI Workspaces + Duplicate Detection (recommended).

### Daily Use Flow
- Open dashboard → filter tabs → suspend/bulk actions → save as Project → restore later.

### AI Workspace Flow
- Auto-suggested groups appear → accept/ignore → move tabs + optional Chrome groups.

---

## 9. Data Model

**Tab Object**
```
{ tabId, windowId, title, url, faviconUrl, audible: bool, suspended: bool, lastActiveTs }
```

**Workspace / Group**
```
{ groupId, name, color, memberTabIds: [], rulePatterns: [], origin: manual|ai|rule }
```

**Project**
```
{ projectId, name, createdTs, modifiedTs, windows: [{sequence, tabs:[{url,title,pinned?,groupRef?}]}], settings: {restoreSuspended: bool} }
```

**Duplicate Record**
```
{ clusterId, canonicalKey, tabIds: [], detectionMode: exact|canonical|title }
```

---

## 10. Permissions & Privacy

| Permission | Needed For | Notes |
|---|---|---|
| `tabs` | Read/move/close tabs | Core, no content read |
| `storage` | Save settings + Projects | Local or sync |
| `scripting` | Detect canonical URLs | Only for enhanced duplicate mode |
| `identity` | Cloud sync (Pro) | Opt-in only |

**Data Handling Principles:** Local-first, encrypted cloud for Pro, metadata-only AI calls unless user consents.

---

## 11. Performance Targets
- Render 500 tabs <400ms.
- Memory overhead <50MB idle.
- Duplicate scan <2s for 500 tabs.

---

## 12. Metrics
- DAU / Installs: 25% DAU target.
- Avg tabs managed per user/day: >30.
- AI Workspace adoption: 40% enable rate.
- Duplicates resolved: reduce open tabs by 20%.
- Memory reclaimed: track via telemetry.

---

## 13. Release Plan
- M0 Prototype: dashboard, manual move, local save/restore.
- M1 MVP Alpha: bulk actions, undo, suspension, exact duplicates.
- M2 Beta: AI Workspaces live, canonical duplicates, rules.
- M3 Launch: cloud sync, title-sim duplicates, privacy review.

---

## 14. Open Questions
1. LLM provider & cost control?
2. On-device vs cloud AI?
3. Concurrency during restore?
4. Enterprise policy support?

---

## 15. Appendix
### 15.1 Default Shortcuts
| Action | Win/Linux | macOS |
|---|---|---|
| Open dashboard | Ctrl+Shift+M | ⌘⇧M |
| Multi-select toggle | Space | Space |
| Quick new window | Ctrl+N | ⌘N |
| AI Workspace suggest | Ctrl+G | ⌘G |

### 15.2 Duplicate Normalization Rules
- Strip query params: utm_*, gclid, fbclid, ref, long session tokens.

