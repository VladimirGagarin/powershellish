import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import HomePage from './pages/HomePage'
import TerminalPage from './pages/TerminalPage'
import HelpPage from './pages/HelpPage'
import ConfirmDialog from './components/ConfirmDialog'
import { createVfs, getPath, importFiles, listChildren, newItem, readFile, removeItem, renameItem, writeFile } from './lib/vfs'
import { createEngine } from './lib/engine'
import * as registry from './lib/commands/registry'
import { registerPowerShellLogics } from './lib/commands/powershelllogics'
import { registerPseudoLogics } from './lib/commands/pseudologic'
import { loadTheme, saveTheme, loadWorkspace, saveWorkspace, clearWorkspace as clearWorkspaceStorage, loadUserName, saveUserName } from './lib/storage'
import { downloadText } from './lib/zip'
import { getPage, routeHref } from './lib/routes'

registerPowerShellLogics()
registerPseudoLogics()

export default function App() {
  const [page, setPage] = useState(getPage)
  const [theme, setTheme] = useState(() => {
    const saved = loadTheme()
    if (saved) return saved
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'
    return 'light'
  })
  const [nodes, setNodes] = useState(() => createVfs())
  const [session, setSession] = useState({ cwd: '', history: [], editorBuffer: '' })
  const [userName, setUserName] = useState(loadUserName)
  const [editor, setEditor] = useState({ open: false, path: '', content: '' })
  const [deleteRequest, setDeleteRequest] = useState(null)
  const [clearRequest, setClearRequest] = useState(false)
  const [clipboardText, setClipboardText] = useState(null)
  const [clipboardNotice, setClipboardNotice] = useState('')
  const [exportRequest, setExportRequest] = useState(null)
  const [exportPath, setExportPath] = useState('')
  const [exportFormat, setExportFormat] = useState('raw')
  const saveTimerRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    saveTheme(theme)
  }, [theme])

  useEffect(() => {
    loadWorkspace().then((snapshot) => {
      if (snapshot) setNodes(snapshot)
    })
  }, [])

  const autosave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      saveWorkspace(nodes)
    }, 600)
  }, [nodes])

  useEffect(() => {
    autosave()
  }, [nodes, autosave])

  useEffect(() => {
    const onPop = () => setPage(getPage())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const navigate = useCallback((to) => {
    const target = to.endsWith('/') ? to : `${to}/`
    const href = routeHref(target)
    if (window.location.pathname !== href) {
      window.history.pushState({}, '', href)
    }
    setPage(getPage())
  }, [])

  const vfsApi = useMemo(() => ({
    nodes,
    list: (path, cwd) => listChildren(nodes, path, cwd),
    read: (path, cwd) => readFile(nodes, path, cwd),
    write: (path, content, cwd, append) => {
      const res = writeFile(nodes, path, content, cwd, append)
      if (res.ok) setNodes(res.nodes)
      return res
    },
    newItem: (itemType, path, cwd) => {
      const res = newItem(nodes, itemType, path, cwd)
      if (res.ok) setNodes(res.nodes)
      return res
    },
    remove: (path, cwd, confirmed = false) => {
      const res = removeItem(nodes, path, cwd, confirmed)
      if (res.ok) setNodes(res.nodes)
      return res
    },
    rename: (path, newName, cwd) => {
      const res = renameItem(nodes, path, newName, cwd)
      if (res.ok) setNodes(res.nodes)
      return res
    },
  }), [nodes])

  const actions = useMemo(() => ({
    autosave,
    navigate,
    requestDelete: (req) => setDeleteRequest(req),
    requestClearWorkspace: () => setClearRequest(true),
    openClipboard: (text) => { setClipboardText(text); setClipboardNotice('') },
    setUserName: (name) => {
      const saved = saveUserName(name)
      setUserName(name)
      return saved
    },
    openExport: ({ path = '', format = 'raw' } = {}) => {
      setExportPath(path)
      setExportFormat(format)
      setExportRequest({})
    },
    openImport: () => {
      if (fileInputRef.current) fileInputRef.current.click()
    },
  }), [autosave, navigate])

  const engineSession = useMemo(() => ({ ...session, userName }), [session, userName])
  const engine = useMemo(() => createEngine({
    vfs: vfsApi,
    session: engineSession,
    registry,
    paths: { displayPath: (p) => (p ? `C:\\workspace\\${p.replace(/\//g, '\\')}` : 'C:\\workspace') },
    navigate,
    actions,
  }), [vfsApi, navigate, actions, engineSession])

  function onOpenFile(path) {
    const result = vfsApi.read(path, session.cwd)
    if (result.error) return
    setSession((prev) => ({ ...prev, editorBuffer: result.content }))
    setEditor({ open: true, path, content: result.content })
  }

  function onSaveEditor() {
    if (!editor.path) return
    const res = vfsApi.write(editor.path, editor.content, session.cwd, false)
    if (res.ok) setSession((prev) => ({ ...prev, editorBuffer: editor.content }))
  }

  function onExportEditor() {
    if (!editor.path) return
    downloadText(editor.path.split('/').pop() || 'file.txt', editor.content || '')
  }

  const exportFiles = Object.values(nodes.byId)
    .filter((node) => node.type === 'file')
    .map((node) => ({ path: getPath(nodes, node.id), name: node.name }))
  const selectedExportPath = exportPath || exportFiles[0]?.path || ''
  const selectedExportFile = exportFiles.find((file) => file.path === selectedExportPath)
  const currentExportExtension = selectedExportFile?.name.includes('.')
    ? `.${selectedExportFile.name.split('.').pop()}`
    : 'No extension'
  const userDisplayName = [userName?.first, userName?.last].filter(Boolean).join(' ')

  function onConfirmExport() {
    if (!selectedExportPath) return
    const result = vfsApi.read(selectedExportPath, '')
    if (result.error) return
    let content = result.content || ''
    if (exportFormat === 'json') {
      try {
        content = JSON.stringify(JSON.parse(content), null, 2)
      } catch {
        content = JSON.stringify(content, null, 2)
      }
    }
    const sourceName = selectedExportPath.split('/').pop() || 'file'
    const stem = sourceName.replace(/\.[^.]*$/, '') || sourceName
    const fileName = exportFormat === 'raw' ? sourceName : `${stem}.${exportFormat === 'json' ? 'json' : 'txt'}`
    downloadText(fileName, content)
    setExportRequest(null)
  }

  function onCloseEditor() {
    setEditor({ open: false, path: '', content: '' })
  }

  function onConfirmDelete() {
    if (!deleteRequest) return
    const res = vfsApi.remove(deleteRequest.path, session.cwd, true)
    if (res.ok) setNodes(res.nodes)
    setDeleteRequest(null)
  }

  function onCancelDelete() {
    setDeleteRequest(null)
  }

  function onConfirmClear() {
    setNodes(createVfs())
    clearWorkspaceStorage()
    setClearRequest(false)
    setEditor({ open: false, path: '', content: '' })
    setSession({ cwd: '', history: [], editorBuffer: '' })
  }

  function onCancelClear() {
    setClearRequest(false)
  }

  function onImportFiles(e) {
    const input = e.target
    const fileList = Array.from(input.files || [])
    Promise.all(fileList.map((file) => file.text().then((text) => ({ name: file.name, text })))).then((files) => {
      const res = importFiles(nodes, files, session.cwd)
      if (res.ok) setNodes(res.nodes)
    })
    input.value = ''
  }

  function onRefresh() {
    setNodes((n) => JSON.parse(JSON.stringify(n)))
  }

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="header-inner">
          <a className="brand" href={routeHref('/')} onClick={(e) => { e.preventDefault(); navigate('/') }}>
            <span className="brand-mark">&gt;_</span>
            <span className="brand-text">PowerShellish</span>
          </a>
          <nav className="app-nav">
            <a href={routeHref('/')} className={page === '/' ? 'active' : ''} onClick={(e) => { e.preventDefault(); navigate('/') }}>Home</a>
            <a href={routeHref('/terminal/')} className={page === '/terminal/' ? 'active' : ''} onClick={(e) => { e.preventDefault(); navigate('/terminal/') }}>Terminal</a>
            <a href={routeHref('/help/')} className={page === '/help/' ? 'active' : ''} onClick={(e) => { e.preventDefault(); navigate('/help/') }}>Help</a>
          </nav>
          <div className="header-actions">
            <button type="button" className="theme-toggle" onClick={() => setTheme((t) => t === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? '☀ Light' : '☾ Dark'}
            </button>
            <a className="header-cta" href={routeHref('/terminal/')} onClick={(e) => { e.preventDefault(); navigate('/terminal/') }}>Open Workspace ↗</a>
          </div>
        </div>
      </header>

      <main className="app-main">
        {page === '/' && <HomePage engine={engine} cwd={session.cwd} userName={userName} />}
        {page === '/terminal/' && (
          <TerminalPage
            engine={engine}
            cwd={session.cwd}
            userName={userName}
            nodes={nodes}
            onOpenFile={onOpenFile}
            editor={editor}
            setEditor={setEditor}
            onSaveEditor={onSaveEditor}
            onExportEditor={onExportEditor}
            onCloseEditor={onCloseEditor}
            clearRequest={clearRequest}
            onConfirmClear={onConfirmClear}
            onCancelClear={onCancelClear}
            onImport={() => fileInputRef.current?.click()}
            onRefresh={onRefresh}
          />
        )}
        {page === '/help/' && <HelpPage engine={engine} cwd={session.cwd} userName={userName} />}
      </main>

      <ConfirmDialog
        open={!!deleteRequest}
        title={deleteRequest?.kind === 'directory' ? 'Delete folder' : 'Delete file'}
        description={deleteRequest ? `${userName?.first ? `${userName.first}, you're about to delete ${deleteRequest.kind === 'directory' ? 'folder' : 'file'} "${deleteRequest.path}".` : `You're about to delete ${deleteRequest.kind === 'directory' ? 'folder' : 'file'} "${deleteRequest.path}".`}${deleteRequest.kind === 'directory' ? (deleteRequest.count ? ` This folder and all ${deleteRequest.count} contained item(s) will be removed.` : ' This empty folder will be removed.') : ' This file will be removed from your PowerShellish workspace.'} This cannot be undone here.` : ''}
        confirmLabel="Remove"
        cancelLabel="Keep item"
        danger
        onConfirm={onConfirmDelete}
        onCancel={onCancelDelete}
      />

      <footer className="app-footer">
        <div className="footer-inner">
          <span>PowerShellish · Browser-only · Simulated engine</span>
          <span>No accounts · No cloud · Export to back up your work</span>
          <a href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Back to top ↑</a>
        </div>
      </footer>

      {clipboardText !== null && (
        <div className="dialog-backdrop" onClick={() => setClipboardText(null)}>
          <section className="dialog clipboard-dialog" role="dialog" aria-modal="true" aria-labelledby="clipboard-title" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header"><div className="dialog-dot" /><h3 id="clipboard-title">Share text</h3></div>
            <p className="dialog-description">{userName?.first ? `${userName.first}, this text came from your PowerShellish workspace. Copy uses your browser clipboard.` : 'This text came from your PowerShellish workspace. Copy uses your browser clipboard.'}</p>
            <textarea className="clipboard-preview" readOnly value={clipboardText} aria-label="Text to share" />
            {clipboardNotice && <p role="status" className="dialog-description">{clipboardNotice}</p>}
            <div className="dialog-actions">
              <button type="button" className="dialog-btn dialog-btn-ghost" onClick={() => setClipboardText(null)}>Close</button>
              {typeof navigator !== 'undefined' && navigator.share && <button type="button" className="dialog-btn dialog-btn-ghost" onClick={async () => { try { await navigator.share({ text: clipboardText }); setClipboardNotice('Shared successfully.') } catch (error) { if (error.name !== 'AbortError') setClipboardNotice('Sharing was unavailable. You can still copy the text.') } }}>Share</button>}
              <button type="button" className="dialog-btn dialog-btn-primary" onClick={async () => { try { await navigator.clipboard.writeText(clipboardText); setClipboardNotice('Copied to clipboard.') } catch { setClipboardNotice('Clipboard access was blocked. Select the text above and copy it manually.') } }}>Copy to clipboard</button>
            </div>
          </section>
        </div>
      )}

      {exportRequest !== null && (
        <div className="dialog-backdrop" onClick={() => setExportRequest(null)}>
          <section className="dialog export-dialog" role="dialog" aria-modal="true" aria-labelledby="export-title" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header"><div className="dialog-dot" /><h3 id="export-title">Export workspace file</h3></div>
            {exportFiles.length ? (
              <>
                <label className="export-field">File
                  <select value={selectedExportPath} onChange={(e) => setExportPath(e.target.value)}>
                    {exportFiles.map((file) => <option key={file.path} value={file.path}>{file.path}</option>)}
                  </select>
                </label>
                <p className="dialog-description">{userName?.first ? `${userName.first}, what file format would you like to download? ` : 'What file format would you like to download? '}Current file format: <strong>{currentExportExtension}</strong></p>
                <label className="export-field">Download format
                  <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}>
                    <option value="raw">Raw · keep current format and content</option>
                    <option value="txt">TXT · use a .txt extension</option>
                    <option value="json">JSON · create valid .json output</option>
                  </select>
                </label>
                <p className="dialog-description">JSON exports preserve valid JSON data. Other text is exported as a JSON string. Downloads happen on this device.</p>
              </>
            ) : (
              <p className="dialog-description">There are no files in the workspace yet. Create or import a file, then run Export-File again.</p>
            )}
            <div className="dialog-actions">
              <button type="button" className="dialog-btn dialog-btn-ghost" onClick={() => setExportRequest(null)}>Cancel</button>
              <button type="button" className="dialog-btn dialog-btn-primary" disabled={!exportFiles.length} onClick={onConfirmExport}>Download</button>
            </div>
          </section>
        </div>
      )}

      <input ref={fileInputRef} type="file" multiple accept=".txt,.md,.ps1,.psm1,.psd1,.json,.csv,.log,.xml,.html,.css,.js,.yml,.yaml,.ini,.config" style={{ display: 'none' }} onChange={onImportFiles} />
    </div>
  )
}
