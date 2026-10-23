# PowerShellish — Product Specification

**Status:** Saved from the project brief on 2026-10-23 and lightly structured. Phase 1 is not implemented yet.
This document is the detailed source of truth; [AGENTS.md](../AGENTS.md) is the short agent contract.

**One-line pitch:** A browser-only PowerShell learning playground where you can type commands, build a
virtual workspace, edit files, and export your work — without an account, a server, or a real shell.

---

## 1. Product overview

PowerShellish is a browser-based PowerShell learning and creative environment. Users can:

- learn and try PowerShell commands in a terminal;
- experiment safely without touching their real machine;
- create, edit, rename, import, export, and delete text files in a virtual workspace;
- write script drafts (`.ps1`), notes (`.txt`, `.md`), data files (`.json`, `.csv`), and other text formats;
- share knowledge and stories through PowerShell-inspired custom commands;
- download individual files or the whole workspace as a ZIP.

The experience combines three kinds of commands:

1. **Real PowerShell cmdlets**, simulated faithfully enough to teach syntax and behavior.
2. **Custom PowerShellish commands**, which perform real browser-side actions.
3. **Educational examples**, which explain concepts and are clearly marked as teaching material.

### Goals

- Make the first ten minutes with PowerShell feel safe, legible, and fun.
- Teach correct syntax, parameters, and expectations — not just trivia.
- Keep all data local and be honest about what "local" means.
- Make export a first-class action, not a hidden setting.

### Non-goals (Phase 1)

- Executing native PowerShell on the user's machine.
- Accounts, cloud storage, multi-device sync, or collaboration.
- Binary file editing or arbitrary file-system access.
- Being a replacement for a production shell or IDE.

---

## 2. Routes and page responsibilities

| Route        | Purpose                                             | Main command     | Terminal mode            |
| ------------ | --------------------------------------------------- | ---------------- | ------------------------ |
| `/`          | Landing page, introduction, quick demos              | `Get-Home`       | Compact mini-terminal    |
| `/terminal/` | Full interactive terminal and file workspace         | `Start-Terminal` | Full workspace terminal  |
| `/help/`     | Learning assistant, documentation, exercises         | `Get-Help`       | Learning terminal        |

### Requirements for every route

- A working terminal rendered by the **same command engine** used everywhere else.
- Consistent PowerShellish branding, wording, and status indicators.
- Compact Local Session notice (full notice on `/terminal/`).
- Clear path to the other routes and to the help/reference material.

### Page notes

- **Home:** a short explanation of the product plus a mini-terminal for immediate play. Keep the barrier to
  the first command as low as possible. Suggested starter chips: `Get-Help`, `Get-Location`,
  `Get-ChildItem`, `Help`.
- **Terminal:** the workspace. Terminal, file tree, editor, and local-session status are all visible.
  The full Local Session notice appears here exactly once.
- **Help:** teaching surface. `Get-Help` with no arguments introduces help topics, lessons, and examples.
  Examples are runnable in the learning terminal and are labeled with their category.

### Navigation commands

- `Get-Home` — custom command; navigates to `/`.
- `Start-Terminal` — custom command; navigates to `/terminal/`.
- `Get-Help` — **real cmdlet**; prints help. The help *page* is reached through navigation, not by
  overloading the cmdlet with routing side effects.

If client-side routing is used, preserve terminal/session state across route changes. Prefer History API
navigation over full page reloads.

---

## 3. Command system

### 3.1 Three categories

| Category    | What it means                                            | UI label             |
| ----------- | -------------------------------------------------------- | -------------------- |
| Real        | A real PowerShell cmdlet, simulated in this browser       | `Real · simulated`   |
| Custom      | A PowerShellish-defined command that performs an action   | `PowerShellish`      |
| Educational | A lesson/demo example; may be fictional                   | `Example`            |

Rules:

- Never present a simulated cmdlet as a live Windows shell command.
- Never present a custom or educational command as a real PowerShell cmdlet.
- Show the category in `Get-Help`, `Get-Command`, autocomplete, and learning content.
- Terminal status should make the simulated engine obvious (for example `Simulated engine`).

### 3.2 Verbs

