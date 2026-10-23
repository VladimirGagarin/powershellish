# PowerShellish

A browser-only PowerShell learning and creative environment. Learn commands, experiment in a safe virtual workspace, create and edit files, write scripts, and export your work — with no account, no server, and no cloud sync in Phase 1.

## Features

- **Three routes:** `/` (Home), `/terminal/` (Workspace), `/help/` (Learning)
- **Simulated terminal:** Real PowerShell cmdlets, custom PowerShellish commands, and educational examples in one engine
- **Virtual workspace:** Create, edit, rename, delete files and folders in an in-browser filesystem
- **Import/Export:** Import local text files, export single files, or download the whole workspace as a ZIP
- **Local-first:** Autosaves to IndexedDB (best effort), preferences in localStorage, with honest "Local session" warnings
- **Dark-first redesign:** Modern developer-tool UI with light theme included

## Commands (highlights)

- File ops: `New-Item`, `Get-ChildItem`, `Get-Content`, `Set-Content`, `Add-Content`, `Remove-Item`, `Rename-Item`
- Workspace: `Import-File`, `Export-File`, `Save-Changes`, `Export-Workspace`, `Clear-Workspace`
- Navigation: `Get-Home`, `Start-Terminal`, `Get-Help`, `Get-Command`

## Development

```bash
npm install
npm run dev
npm run build
npm run lint
```

See [AGENTS.md](AGENTS.md) and [docs/POWERSHELLISH-SPEC.md](docs/POWERSHELLISH-SPEC.md) for the full specification.

