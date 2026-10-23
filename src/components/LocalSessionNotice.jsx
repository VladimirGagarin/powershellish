export default function LocalSessionNotice({ full = false, className = '' }) {
  if (full) {
    return (
      <aside className={`local-notice local-notice-full ${className}`} role="note">
        <div className="notice-header">
          <span className="notice-dot" />
          <strong>Local session — no cloud backup</strong>
        </div>
        <p>
          PowerShellish is currently running without user accounts or cloud storage. Your work may not be saved permanently.
          Browser data can be cleared, and closing or refreshing the page may affect unsaved session data.
        </p>
        <p>
          Use <strong>Export-File</strong> or download your workspace regularly to keep a copy of your work.
        </p>
      </aside>
    )
  }
  return (
    <div className={`local-notice local-notice-compact ${className}`} role="note">
      Local session · no cloud backup · Export-File to keep your work
    </div>
  )
}