| Verb         | Meaning in PowerShellish     | Typical use                       |
| ------------ | ---------------------------- | --------------------------------- |
| `Get-`       | Discover or retrieve         | read files, list items, help      |
| `Set-`       | Change or configure          | replace content, preferences      |
| `New-`       | Create something             | files, folders, challenges        |
| `Start-`     | Begin an activity            | open routes, start challenges     |
| `Stop-`      | End an activity              | stop a lesson or session          |
| `Find-`      | Search for something         | search files or topics            |
| `Send-`      | Deliver a message            | encouragement, feedback           |
| `Share-`     | Share knowledge              | notes, tips, stories              |
| `Publish-`   | Release a story              | publish a finished story          |
| `Learn-`     | Enter a learning activity    | lessons, guided exercises         |
| `Celebrate-` | Recognize progress           | milestones, completions           |
| `Imagine-`   | Explore a creative idea      | prompts, brainstorming            |
| `Dream-`     | Express an ambition          | goals, aspirations                |
| `Remember-`  | Recall a lesson              | review, spaced practice           |
| `Retry-`     | Try a different approach     | retry with a hint                 |

Use these verbs for new custom commands. Avoid inventing new verbs without updating this table.

### 3.3 Command registry

The registry is the single source of truth. It powers parsing, execution, help, discovery, autocomplete,
category labels, and validation.

Suggested entry shape:

```js
{
  name: 'New-Item',
  category: 'real', // 'real' | 'custom' | 'educational'
  summary: 'Create a file or folder in the workspace.',
  usage: 'New-Item -ItemType <File|Directory> -Path <path>',
  parameters: [
    { name: '-ItemType', required: true, values: ['File', 'Directory'] },
    { name: '-Path', required: true, aliases: ['-Name', '-LiteralPath'] },
  ],
  aliases: ['ni'],
  examples: [
    'New-Item -ItemType File -Path notes.txt',
    'New-Item -ItemType Directory -Path drafts',
  ],
  simulated: true,
  simulationNote: 'Simulated in your browser. No real file is created.',
  requiresConfirmation: false,
  run(context, args) { /* validates, mutates VFS, returns output */ },
}
```

Rules:

- Registration must validate `name`, `category`, `summary`, `usage`, `parameters`, and `run`.
- Duplicate names/aliases are an error.
- Alias resolution happens before dispatch.
- A command returns structured output (text, table, error, or a navigation/action request), not raw HTML.
- Unknown command → teaching error: what was typed, closest matches, and a valid next step.
- Unsupported syntax (for example an unimplemented pipeline) → explanation, not a crash.
- Never `eval()`, never construct functions from user input, never touch the real filesystem in Phase 1.

### 3.4 Parser rules

Minimum viable parser:

- Trim input; ignore empty lines (but keep them in history as typed).
- Support single and double quoted strings, including spaces and escaped quotes.
- Support `-Parameter value` pairs and boolean switches such as `-Force`.
- Support positional values for the documented file commands.
- Normalize paths relative to the current workspace directory.
- Respect parameter aliases from the registry.
- Report missing required parameters with the expected usage line.
- Pipelines: support only explicitly registered combinations in Phase 1; otherwise explain the limitation.
- Variables: optional Phase 1 stretch; if supported, keep them session-only and never execute arbitrary code.

### 3.5 Help and discovery

- `Get-Help` (no args) → overview, categories, available topics, and suggested commands.
- `Get-Help <command>` → name, category badge, summary, usage, parameters, examples, simulation note.
- `Get-Command` → searchable list of registered commands with category badges.
- Help content must be registry-driven; do not hand-write a parallel command list.
- Examples should offer a copy button and, where safe, a run button.

---

## 4. Virtual workspace and file operations

### 4.1 Model

- A versioned in-memory tree of files and folders, persisted to IndexedDB where available.
- Canonical internal paths (normalized, no `..` escapes, no absolute host paths).
- Display paths may look PowerShell-friendly (`C:\workspace`), but they are **virtual**.
- Every mutation updates metadata (`updatedAt`) and triggers a debounced autosave.
- Reject path traversal, invalid names, duplicate siblings, and reserved names.

Suggested schema:

```js
{
  version: 1,
  updatedAt: '2026-10-23T12:00:00.000Z',
  nodes: {
    byId: {
      'node_root': {
        id: 'node_root',
        type: 'directory',
        name: 'workspace',
        parentId: null,
        childIds: ['node_readme'],
        updatedAt: '...'
      },
      'node_readme': {
        id: 'node_readme',
        type: 'file',
        name: 'readme.md',
        parentId: 'node_root',
        content: '# My workspace',
        updatedAt: '...'
      }
    },
    rootId: 'node_root'
  }
}
```

