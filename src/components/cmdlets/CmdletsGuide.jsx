import { list } from '../../lib/commands/registry'

function badgeClass(cat) {
  if (cat === 'real') return 'cmdlet-badge real'
  if (cat === 'custom') return 'cmdlet-badge custom'
  if (cat === 'educational') return 'cmdlet-badge educational'
  return 'cmdlet-badge'
}

function badgeText(cat) {
  if (cat === 'real') return 'Real (simulated)'
  if (cat === 'custom') return 'Custom'
  if (cat === 'educational') return 'Educational'
  return cat
}

export default function CmdletsGuide({ onRun }) {
  const commands = list()

  const groups = [
    { id: 'discovery', title: 'Discovery & Help', filter: (c) => ['Get-Command', 'Get-Help', 'Get-Alias', 'Get-Member'].includes(c.name) || c.name.startsWith('Get-Help') },
    { id: 'nav', title: 'Navigation', filter: (c) => ['Get-Location', 'Set-Location', 'Push-Location', 'Pop-Location'].includes(c.name) || ['pwd', 'cd', 'pushd', 'popd'].some(a => (c.aliases||[]).includes(a)) },
    { id: 'files', title: 'Files & Folders', filter: (c) => ['Get-ChildItem', 'New-Item', 'Get-Content', 'Set-Content', 'Add-Content', 'Copy-Item', 'Move-Item', 'Rename-Item', 'Remove-Item', 'Test-Path'].includes(c.name) },
    { id: 'pipe', title: 'Piping & Filtering', filter: (c) => ['Where-Object', 'ForEach-Object', 'Select-Object', 'Sort-Object', 'Group-Object', 'Measure-Object', 'Format-Table', 'Format-List', 'Out-File', 'Export-Csv'].includes(c.name) },
    { id: 'system', title: 'System & Info', filter: (c) => ['Get-Process', 'Get-Service', 'Get-Date', 'Get-Random', 'Clear-Host'].includes(c.name) },
    { id: 'workspace', title: 'Workspace Tools', filter: (c) => ['Import-File', 'Export-File', 'Save-Changes', 'Export-Workspace', 'Clear-Workspace', 'Undo-Workspace'].includes(c.name) },
    { id: 'fun', title: 'Fun & Creative', filter: (c) => c.category === 'custom' && !['Import-File', 'Export-File', 'Save-Changes', 'Export-Workspace', 'Clear-Workspace', 'Undo-Workspace', 'Get-Home', 'Start-Terminal', 'Set-Name', 'Open-Tutorial', 'Get-Pli5'].includes(c.name) },
    { id: 'all', title: 'All Commands', filter: () => true },
  ]

  return (
    <section id="cmdlets-guide" className="cmdlets-section">
      <header className="section-header">
        <div>
          <span className="section-kicker">CMDLETS GUIDE</span>
          <h2>Cmdlets List & Guide</h2>
          <p>Every command available in PowerShellish. Click "Run" to load it into the help terminal.</p>
        </div>
      </header>

      {groups.map(group => {
        const entries = commands.filter(c => group.filter(c)).sort((a,b) => a.name.localeCompare(b.name))
        if (!entries.length) return null
        return (
          <div key={group.id} className="cmdlet-group">
            <header className="cmdlet-group-header">
              <h3>{group.title}</h3>
              <span>{entries.length} commands</span>
            </header>
            <div className="cmdlet-grid">
              {entries.map(cmd => (
                <article key={cmd.name} className="cmdlet-card">
                  <div className="cmdlet-card-top">
                    <div className="cmdlet-name-wrap">
                      <span className="cmdlet-dot" />
                      <h4>{cmd.name}</h4>
                    </div>
                    <span className={badgeClass(cmd.category)}>{badgeText(cmd.category)}</span>
                  </div>
                  <p className="cmdlet-summary">{cmd.summary}</p>
                  {cmd.usage && <code className="cmdlet-usage">{cmd.usage}</code>}
                  {cmd.aliases?.length ? (
                    <div className="cmdlet-aliases">
                      <span>Aliases:</span> {cmd.aliases.join(', ')}
                    </div>
                  ) : null}
                  {cmd.examples?.[0] && (
                    <button type="button" className="cmdlet-run" onClick={() => onRun?.(cmd.examples[0])}>
                      Run example →
                    </button>
                  )}
                </article>
              ))}
            </div>
          </div>
        )
      })}
    </section>
  )
}
