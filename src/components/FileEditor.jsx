export default function FileEditor({ path, content, onChange, onSave, onExport, onClose }) {
  const name = path ? path.split('/').pop() : 'untitled'

  return (
    <section className="file-editor">
      <header className="file-editor-header">
        <div className="file-editor-title">
          <span className="file-editor-dot" />
          <span>{name}</span>
          {path && <code>{path}</code>}
        </div>
        <div className="file-editor-actions">
          <button type="button" onClick={onSave}>Save</button>
          <button type="button" onClick={onExport}>Export</button>
          <button type="button" onClick={onClose}>Close</button>
        </div>
      </header>
      <textarea
        className="file-editor-textarea"
        value={content}
        onChange={(e) => onChange?.(e.target.value)}
        spellCheck="false"
        placeholder="Start typing..."
        aria-label="File editor"
      />
      <footer className="file-editor-footer">
        <span>Text file · simulated workspace</span>
        <span>{content.length} chars</span>
      </footer>
    </section>
  )
}