### 4.2 Required commands

| Command                                                     | Behavior                                                                 |
| ----------------------------------------------------------- | ------------------------------------------------------------------------ |
| `New-Item -ItemType File -Path <path>`                      | Create an empty text file; error if it already exists.                    |
| `New-Item -ItemType Directory -Path <path>`                 | Create a folder (support nested paths only if parents exist).             |
| `Get-ChildItem [-Path <path>]`                              | List files/folders with type, name, and size or item count.                |
| `Set-Content -Path <path> -Value <text>`                    | Replace content; create the file if it does not exist.                    |
| `Add-Content -Path <path> -Value <text>`                    | Append a line/value; create the file if it does not exist.                |
| `Get-Content -Path <path>`                                  | Read the file, in the terminal or the editor.                             |
| `Remove-Item -Path <path>`                                  | Delete a file/folder after in-app confirmation. Folder dialog names the folder and warns contents are removed. |
| `Rename-Item -Path <path> -NewName <name>`                  | Rename in place; reject collisions and invalid names.                     |
| `Import-File`                                               | Open the browser file picker; copy selected supported text files into the current folder. |
| `Export-File -Path <path>`                                  | Download one workspace file (Blob + download link).                       |
| `Save-Changes [-Path <path>] [-Export]`                     | Commit the open editor buffer to the VFS; with `-Export`, also download.  |
| `Export-Workspace`                                          | Download the entire workspace as a ZIP, preserving folder structure.      |

### 4.3 Interaction rules

- `Remove-Item` always asks for confirmation in Phase 1, even when the real cmdlet would not.
  Do not implement `-Force` as a confirmation bypass. Show the exact path in the dialog.
- File and folder names are validated before mutation. Show the offending character when invalid.
- Errors include the expected syntax and a valid example.
- Imports with unsupported/binary content are rejected with a clear reason and no partial writes.
- `Import-File` must be initiated by a user gesture; a typed local path cannot be read directly.
- `Export-File` works even if storage is unavailable.
- `Export-Workspace` works without a backend; use a client-side ZIP library. Ask before adding `fflate`
  or an equivalent dependency.

### 4.4 Supported content

Text formats only. Proposed allowlist:

`.txt`, `.md`, `.ps1`, `.psm1`, `.psd1`, `.json`, `.csv`, `.log`, `.xml`, `.html`, `.css`, `.js`,
`.yml`, `.yaml`, `.ini`, `.config`

Limits (proposed, adjust with product approval):

- 1 MB per file.
- 20 MB per workspace (uncompressed).
- Reject files that look binary (for example NUL bytes or non-text MIME types).
- Surface partial-failure summaries when importing multiple files.

### 4.5 Import, export, and direct save

- **Import:** `<input type="file" multiple>` plus drag-and-drop where practical. Read as text, validate,
  then write into the workspace.
- **Export single file:** create a Blob and an `<a download>`; no network.
- **Export workspace:** generate a ZIP client-side with folder paths. Suggested filename
  `powershellish-workspace-YYYYMMDD-HHmm.zip`.
- **Direct save (progressive enhancement):** use the File System Access API (`showOpenFilePicker`,
  `showSaveFilePicker`, `showDirectoryPicker`) when available and only after an explicit user action.
  Always keep upload/download as the fallback. Never require the API.
- **Clear local data:** provide a confirmed action that removes workspace data and preferences, with a
  final warning and an export reminder.

---

## 5. Session, persistence, and data honesty

### 5.1 Storage layers

| Layer                  | Holds                                              | Lifetime                        |
| ---------------------- | -------------------------------------------------- | ------------------------------- |
| Session memory         | command history, variables, unsaved editor buffer  | until reload/close (not guaranteed) |
| `localStorage`         | theme, preferences, small UI state                 | until browser storage is cleared |
| IndexedDB              | workspace files, versioned schema                  | best effort; can be cleared     |
| Cloud / account        | nothing in Phase 1                                 | not available                   |

Rules:

- Autosave the workspace to IndexedDB with a short debounce and on `pagehide` where possible.
- Detect storage failure or unavailability (private mode, quota) and show a degraded-mode warning.
- Never silently discard user files during migrations. Version the schema and migrate forward.
- Warn before leaving with unsaved editor changes (`beforeunload` when needed).
- Provide an in-app storage status indicator: saved / saving / unavailable.

