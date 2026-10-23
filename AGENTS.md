# PowerShellish — Agent Guide

> Read this before changing code. The full product specification lives in
> [docs/POWERSHELLISH-SPEC.md](docs/POWERSHELLISH-SPEC.md).
> This file is the short, durable contract for future sessions. Update it when product decisions change.

## Product

PowerShellish is a browser-only PowerShell learning and creative environment. Users learn commands,
experiment in a safe workspace, create and edit files, write scripts, share knowledge, and communicate
using real PowerShell cmdlets plus custom PowerShell-inspired commands.

There is **no server, no account system, no database, and no cloud sync** in Phase 1.

## Non-negotiable rules

1. **Three routes only:** `/` (Home), `/terminal/` (Workspace), `/help/` (Learning).
2. **Every route must render a working terminal.** Home gets a compact mini-terminal, Terminal gets the
   full workspace terminal, Help gets a learning terminal with runnable examples.
3. **No backend.** Do not add API calls, auth, databases, or cloud persistence until Phase 2 is explicitly approved.
4. **Be honest about simulation.** Real cmdlets are simulated in the browser. Never imply that a simulated
   command executes native PowerShell, touches the real filesystem, or talks to a real Windows machine.
5. **Always surface the Local Session notice.** Full notice on `/terminal/`, compact version elsewhere.
   Never claim that every refresh destroys all work, and never imply recovery is guaranteed.
6. **PowerShell-inspired wording, beginner-clear results.** Prefer verbs/nouns and terminal patterns, but
   never sacrifice plain-language explanations. Errors must teach the next step.
7. **Export must always work.** Users must be able to download individual files and the whole workspace
   (ZIP) without a server. This is the only reliable backup.

## Routes

| Route        | Purpose                                             | Main command    |
| ------------ | --------------------------------------------------- | --------------- |
| `/`          | Landing page, introduction, compact mini-terminal    | `Get-Home`      |
| `/terminal/` | Full interactive terminal and file workspace         | `Start-Terminal`|
| `/help/`     | Learning assistant, documentation, exercises         | `Get-Help`      |

`Get-Home` and `Start-Terminal` are custom navigation commands. `Get-Help` is a real PowerShell cmdlet;
its no-argument output should introduce available help topics and lessons.

## Command system

Every command belongs to exactly one category and is registered in one registry. The registry drives
parsing, help, autocomplete, `Get-Command`, category badges, and execution.

| Category    | Meaning                                      | Example                                            |
| ----------- | -------------------------------------------- | -------------------------------------------------- |
| Real        | Real PowerShell cmdlet, simulated in browser | `Get-ChildItem`, `Set-Content`, `New-Item`          |
| Custom      | PowerShellish-defined browser action         | `Export-File`, `Write-Success`, `Publish-Story`     |
| Educational | Teaching-only example or fictional demo      | pipelines, variables, illustrative scenario commands|

Registry entries must expose: `name`, `category`, `summary`, `usage`, `parameters`, `aliases` (optional),
`run(context, args)`, and an explicit simulation note for Real commands. Unknown commands and unsupported
syntax must return a friendly teaching message, never a crash.

### Verbs

| Verb        | Meaning in PowerShellish         |
| ----------- | -------------------------------- |
| `Get-`      | Discover or retrieve             |
| `Set-`      | Change or configure              |
| `New-`      | Create something                 |
| `Start-`    | Begin an activity                |
| `Stop-`     | End an activity                  |
| `Find-`     | Search for something             |
| `Send-`     | Deliver a message                |
| `Share-`    | Share knowledge                  |
| `Publish-`  | Release a story                  |
| `Learn-`    | Enter a learning activity        |
| `Celebrate-`| Recognize progress               |
| `Imagine-`  | Explore a creative idea          |
| `Dream-`    | Express an ambition              |
| `Remember-` | Recall a lesson                  |
| `Retry-`    | Try a different approach         |

### Required file commands (Phase 1)

| Command                                                   | Behavior                                                            |
| --------------------------------------------------------- | ------------------------------------------------------------------- |
| `New-Item -ItemType File -Path <path>`                    | Create a text file in the virtual workspace                         |
| `New-Item -ItemType Directory -Path <path>`               | Create a folder                                                    |
| `Get-ChildItem [-Path <path>]`                            | List workspace files and folders                                    |
| `Set-Content -Path <path> -Value <text>`                  | Write or replace file content (creates the file if missing)         |
| `Add-Content -Path <path> -Value <text>`                  | Append content (creates the file if missing)                        |
| `Get-Content -Path <path>`                                | Read a file's content                                               |
| `Remove-Item -Path <path>`                                | Delete a file or folder **with in-app confirmation**                |
| `Rename-Item -Path <path> -NewName <name>`                | Rename an item; reject collisions                                   |
| `Import-File`                                             | Open a local file picker and copy chosen text files into workspace  |
| `Export-File -Path <path>`                                | Download one workspace file                                         |
| `Save-Changes [-Path <path>] [-Export]`                   | Commit editor buffer to the workspace; optionally download          |
| `Export-Workspace`                                        | Download the full workspace as a ZIP archive                        |

Destructive actions require confirmation. Folder deletion must state that contents are removed. Do not add
a silent force-delete flag in Phase 1.

## Workspace

