import { useEffect, useMemo, useRef, useState } from 'react'
import Terminal from '../components/Terminal'
import LocalSessionNotice from '../components/LocalSessionNotice'
import { list } from '../lib/commands/registry'
import MissionBoard from '../components/MissionBoard'
import PipelineVisualizer from '../components/PipelineVisualizer'
import pli5 from '../data/tutorials/pli5.json'
import TutorialLayout from '../components/tutorial/TutorialLayout'
import CmdletsGuide from '../components/cmdlets/CmdletsGuide'

const filters = ['All', 'PowerShell tailored', 'Pseudo PowerShell tailored', 'Learning examples']
const groups = [
  { category: 'real', filter: 'PowerShell tailored', title: 'PowerShell tailored', note: 'Familiar PowerShell cmdlets, simulated safely in your browser.' },
  { category: 'custom', filter: 'Pseudo PowerShell tailored', title: 'Pseudo PowerShell tailored', note: 'PowerShellish commands for learning, creativity, and workspace actions.' },
  { category: 'educational', filter: 'Learning examples', title: 'Learning examples', note: 'Teaching commands and demonstrations.' },
]

const starterPath = [
  { label: '1 · Look around', command: 'Get-ChildItem', detail: 'List the files in your workspace.' },
  { label: '2 · Create a note', command: 'New-Item -ItemType File -Path notes.txt', detail: 'Make a virtual text file.' },
  { label: '3 · Add a message', command: 'Set-Content -Path notes.txt -Value "Hello, PowerShell!"', detail: 'Write text into that file.' },
  { label: '4 · Read it back', command: 'Get-Content notes.txt', detail: 'See what the file contains.' },
]

const concepts = [
  {
    icon: '🏷️', title: 'Variables', memory: 'A labeled jar',
    explanation: 'A variable keeps a value so you can reuse it. The $ is the label that tells PowerShell you mean the stored value.',
    example: '$student = "Ada"\n"Hello, $student"',
    note: 'Native PowerShell example · variables are not executable in this simulator yet.',
  },
  {
    icon: '🧰', title: 'Modules', memory: 'A toolbox of commands',
    explanation: 'A module groups related commands. Importing one makes its commands available in a PowerShell session.',
    example: 'Import-Module Microsoft.PowerShell.Utility\nGet-Command -Module Microsoft.PowerShell.Utility',
    note: 'Native PowerShell example · this browser does not install or import real modules.',
  },
  {
    icon: '🎛️', title: 'Flags and parameters', memory: 'Options on a control panel',
    explanation: 'A parameter gives a command extra detail. The dash introduces a named option; its value tells the command what to work on.',
    example: 'Get-ChildItem -Path .',
    note: 'Runnable in PowerShellish · load it into the terminal and press Enter.',
    runnable: true,
  },
  {
    icon: '🛝', title: 'Pipes', memory: 'A conveyor belt',
    explanation: 'The pipe character | sends one command’s output into the next command. In native PowerShell, that output is usually objects.',
    example: 'Get-Content notes.txt -Raw | Set-Clipboard',
    note: 'Runnable in PowerShellish · create notes.txt first; Set-Clipboard opens the share and copy panel.',
    runnable: true,
  },
  {
    icon: '🪪', title: 'Objects', memory: 'An info card with labeled fields',
    explanation: 'A native PowerShell object carries named properties, such as a process Name and Id. Commands can select and sort those fields.',
    example: 'Get-Process | Select-Object Name, Id',
    note: 'Native PowerShell example · this simulator does not model rich PowerShell objects yet.',
  },
]

const verbs = [
  { verb: 'Get-', meaning: 'Discover or retrieve' },
  { verb: 'Set-', meaning: 'Change or configure' },
  { verb: 'New-', meaning: 'Create something' },
  { verb: 'Start-', meaning: 'Begin an activity' },
  { verb: 'Stop-', meaning: 'End an activity' },
  { verb: 'Find-', meaning: 'Search for something' },
  { verb: 'Send-', meaning: 'Deliver a message' },
  { verb: 'Share-', meaning: 'Share knowledge' },
  { verb: 'Publish-', meaning: 'Release a story' },
  { verb: 'Learn-', meaning: 'Enter a learning activity' },
  { verb: 'Celebrate-', meaning: 'Recognize progress' },
  { verb: 'Imagine-', meaning: 'Explore a creative idea' },
  { verb: 'Dream-', meaning: 'Express an ambition' },
  { verb: 'Remember-', meaning: 'Recall a lesson' },
  { verb: 'Retry-', meaning: 'Try a different approach' },
]

