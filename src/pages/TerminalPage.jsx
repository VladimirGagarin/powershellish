import Terminal from '../components/Terminal'
import LocalSessionNotice from '../components/LocalSessionNotice'
import WorkspaceTree from '../components/WorkspaceTree'
import FileEditor from '../components/FileEditor'
import ConfirmDialog from '../components/ConfirmDialog'

export default function TerminalPage({ engine, cwd, nodes, userName, onOpenFile, editor, setEditor, onSaveEditor, onExportEditor, onCloseEditor, clearRequest, onConfirmClear, onCancelClear, onImport, onRefresh, onUndo, undoCount }) {
  return (
    <div className="page page-terminal">
      <header className="terminal-page-header">
        <div>
          <span className="section-kicker">FULL WORKSPACE · SIMULATED ENGINE</span>
          <h1>Workspace terminal</h1>
          <p>Create files, edit scripts, import local text files, and export everything as a ZIP. Use <code>Export-File</code> or <code>Export-Workspace</code> to keep a backup.</p>
        </div>
        <LocalSessionNotice full />
      </header>

      <div className="terminal-layout">
        <WorkspaceTree nodes={nodes} cwd={cwd} onOpen={onOpenFile} onRefresh={onRefresh} />
        <div className="terminal-main">
          <Terminal engine={engine} cwd={cwd} mode="full" idPrefix="workspace" userName={userName} />
          {editor.open && (
            <FileEditor
              path={editor.path}
              content={editor.content}
              onChange={(value) => setEditor((prev) => ({ ...prev, content: value }))}
              onSave={() => onSaveEditor()}
              onExport={() => onExportEditor()}
              onClose={() => onCloseEditor()}
            />
          )}
        </div>
      </div>

      <div className="terminal-actions">
        <button type="button" onClick={onUndo} disabled={!undoCount} title="Restore the previous workspace state">Undo workspace{undoCount ? ` · ${undoCount}` : ''}</button>
        <button type="button" onClick={onImport}>Import-File</button>
        <button type="button" onClick={() => engine.execute('Export-Workspace')}>Export-Workspace</button>
        <button type="button" onClick={() => engine.execute('Get-ChildItem')}>Get-ChildItem</button>
        <button type="button" onClick={() => engine.execute('Get-Help')}>Get-Help</button>
      </div>

      <ConfirmDialog
        open={!!clearRequest}
        title="Clear workspace data"
        description="This removes local workspace files and editor buffers from this browser. Preferences may remain. Export your workspace first if you want to keep a copy."
        confirmLabel="Clear local data"
        cancelLabel="Cancel"
        danger
        onConfirm={onConfirmClear}
        onCancel={onCancelClear}
      />
    </div>
  )
}
