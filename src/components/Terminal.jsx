import { useEffect, useRef, useState } from 'react'
import { list as listCommands } from '../lib/commands/registry.js'

export default function Terminal({ engine, cwd, userName, mode = 'full', idPrefix = 'terminal', commandRequest = null }) {
  const [input, setInput] = useState('')
  const [history, setHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const inputRef = useRef(null)
  const logRef = useRef(null)
  const terminalRef = useRef(null)
  const commands = useRef([])
  const completion = useRef({ value: '', candidates: [], index: -1 })

  function changeInput(value) {
    completion.current = { value: '', candidates: [], index: -1 }
    setInput(value)
  }

  function getCompletions(value) {
    const query = value.trimStart()
    if (!query) return []
    const normalizedQuery = query.toLocaleLowerCase()
    const historyMatches = [...commands.current].reverse()
      .filter((command) => command.toLocaleLowerCase().startsWith(normalizedQuery) && command !== value)
    const commandMatches = query.includes(' ')
      ? []
      : listCommands()
        .flatMap((command) => [command.name, ...(command.aliases || [])])
        .filter((name) => name.toLocaleLowerCase().startsWith(normalizedQuery) && name !== value)
    return [...new Set([...historyMatches, ...commandMatches])]
  }

  const previewCompletion = getCompletions(input)[0]

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!commandRequest) return
    const command = typeof commandRequest === 'string' ? commandRequest : commandRequest.command
    if (!command) return
    changeInput(command)
    terminalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    inputRef.current?.focus()
  }, [commandRequest])

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [history])

  function runCommand(value = input) {
    const trimmed = value.trim()
    if (!trimmed) return
    commands.current = [...commands.current, trimmed].slice(-50)
    completion.current = { value: '', candidates: [], index: -1 }
    setHistoryIndex(-1)
    const result = engine.execute(trimmed)
    setHistory((prev) => [...prev, { type: 'input', text: trimmed }, { type: 'output', text: result.content || '' }])
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
        candidates = getCompletions(input)
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

  const promptPath = cwd ? `~/${cwd}` : '~'
  const fullName = [userName?.first, userName?.last].filter(Boolean).join(' ')
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div ref={terminalRef} className={`ps-terminal ${mode === 'compact' ? 'ps-terminal-compact' : 'ps-terminal-full'}`} role="region" aria-label="PowerShellish terminal">
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
              <pre className="ps-output">{item.text || ' '}</pre>
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
        <span className="ps-cursor" />
      </form>
      {input && (
        <div className="ps-terminal-completion" role="status" aria-live="polite">
          {previewCompletion
            ? <>Press <kbd>Tab</kbd> to complete: <code>{previewCompletion}</code>{getCompletions(input).length > 1 ? ` · +${getCompletions(input).length - 1} more` : ''}</>
            : <>No matches yet. Keep typing a command or use <kbd>↑</kbd> for command history.</>}
        </div>
      )}
      <div className="ps-terminal-hint">
        <span>↵</span> Enter to run · <kbd>Tab</kbd> to complete · <kbd>↑</kbd> history · <button type="button" onClick={() => runCommand('Get-ChildItem')}>Get-ChildItem</button> · <button type="button" onClick={() => runCommand('Get-Help')}>Get-Help</button>
      </div>
    </div>
  )
}