### 5.2 Required Local Session notice

Full notice, shown on `/terminal/`:

> **Local session — no cloud backup**
> PowerShellish is currently running without user accounts or cloud storage. Your work may not be saved
> permanently. Browser data can be cleared, and closing or refreshing the page may affect unsaved session
> data.
>
> Use **Export-File** or download your workspace regularly to keep a copy of your work.

Compact version on other pages:

> Local session · no cloud backup · Export-File to keep your work

Implementation rules:

- Show the full notice exactly once per terminal page. The compact version may also appear in the header
  or footer elsewhere.
- Do not claim that every refresh destroys all progress.
- Do not imply that persistence is guaranteed.
- If storage works, say that autosave is best effort, not a backup.
- Encourage export as the reliable backup.

---

## 6. UX and content guidelines

### 6.1 Wording

- Use PowerShell vocabulary where it helps (`cmdlet`, `parameter`, `pipeline`, `workspace`, `prompt`).
- Pair every technical term with a plain-language explanation the first time it appears.
- Use verbs/nouns consistently (`Get-Help`, `Export-File`), and keep casing stable.
- Say "simulated in your browser" wherever a real cmdlet is demonstrated.
- Never invent claims about Windows behavior. If behavior is simplified, say so.

### 6.2 Beginner-friendly behavior

- Show the syntax and one runnable example next to each command.
- Prefer click-to-run chips for the first interaction; typing is the goal, not a gate.
- Errors teach: what went wrong, what PowerShellish expected, and what to try next.
- Empty states suggest the next command instead of showing a blank panel.
- Keep output compact; long tables scroll inside the terminal.
- Show category badges and simulation notes in help, not buried in docs.

### 6.3 Safety and honesty

- Destructive actions use an accessible in-app dialog, never `window.confirm`.
- Folder deletion explicitly warns that contents are removed.
- Import/export explains that files stay on the device.
- Storage warnings are persistent but not alarmist; they must be accurate.

### 6.4 Accessibility and responsiveness

- Keyboard-first terminal: Enter runs, Up/Down recalls history, focus is visible.
- `aria-live="polite"` for terminal output; appropriate roles for the log.
- Dialog focus trap, Escape to close, labelled actions.
- Category information is text, not color alone.
- Test at 360 px, 768 px, and 1280 px.
- Respect `prefers-reduced-motion`; avoid gratuitous animation.
- Sufficient contrast in both dark and light themes.

---

## 7. Visual design direction

Working decision from the redesign session: **modern developer-tool, dark-first**.

- Near-black background, layered surfaces, 1px borders, crisp panels.
- One signal-green accent used for actions, prompts, focus, and success.
- Monospace details for commands and terminal UI; clean sans for interface copy.
- Subtle grid/glow atmosphere; no decorative noise that competes with commands.
- Light theme included and fully usable.
- The interface should feel quiet, fast, and command-forward.

Reference tokens (adapt as the design matures):

| Token         | Dark      | Light     |
| ------------- | --------- | --------- |
| `--bg`        | `#08090b` | `#f4f6f2` |
| `--surface`   | `#101318` | `#ffffff` |
| `--line`      | `#232830` | `#dfe4da` |
| `--text`      | `#eef1f6` | `#0f1410` |
| `--muted`     | `#9aa4b4` | `#5a6459` |
| `--accent`    | `#3ddc97` | `#0e8f4d` |

Type pairing: **Space Grotesk** (display), **Inter** (interface), **JetBrains Mono** (terminal/code).

Branding: use **PowerShellish**. Replace previous placeholder names (`Get-Skilled`, `shellcraft`) wherever
they remain. Suggested mark: `>_` in a rounded accent tile, with terminal-inspired corner details.

---

## 8. Proposed architecture

