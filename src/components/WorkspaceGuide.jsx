import { useEffect, useRef, useState } from 'react'

const examples = [
  { command: 'Get-Location', label: 'Show where I am' },
  { command: 'Get-ChildItem', label: 'See files and folders here' },
  { command: 'New-Item script.js', label: 'Create a file here' },
  { command: 'mkdir newFolder', label: 'Create a folder here' },
  { command: 'cd newFolder', label: 'Go into that folder' },
  { command: 'cd ..', label: 'Go up one folder' },
]

export default function WorkspaceGuide({ currentPath, rootPath = 'C:\\PS\\guest', defaultPath = `${rootPath}\\workspace`, canGoUp, forceRootChoice, guideMode, directories = [], onChoose, onCreateWorkingDirectory, onClose }) {
  const closeRef = useRef(null)
  const [newDirectoryName, setNewDirectoryName] = useState('newFolder')

  useEffect(() => {
    closeRef.current?.focus()
    function onKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="dialog-backdrop workspace-guide-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="dialog workspace-guide" role="dialog" aria-modal="true" aria-labelledby="workspace-guide-title" aria-describedby="workspace-guide-description">
        <header className="workspace-guide-heading">
          <span className="section-kicker">YOUR LOCAL WORKSPACE</span>
          <h2 id="workspace-guide-title">A quick map before you start</h2>
        </header>
        <p id="workspace-guide-description" className="dialog-description">
          {guideMode === 'create-workspace'
            ? <>You are at your user folder. Create and open a named project folder here. Your default workspace is kept in <code>workspace</code>; use <code>cd workspace</code> to return.</>
            : guideMode === 'recovery'
              ? <>Your previous folder is unavailable. Choose the workspace root or another folder before creating files. Everything here stays in PowerShellish’s virtual workspace in this browser.</>
              : <>Your files live in PowerShellish’s virtual <code>workspace</code> folder in this browser. They do not change files on your computer.</>}
        </p>
        <div className="workspace-guide-locations">
          <div><span>Current location</span><code>{currentPath}</code></div>
          <div><span>Default location</span><code>{defaultPath}</code></div>
        </div>
        <p className="workspace-guide-hint">Create files or folders here, or move between folders. Choose an example to put it in the terminal, then press Enter.</p>
        <div className="workspace-guide-directory-picker">
          <strong>Choose a working directory</strong>
          <div>
            {(currentPath !== defaultPath || forceRootChoice) && <button type="button" onClick={() => onChoose('Set-Location')}>Use default workspace <code>{defaultPath}</code></button>}
            {directories.map((directory) => (
              <button key={directory.path} type="button" onClick={() => onChoose(`Set-Location -Path "${directory.path}"`)}>
                {directory.name}<code>{directory.path}</code>
              </button>
            ))}
            {(forceRootChoice || currentPath === defaultPath) && directories.length === 0 && <span className="workspace-guide-no-folders">No folders here yet. Create one with <code>mkdir newFolder</code>.</span>}
          </div>
        </div>
        <form className="workspace-guide-new-directory" onSubmit={(event) => { event.preventDefault(); if (newDirectoryName.trim()) onCreateWorkingDirectory?.(newDirectoryName.trim()) }}>
          <label htmlFor="workspace-guide-new-directory-name">Create and open a new working folder</label>
          <div>
            <input id="workspace-guide-new-directory-name" value={newDirectoryName} onChange={(event) => setNewDirectoryName(event.target.value)} aria-label="New working folder name" />
            <button type="submit" className="dialog-btn dialog-btn-primary">Create folder</button>
          </div>
        </form>
        <div className="workspace-guide-examples">
          {examples.filter(({ command }) => command !== 'cd ..' || canGoUp).map(({ command, label }) => (
            <button key={command} type="button" onClick={() => onChoose(command)}>
              <span>{label}</span><code>{command}</code>
            </button>
          ))}
        </div>
        <footer className="workspace-guide-footer">
          <span>Use <code>cd ..</code> to reach your user folder. Your default workspace stays in <code>workspace</code>.</span>
          <button ref={closeRef} type="button" className="dialog-btn dialog-btn-primary" onClick={onClose}>Start exploring</button>
        </footer>
      </section>
    </div>
  )
}
