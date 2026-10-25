import { useEffect, useRef, useState } from 'react'
import { list as listCommands } from '../lib/commands/registry.js'
import { downloadText } from '../lib/zip.js'
import WorkspaceGuide from './WorkspaceGuide'

export default function Terminal({ engine, cwd, userName, mode = 'full', idPrefix = 'terminal', commandRequest = null }) {
  const [input, setInput] = useState('')
  const [showWorkspaceGuide, setShowWorkspaceGuide] = useState(() => {
    if (mode !== 'full' || idPrefix !== 'workspace') return false
    try {
      const alreadySeen = window.sessionStorage.getItem('ps-workspace-guide-seen-v2') === 'true'
      if (!alreadySeen) window.sessionStorage.setItem('ps-workspace-guide-seen-v2', 'true')
      return !alreadySeen
    } catch {
      return true
    }
  })
  const [forceRootChoice, setForceRootChoice] = useState(false)
  const [guideMode, setGuideMode] = useState('welcome')
  const [history, setHistory] = useState([])
  const [pathError, setPathError] = useState('')
  const [historyIndex, setHistoryIndex] = useState(-1)
  const inputRef = useRef(null)
  const logRef = useRef(null)
  const terminalRef = useRef(null)
  const commands = useRef([])
  const completion = useRef({ value: '', candidates: [], index: -1 })
  const pathErrorTimer = useRef(null)
  const workingDirectory = engine.context.session.cwd ?? cwd ?? ''
  const userFolder = String(userName?.first || 'guest').trim().replace(/[^a-z0-9_-]/gi, '') || 'guest'
  const rootPath = `C:\\PS\\${userFolder}`

  useEffect(() => {
    function onChooseWorkingDirectory() {
      setForceRootChoice(true)
      setGuideMode('recovery')
      setShowWorkspaceGuide(true)
    }
    function onCreateWorkspace() {
      setForceRootChoice(true)
      setGuideMode('create-workspace')
      setShowWorkspaceGuide(true)
    }
    window.addEventListener('ps:choose-working-directory', onChooseWorkingDirectory)
    window.addEventListener('ps:create-workspace', onCreateWorkspace)
    return () => {
      window.removeEventListener('ps:choose-working-directory', onChooseWorkingDirectory)
      window.removeEventListener('ps:create-workspace', onCreateWorkspace)
    }
  }, [])

  function changeInput(value) {
    completion.current = { value: '', candidates: [], index: -1 }
    setInput(value)
  }

  function getCompletions(value, commandHistory) {
    const query = value.trimStart()
    if (!query) return []
    const normalizedQuery = query.toLocaleLowerCase()
    const historyMatches = [...commandHistory].reverse()
      .filter((command) => command.toLocaleLowerCase().startsWith(normalizedQuery) && command !== value)
    let contextualMatches = []

    if (!/\s/.test(query)) {
      contextualMatches = listCommands()
        .flatMap((command) => [command.name, ...(command.aliases || [])])
        .filter((name) => name.toLocaleLowerCase().startsWith(normalizedQuery) && name !== value)
    } else {
      const commandName = query.match(/^\S+/)?.[0]
      const command = engine.context.registry.resolve(commandName)
      const splitAt = query.search(/\s+[^\s]*$/)
      const tokenStart = splitAt < 0 ? query.length : splitAt + query.slice(splitAt).search(/\S|$/)
      const prefix = query.slice(0, tokenStart)
      const fragment = query.slice(tokenStart)
      const priorTokens = prefix.trim().split(/\s+/).filter(Boolean)
      const previousToken = priorTokens.at(-1) || ''
      const pathParameter = /^-(Path|LiteralPath)$/i.test(previousToken)
      const parameterValue = previousToken.startsWith('-')
      const hasPathParameter = command?.parameters?.some((parameter) => /^-?(Path|LiteralPath)$/i.test(parameter.name))
      const positionalPath = hasPathParameter && priorTokens.length === 1
      const quote = fragment.match(/^['"]/)?.[0] || ''
      const currentFragment = fragment.replace(/^['"]|['"]$/g, '')

      if (parameterValue && commandName?.toLowerCase() === 'new-item' && /^-itemtype$/i.test(previousToken)) {
        contextualMatches = ['File', 'Directory']
          .filter((item) => item.toLowerCase().startsWith(currentFragment.toLowerCase()))
          .map((item) => `${prefix}${item}`)
      } else if (fragment.startsWith('-') || (!fragment && !pathParameter)) {
        const alreadyUsed = new Set(priorTokens.filter((token) => token.startsWith('-')).map((token) => token.toLowerCase()))
        contextualMatches = (command?.parameters || [])
          .map((parameter) => parameter.name.startsWith('-') ? parameter.name : `-${parameter.name}`)
          .filter((name) => name.toLowerCase().startsWith(fragment.toLowerCase()) && !alreadyUsed.has(name.toLowerCase()))
          .map((name) => `${prefix}${name} `)
      } else if (pathParameter || positionalPath) {
        const partialPath = currentFragment
        const slashIndex = partialPath.lastIndexOf('/')
        const parentPath = slashIndex >= 0 ? partialPath.slice(0, slashIndex) : ''
        const namePrefix = partialPath.slice(slashIndex + 1).toLowerCase()
        const result = engine.context.vfs.list(parentPath, engine.context.session.cwd ?? cwd ?? '')
        contextualMatches = (result.items || [])
          .filter((item) => item.name.toLowerCase().startsWith(namePrefix))
          .map((item) => {
            const completedPath = `${parentPath ? `${parentPath}/` : ''}${item.name}${item.type === 'Directory' ? '/' : ''}`
            const quoteCharacter = quote || (item.name.includes(' ') ? '"' : '')
            const quotedPath = quoteCharacter ? `${quoteCharacter}${completedPath}${quoteCharacter}` : completedPath
            return `${prefix}${quotedPath}`
          })
      }
    }

    return [...new Set([...historyMatches, ...contextualMatches])]
  }

  const commandHistory = history.filter((item) => item.type === 'input').slice(-50).map((item) => item.text)
  const completionSuggestions = getCompletions(input, commandHistory)
  const previewCompletion = completionSuggestions[0]

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!commandRequest) return
    const command = typeof commandRequest === 'string' ? commandRequest : commandRequest.command
    if (!command) return
    terminalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const frame = requestAnimationFrame(() => {
      changeInput(command)
      inputRef.current?.focus()
    })
    return () => cancelAnimationFrame(frame)
  }, [commandRequest])

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [history])

  useEffect(() => () => clearTimeout(pathErrorTimer.current), [])

  useEffect(() => {
    function onFileSaved(event) {
      const path = event.detail?.path
      if (!path) return
      setHistory((prev) => [...prev, {
        type: 'output',
        text: `Saved ${path} in your virtual workspace. Download a copy to keep a backup.`,
        downloadPath: path,
      }])
    }
    window.addEventListener('ps:file-saved', onFileSaved)
    return () => window.removeEventListener('ps:file-saved', onFileSaved)
  }, [])

  function downloadWorkspaceFile(path) {
    const result = engine.context.vfs.read(path, '')
    if (result.error) {
      setHistory((prev) => [...prev, { type: 'output', text: `Download failed: ${result.error}` }])
      return
    }
    downloadText(result.path.split('/').pop() || 'workspace-file.txt', result.content || '')
  }

  function loadGuideCommand(command) {
    changeInput(command)
    setShowWorkspaceGuide(false)
    setForceRootChoice(false)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  function runCommand(value = input) {
    const trimmed = value.trim()
    if (!trimmed) return
    commands.current = [...commands.current, trimmed].slice(-50)
    completion.current = { value: '', candidates: [], index: -1 }
    setHistoryIndex(-1)
    const result = engine.execute(trimmed)
    setHistory((prev) => [...prev, { type: 'input', text: trimmed }, { type: 'output', text: result.content || '', downloadPath: result.downloadPath }])
    if (result.notification?.type === 'path-error') {
      setPathError(result.notification.message)
      clearTimeout(pathErrorTimer.current)
      pathErrorTimer.current = setTimeout(() => setPathError(''), 6000)
    }
    setInput('')
  }

  function handleKeyDown(e) {
    if (e.key === 'Tab') {
      e.preventDefault()
      let candidates = completion.current.candidates
      let nextIndex
      if (completion.current.value === input && candidates.length) {
        nextIndex = (completion.current.index + 1) % candidates.length
      } else {
        candidates = getCompletions(input, commands.current)
        nextIndex = 0
      }
      if (!candidates.length) return
      const nextValue = candidates[nextIndex]
      completion.current = { value: nextValue, candidates, index: nextIndex }
      setInput(nextValue)
      requestAnimationFrame(() => {
        const field = inputRef.current
        field?.focus()
        field?.setSelectionRange(nextValue.length, nextValue.length)
      })
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      runCommand()
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (commands.current.length === 0) return
      const nextIndex = historyIndex + 1
      if (nextIndex >= commands.current.length) return
      setHistoryIndex(nextIndex)
      changeInput(commands.current[commands.current.length - 1 - nextIndex])
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex <= 0) {
        setHistoryIndex(-1)
        changeInput('')
        return
      }
      const nextIndex = historyIndex - 1
      setHistoryIndex(nextIndex)
      changeInput(commands.current[commands.current.length - 1 - nextIndex])
    }
  }

  const promptPath = `${rootPath}${workingDirectory ? `\\${workingDirectory.replace(/\//g, '\\')}` : ''}`
  const folderPickerPath = forceRootChoice ? '' : workingDirectory
  const currentFolderItems = engine.context.vfs.list(folderPickerPath, '')
  const childDirectories = (currentFolderItems.items || [])
    .filter((item) => item.type === 'Directory')
    .map((item) => ({ name: item.name, path: item.path }))
  const fullName = [userName?.first, userName?.last].filter(Boolean).join(' ')
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div ref={terminalRef} className={`ps-terminal ${mode === 'compact' ? 'ps-terminal-compact' : 'ps-terminal-full'}`} role="region" aria-label="PowerShellish terminal">
      {pathError && <div className="path-error-banner" role="alert"><span>{pathError}</span><button type="button" aria-label="Dismiss path error" onClick={() => { clearTimeout(pathErrorTimer.current); setPathError('') }}>×</button></div>}
      <div className="ps-terminal-header">
        <div className="ps-terminal-dots">
          <span />
          <span />
          <span />
        </div>
        <div className="ps-terminal-title">PowerShellish · simulated engine</div>
        <span className="ps-terminal-badge">PS 7.4</span>
      </div>
      <div className="ps-terminal-log" ref={logRef} aria-live="polite">
        <div className="ps-line ps-line-welcome">
          <span className="ps-badge">PS</span>
          <div>
            <strong>{fullName ? `${greeting}, ${fullName}. Hope your day is going well.` : 'Welcome to PowerShellish'}</strong>
            <small>{fullName ? <>Type <button type="button" onClick={() => runCommand('Get-Help')}>Get-Help</button> to explore, or change your greeting with <button type="button" onClick={() => { changeInput('Set-Name -f John -s Doe'); inputRef.current?.focus() }}>Set-Name</button>.</> : <>Personalize this terminal with <button type="button" onClick={() => { changeInput('Set-Name -f John -s Doe'); inputRef.current?.focus() }}>Set-Name -f John -s Doe</button>. Type <button type="button" onClick={() => runCommand('Get-Help')}>Get-Help</button> to explore. No real PowerShell — simulated in your browser.</>}</small>
          </div>
        </div>
        {history.map((item, idx) => (
          <div key={idx} className={`ps-line ${item.type === 'input' ? 'ps-line-input' : 'ps-line-output'}`}>
            {item.type === 'input' ? (
              <div className="ps-prompt-line">
                <span className="ps-prompt">PS</span>
                <span className="ps-path">{promptPath}</span>
                <span className="ps-gt">&gt;</span>
                <span className="ps-typed">{item.text}</span>
              </div>
            ) : (
              <>
                <pre className="ps-output">{item.text || ' '}</pre>
                {item.downloadPath && <button type="button" className="ps-file-download" onClick={() => downloadWorkspaceFile(item.downloadPath)}>Download backup</button>}
              </>
            )}
          </div>
        ))}
      </div>
      <form className="ps-terminal-input" onSubmit={(e) => { e.preventDefault(); runCommand() }}>
        <label className="ps-prompt" htmlFor={`${idPrefix}-input`}>PS</label>
        <span className="ps-path">{promptPath}</span>
        <span className="ps-gt">&gt;</span>
        <input
          id={`${idPrefix}-input`}
          ref={inputRef}
          value={input}
          onChange={(e) => changeInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a command..."
          autoComplete="off"
          spellCheck="false"
          aria-label="Terminal command input"
        />
      </form>
      {input && (
        <div className="ps-terminal-completion" role="status" aria-live="polite">
          {previewCompletion
            ? <>Press <kbd>Tab</kbd> to complete: <code>{previewCompletion}</code>{completionSuggestions.length > 1 ? ` · +${completionSuggestions.length - 1} more` : ''}</>
            : <>No matches yet. Keep typing a command or use <kbd>↑</kbd> for command history.</>}
        </div>
      )}
      <div className="ps-terminal-hint">
        <span>↵</span> Enter to run · <kbd>Tab</kbd> to complete · <kbd>↑</kbd> history · <button type="button" onClick={() => runCommand('Get-ChildItem')}>Get-ChildItem</button> · <button type="button" onClick={() => runCommand('Get-Help')}>Get-Help</button>
      </div>
      {showWorkspaceGuide && (
        <WorkspaceGuide
          rootPath={rootPath}
          defaultPath={`${rootPath}\\workspace`}
          currentPath={promptPath}
          canGoUp={Boolean(workingDirectory)}
          forceRootChoice={forceRootChoice}
          guideMode={guideMode}
          directories={childDirectories}
          onChoose={loadGuideCommand}
          onCreateWorkingDirectory={(name) => {
            runCommand(`New-WorkingDirectory -Name "${name}"`)
            setShowWorkspaceGuide(false)
            setForceRootChoice(false)
            setGuideMode('welcome')
          }}
          onClose={() => { setShowWorkspaceGuide(false); setForceRootChoice(false); setGuideMode('welcome') }}
        />
      )}
    </div>
  )
}