```text
src/
  App.jsx                  route shell + shared state providers
  pages/
    HomePage.jsx
    TerminalPage.jsx
    HelpPage.jsx
  components/
    Terminal.jsx           shared terminal renderer + input
    WorkspaceTree.jsx
    FileEditor.jsx
    LocalSessionNotice.jsx
    ConfirmDialog.jsx
    CommandHelp.jsx
  lib/
    commands/
      registry.js          register/resolve/validate/execute
      real.js              simulated real cmdlets
      custom.js            PowerShellish commands
      help.js              registry-driven help output
    parser.js             tokenize, parse args/params
    paths.js              normalize/join/display paths
    vfs.js                tree operations (create/read/write/list/rename/remove)
    storage.js            IndexedDB + localStorage adapters, migrations
    zip.js                client-side ZIP export
    format.js             tables, badges, error formatting
  data/
    lessons.js
    examples.js
  styles/
    index.css
    app.css
```

Data flow:

- `CommandContext` provides `{ vfs, session, navigate, notify, confirm, download, openFilePicker, editor }`.
- `Terminal` handles input/history; `registry.dispatch()` handles validation and execution.
- `vfs` emits change events; `storage` debounces persistence; UI subscribes to workspace state.
- `navigate` uses History API so session state survives route changes.

Implementation notes:

- No TypeScript yet; keep modules small and documented through clear names.
- No `eval` or dynamic code execution of user input.
- Keep command output structured so the UI can render tables, badges, and links consistently.
- Avoid installing a router or ZIP library without approval. A minimal History API router is acceptable.

---

## 9. Phase 1 acceptance criteria

1. `/`, `/terminal/`, and `/help/` all render a working terminal powered by the shared registry.
2. Every required file command works, including success, validation, and error output.
3. `Remove-Item` uses an accessible confirmation dialog; folder deletion warns about contents.
4. Create, edit, rename, delete, import, single-file export, ZIP export, and clear-data all work.
5. Workspace autosaves to IndexedDB when available; preferences persist in localStorage.
6. Storage-unavailable mode is detected and explained; export is still possible.
7. Full Local Session notice appears on `/terminal/`; compact notice elsewhere. No false claims.
8. Real, custom, and educational commands are visibly distinct; `Get-Help` and `Get-Command` are
   registry-driven.
9. `Get-Home` and `Start-Terminal` navigate; `Get-Help` teaches.
10. Unknown commands and unsupported syntax return helpful teaching messages, never stack traces.
11. Keyboard accessible and responsive at 360/768/1280 px; no console errors.
12. `npm run lint` and `npm run build` pass.

Recommended but not required to start: Vitest tests for parser, path normalization, VFS mutations, command
registry validation, and storage migrations.

---

## 10. Roadmap

### Phase 1 — build now

Three routes, shared terminal engine, simulated real cmdlets, custom commands, educational lessons,
virtual workspace, file editing, import/export, ZIP, local persistence, honest Local Session warnings.

### Phase 2 — only when explicitly approved

Authentication, database, user profiles, cloud-saved progress, cross-device workspaces, shared stories.

### Phase 3 — only when explicitly approved

Secure execution of real PowerShell, collaborative chat, community features, optional AI tutoring,
learning analytics.

Guardrails:

- Never fake Phase 2/3 capabilities in the UI.
- Never claim cloud sync, guaranteed recovery, or native execution while they do not exist.
- When a feature is simulated, label it in the interface.

---

## 11. Open questions

1. **Routing:** build a small History API router or add `react-router-dom`? (Dependency needs approval.)
2. **`Get-Help` precedence:** confirm that the cmdlet always prints help and never navigates, while the
   Help route is reached via navigation links and `Get-Home`/`Start-Terminal`.
3. **ZIP library:** approve `fflate` (small, fast, no server) or choose an alternative.
4. **File limits:** confirm 1 MB per file / 20 MB per workspace and the supported-extension allowlist.
5. **Variables and pipelines:** must-have Phase 1 or clearly labeled stretch? Recommended: support simple
   variables and a curated set of pipeline examples, then expand.
6. **Persistence scope:** should command history persist across reloads via localStorage, or stay
   session-only? Recommended: session-only in Phase 1, with workspace autosave in IndexedDB.
7. **Branding:** is "PowerShellish" final, and should the `.ps1`/terminal mark direction be adopted?
8. **File System Access API:** offer "Open local file" / "Save directly" when supported, or defer until
   after Phase 1 export flows are solid? Recommended: defer direct save if it delays Phase 1.

---

## 12. Change log

- **2026-10-23** — Captured the product brief from chat, organized it into this spec, added the registry
  contract, workspace schema, acceptance criteria, accessibility requirements, design tokens, proposed
  architecture, and open questions so future sessions can work without the original conversation.