export default function HelpPage({ engine, cwd, userName }) {
  const [filter, setFilter] = useState('All')
  const [query, setQuery] = useState('')
  const [commandRequest, setCommandRequest] = useState(null)
  const getInitialView = () => {
    if (typeof window === 'undefined') return 'help'
    const params = new URLSearchParams(window.location.search)
    const tab = params.get('tab')?.toLowerCase()
    if (tab === 'tutorials' || tab === 'pli5' || tab === 'powershelllikeim5' || tab === 'likeim5') return 'tutorials'
    if (tab === 'cmdlets' || tab === 'cmdlet' || tab === 'commands') return 'cmdlets'
    if (tab === 'help') return 'help'
    const hash = window.location.hash.toLowerCase()
    if (hash.includes('pli5') || (hash.includes('powershell') && hash.includes('5'))) return 'tutorials'
    if (hash.includes('cmdlet')) return 'cmdlets'
    return 'help'
  }
  const [view, setView] = useState(getInitialView)
  const [showToast, setShowToast] = useState(false)
  const requestSequence = useRef(0)
  const commands = useMemo(() => list(), [])

  const filtered = useMemo(() => commands.filter((cmd) => {
    const haystack = `${cmd.name} ${cmd.summary || ''} ${cmd.usage || ''}`.toLowerCase()
    return (filter === 'All' || groups.find((group) => group.category === cmd.category)?.filter === filter)
      && haystack.includes(query.toLowerCase())
  }), [commands, filter, query])

  function loadCommand(command) {
    requestSequence.current += 1
    setCommandRequest({ command, id: requestSequence.current })
  }

  function openPli5() {
    setView('tutorials')
    setShowToast(true)
    requestAnimationFrame(() => {
      const el = document.getElementById('pli5-tutorial')
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    })
    setTimeout(() => setShowToast(false), 6000)
  }

  function setTab(nextView) {
    setView(nextView)
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      if (nextView === 'help') {
        url.searchParams.delete('tab')
      } else if (nextView === 'tutorials') {
        url.searchParams.set('tab', 'pli5')
      } else if (nextView === 'cmdlets') {
        url.searchParams.set('tab', 'cmdlets')
      }
      window.history.replaceState({}, '', url.pathname + url.search + url.hash)
    }
  }

  useEffect(() => {
    const handler = (e) => {
      const code = e.detail?.code
      if (code) loadCommand(code)
    }
    window.addEventListener('ps:run', handler)
    return () => window.removeEventListener('ps:run', handler)
  }, [])

  useEffect(() => {
    const checkUrl = () => {
      const params = new URLSearchParams(window.location.search)
      const tab = params.get('tab')?.toLowerCase()
      if (tab === 'tutorials' || tab === 'pli5' || tab === 'powershelllikeim5' || tab === 'likeim5') {
        if (view !== 'tutorials') setView('tutorials')
        requestAnimationFrame(() => {
          const el = document.getElementById('pli5-tutorial')
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        })
        return
      }
      if (tab === 'cmdlets' || tab === 'cmdlet' || tab === 'commands') {
        if (view !== 'cmdlets') setView('cmdlets')
        requestAnimationFrame(() => {
          const el = document.getElementById('cmdlets-guide')
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        })
        return
      }
      const hash = window.location.hash.toLowerCase()
      if (hash.includes('pli5') || (hash.includes('powershell') && hash.includes('5'))) {
        openPli5()
      } else if (hash.includes('cmdlet')) {
        setTab('cmdlets')
        requestAnimationFrame(() => {
          const el = document.getElementById('cmdlets-guide')
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        })
      }
    }
    checkUrl()
    window.addEventListener('hashchange', checkUrl)
    window.addEventListener('popstate', checkUrl)
    return () => {
      window.removeEventListener('hashchange', checkUrl)
      window.removeEventListener('popstate', checkUrl)
    }
  }, [view])

  useEffect(() => {
    const onGoPli5 = () => openPli5()
    window.addEventListener('ps:go-pli5', onGoPli5)
    return () => window.removeEventListener('ps:go-pli5', onGoPli5)
  }, [])

  const fullName = [userName?.first, userName?.last].filter(Boolean).join(' ')

  return (
    <div className="page page-help">
      <section className="help-hero">
        <div className="help-hero-copy">
          <span className="section-kicker">LEARNING ASSISTANT · DOCUMENTATION · EXERCISES</span>
          <h1>Learn PowerShell,<br /><em>one command at a time.</em></h1>
          <p>Build real PowerShell instincts with safe browser simulations, then explore creative PowerShellish commands. Pick any example below to load it into the terminal.</p>
          <LocalSessionNotice className="help-notice" />
          <div className="help-view-tabs">
            <button type="button" className={view === 'help' ? 'selected' : ''} onClick={() => setTab('help')}>Help & Reference</button>
            <button type="button" className={view === 'tutorials' ? 'selected' : ''} onClick={() => { setTab('tutorials'); requestAnimationFrame(() => { const el = document.getElementById('pli5-tutorial'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }) }) }}>PowerShell Like I'm 5</button>
            <button type="button" className={view === 'cmdlets' ? 'selected' : ''} onClick={() => { setTab('cmdlets'); requestAnimationFrame(() => { const el = document.getElementById('cmdlets-guide'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }) }) }}>Cmdlets Guide</button>
          </div>
        </div>
        <div className="help-hero-terminal" id="help-terminal">
          <Terminal engine={engine} cwd={cwd} mode="full" idPrefix="help" commandRequest={commandRequest} userName={userName} />
        </div>
      </section>

      {view === 'tutorials' && <TutorialLayout data={pli5} />}
      {view === 'cmdlets' && <CmdletsGuide onRun={(cmd) => loadCommand(cmd)} />}

      {view === 'help' && (
        <>
          <MissionBoard engine={engine} onLoadCommand={loadCommand} />
          <PipelineVisualizer />

      <section className="command-index" aria-labelledby="command-index-title">
        <header className="section-header">
          <div>
            <span className="section-kicker">COMMAND REGISTRY</span>
            <h2 id="command-index-title">Explore commands</h2>
            <p>Choose a command to load a runnable example into the Help terminal. Review it, then press Enter.</p>
          </div>
          <div className="index-controls">
            <div className="filter-tabs" aria-label="Filter commands">
              {filters.map((item) => (
                <button key={item} type="button" className={filter === item ? 'selected' : ''} onClick={() => setFilter(item)}>{item}</button>
              ))}
            </div>
            <label className="search-box">
              <span>⌕</span>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search commands..." aria-label="Search commands" />
            </label>
          </div>
        </header>
        <div className="command-groups">
          {groups.filter((group) => filter === 'All' || group.filter === filter).map((group) => {
            const entries = filtered.filter((cmd) => cmd.category === group.category)
            if (!entries.length) return null
            return (
              <section className="command-group" key={group.category} aria-labelledby={`group-${group.category}`}>
                <header className="command-group-heading">
                  <div><h3 id={`group-${group.category}`}>{group.title}</h3><p>{group.note}</p></div>
                  <span>{entries.length} commands</span>
                </header>
                <div className="command-card-grid">
                  {entries.map((cmd) => {
                    const example = cmd.examples?.[0] || cmd.name
                    return (
                      <article key={cmd.name} className="command-card">
                        <div className="command-card-meta"><span className="command-dot" /><span>{group.title}</span></div>
                        <button className="command-card-title" type="button" onClick={() => loadCommand(example)} title={`Load ${example} into the terminal`}>
                          {cmd.name}<span aria-hidden="true"> ↗</span>
                        </button>
                        <p>{cmd.summary}</p>
                        <code>{cmd.usage || cmd.name}</code>
                        <button className="command-card-try" type="button" onClick={() => loadCommand(example)}>Load example into terminal</button>
                      </article>
                    )
                  })}
                </div>
              </section>
            )
          })}
          {!filtered.length && <p className="command-empty">No commands match that search. Try a verb like Get- or a topic like files.</p>}
        </div>
      </section>

      <section className="concept-section" aria-labelledby="concept-title">
        <header className="section-header">
          <div><span className="section-kicker">POWERSHELL FIELD GUIDE</span><h2 id="concept-title">Five ideas to keep in your pocket</h2></div>
          <p>Short memory hooks make the big ideas easier to recall. Runnable cards are marked; other snippets show native PowerShell syntax.</p>
        </header>
        <div className="concept-grid">
          {concepts.map((concept) => (
            <article className="concept-card" key={concept.title}>
              <div className="concept-icon" aria-hidden="true">{concept.icon}</div>
              <h3>{concept.title}</h3>
              <strong className="concept-memory">Think: {concept.memory}</strong>
              <p>{concept.explanation}</p>
              <pre><code>{concept.example}</code></pre>
              <small>{concept.note}</small>
              {concept.runnable && <button type="button" onClick={() => loadCommand(concept.example)}>Load example into terminal →</button>}
            </article>
          ))}
        </div>
      </section>

      <section className="starter-path" aria-labelledby="starter-path-title">
        <header className="section-header">
          <div><span className="section-kicker">YOUR FIRST MINI SCRIPT</span><h2 id="starter-path-title">Four steps, one useful file</h2></div>
          <p>Load each step into the terminal in order. You decide when to run every command.</p>
        </header>
        <div className="starter-path-grid">
          {starterPath.map((step) => (
            <button className="starter-step" type="button" key={step.label} onClick={() => loadCommand(step.command)}>
              <strong>{step.label}</strong><span>{step.detail}</span><code>{step.command}</code><span className="starter-step-action">Load into terminal →</span>
            </button>
          ))}
        </div>
      </section>

          <section className="verbs-section">
            <header className="section-header">
              <div>
                <span className="section-kicker">POWERSHELLISH VERBS</span>
                <h2>Speak the language</h2>
              </div>
              <p>Keep these verbs in mind when you see or write PowerShellish commands.</p>
            </header>
            <div className="verbs-grid">
              {verbs.map((item) => (
                <div key={item.verb} className="verb-card">
                  <span className="verb">{item.verb}</span>
                  <span className="verb-meaning">{item.meaning}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {showToast && (
        <div className="powershell-toast">
          <div className="powershell-toast-header">
            <span className="powershell-toast-title">Learning time</span>
            <button className="powershell-toast-close" type="button" onClick={() => setShowToast(false)}>×</button>
          </div>
          <div className="powershell-toast-body">
            {fullName ? `${fullName}, below to learn: PowerShell Like I'm 5` : "Below to learn: PowerShell Like I'm 5"}
          </div>
        </div>
      )}
    </div>
  )
}