- Use a virtual filesystem, not the real filesystem. Model it as a tree with a versioned schema.
- Persist the workspace in **IndexedDB** (best effort) and preferences in **localStorage**.
- Support text-based formats only: `.txt`, `.md`, `.ps1`, `.psm1`, `.psd1`, `.json`, `.csv`, `.log`,
  `.xml`, `.html`, `.css`, `.js`, `.yml`, `.yaml`, `.ini`, `.config`, and similar plain text.
- Reject binary/oversized imports with a clear message. Proposed limits: 1 MB per file, 20 MB per workspace.
- Use the File System Access API only as a progressive enhancement. Upload/download must remain the fallback.
- ZIP export requires a client-side library. **Ask before adding one** (for example `fflate`).
- Provide a way to clear local data with confirmation.

## Persistence and data honesty

Store only what is useful and explain the limits:

- **Session memory:** command history, variables, unsaved editor buffers.
- **localStorage:** theme and preferences.
- **IndexedDB:** workspace files (best effort, autosaved with a debounce).
- **No cloud:** no accounts, no profiles, no guaranteed recovery, no cross-device sync.

Canonical full notice (use on the terminal page; compact version elsewhere):

> **Local session — no cloud backup**
> PowerShellish is currently running without user accounts or cloud storage. Your work may not be saved
> permanently. Browser data can be cleared, and closing or refreshing the page may affect unsaved session
> data.
>
> Use **Export-File** or download your workspace regularly to keep a copy of your work.

Compact: `Local session · no cloud backup · Export-File to keep your work`.

If storage is unavailable (for example private browsing), show a degraded-mode warning and encourage export.
Never claim that refreshing always wipes everything; explain that recovery is not guaranteed.

## UX and content

- Show command syntax, a plain-English summary, and a category badge in help and discovery output.
- Prefer runnable examples with a click-to-run or copy action.
- Errors: say what went wrong, show the expected syntax, and suggest a valid next command.
- Use an accessible in-app confirmation dialog for destructive actions (not `window.confirm`).
- Terminal must be usable on mobile, keyboard-first, with `aria-live` output and visible focus.
- Warn before leaving the page when there are unsaved editor changes.
- Keep command output compact and scannable; long output scrolls inside the terminal.

## Visual direction

Previous working decision: **modern developer-tool, dark-first**, single signal-green accent, crisp bordered
panels, monospace details, subtle glow/grid backgrounds, light theme included. Keep the interface quiet and
command-forward. Rebrand existing placeholder names (`Get-Skilled`, `shellcraft`) to **PowerShellish**.

Reference tokens (adapt, do not treat as immutable): near-black `#08090b`, surface `#101318`, line
`#232830`, text `#eef1f6`, muted `#9aa4b4`, accent `#3ddc97`; light equivalents. Type: Space Grotesk
(display), Inter (interface), JetBrains Mono (terminal/code).

## Technical conventions

- React 19 + Vite, JavaScript/JSX (no TypeScript currently), ESLint.
- Keep runtime dependencies minimal. Ask before adding any package.
- Use client-side navigation (History API) so the terminal session survives route changes; avoid full reloads.
- Proposed structure:

```text
src/
  App.jsx
  pages/          HomePage, TerminalPage, HelpPage
  components/     Terminal, FileEditor, WorkspaceTree, LocalSessionNotice, ConfirmDialog
  lib/
    commands/     registry, real, custom, help
    parser.js
    vfs.js
    storage.js
    zip.js
    paths.js
  data/           lessons, verbs, examples
  styles/
```

- Version storage schemas and handle migrations. Never silently discard user files.
- Verify changes with `npm run lint` and `npm run build`. Add Vitest for parser/VFS/registry tests when
  implementation starts (ask first).

## Phase 1 definition of done

- All three routes work and render a terminal using the shared command engine.
- Every required file command works with success and error output; deletion asks for confirmation.
- Workspace supports create/edit/rename/delete, import, single-file export, ZIP export, and clear-data.
- Workspace autosaves to IndexedDB where available; preferences persist; limits are honest.
- Real vs custom vs educational commands are visibly distinguished and help is registry-driven.
- Local Session notice appears exactly once per terminal page and compactly elsewhere.
- Keyboard accessible, responsive at 360/768/1280 px, no console errors, `lint` and `build` pass.
- Empty states and errors teach the next step instead of dumping raw failures.

## Roadmap guardrails

- **Phase 1 (build now):** routes, terminals, simulated commands, lessons, virtual workspace, editing,
  import/export, ZIP, local persistence, honest warnings.
- **Phase 2 (only when explicitly approved):** auth, database, profiles, cloud-saved progress, shared stories.
- **Phase 3 (only when explicitly approved):** secure real PowerShell execution, collaborative chat, community,
  optional AI tutoring, analytics.
- Never fake Phase 2/3 capabilities. If something is simulated, say so in the UI.

## Current status

- This repository currently contains a previous prototype (`Get-Skilled` landing page with a sandbox terminal).
- No PowerShellish workspace, command registry, persistence, or file operations exist yet.
- Next implementation step: build the command registry + shell layout + virtual filesystem, then wire the
  three routes and terminals around them.

## Open decisions

See the "Open questions" section of the full spec. The most important ones: navigation behavior for
`Get-Home`/`Start-Terminal`, the `Get-Help` real-cmdlet vs help-page relationship, ZIP library approval,
allowed file limits, and whether simple variables/pipelines are Phase 1 or stretch.
