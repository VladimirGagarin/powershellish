import { register } from './registry.js'
import { displayPath } from '../paths.js'
import { buildZip, downloadBlob, downloadText, timestamp } from '../zip.js'

function getSwitch(params, name) {
  const key = Object.keys(params).find((param) => param.toLowerCase() === name.toLowerCase())
  return key ? params[key] : false
}

function getExportContent(content, format) {
  if (format !== 'json') return content
  try {
    return JSON.stringify(JSON.parse(content), null, 2)
  } catch {
    return JSON.stringify(content, null, 2)
  }
}

function getExportName(path, format) {
  const name = path.split('/').pop() || 'file'
  if (format === 'raw') return name
  const stem = name.replace(/\.[^.]*$/, '') || name
  return `${stem}.${format === 'json' ? 'json' : 'txt'}`
}

function getParameter(params, names) {
  const key = Object.keys(params).find((param) => names.includes(param.toLowerCase()))
  return key ? params[key] : undefined
}

export function registerPseudoLogics() {
  register({
    name: 'Set-Name',
    category: 'custom',
    summary: 'Saves your name on this device for personalized greetings and help.',
    usage: 'Set-Name -f <first-name> -s <last-name> (or Set-Name <first-name> <last-name>)',
    parameters: [
      { name: '-f', required: false, description: 'Your first name. You may also enter names positionally.' },
      { name: '-s', required: false, description: 'Your last name. You may also enter names positionally.' },
    ],
    examples: ['Set-Name -f Kelvin -s Einstein', 'Set-Name -f "Kelvin" -s "Einstein"', 'Set-Name Kelvin Einstein'],
    run(context, args, params) {
      let firstValue = getParameter(params, ['f', 'first', 'firstname'])
      let lastValue = getParameter(params, ['s', 'last', 'lastname'])
      if (!firstValue && !lastValue) [firstValue, lastValue] = args
      else if (firstValue && !lastValue) [lastValue] = args
      else if (!firstValue && lastValue) [firstValue] = args
      const first = String(firstValue || '').trim()
      const last = String(lastValue || '').trim()
      if (!first || !last) return { type: 'text', content: 'Set-Name: Add both names. Try Set-Name -f Kelvin -s Einstein or Set-Name Kelvin Einstein.' }
      if (first.length > 40 || last.length > 40) return { type: 'text', content: 'Set-Name: Names must be 40 characters or fewer.' }
      const userName = { first, last }
      const saved = context.actions?.setUserName?.(userName)
      return {
        type: 'text',
        content: saved === false
          ? `${first}, I’ll use your name for this session, but browser storage is unavailable so I could not save it for next time.`
          : `Nice to meet you, ${first} ${last}. I’ll remember your name on this device for future visits.`,
      }
    },
  })

  register({
    name: 'Get-Home',
    category: 'custom',
    summary: 'Opens the PowerShellish home page.',
    usage: 'Get-Home',
    examples: ['Get-Home'],
    run(context) {
      context.navigate('/')
      return { type: 'text', content: 'Navigating to home.' }
    },
  })

  register({
    name: 'Start-Terminal',
    aliases: ['Open-Terminal', 'Get-Terminal'],
    category: 'custom',
    summary: 'Opens the full workspace terminal.',
    usage: 'Start-Terminal',
    examples: ['Start-Terminal', 'Open-Terminal', 'Get-Terminal'],
    run(context) {
      context.navigate('/terminal/')
      return { type: 'text', content: 'Navigating to workspace.' }
    },
  })

  register({
    name: 'Import-File',
    category: 'custom',
    summary: 'Imports local text files into the workspace.',
    usage: 'Import-File',
    examples: ['Import-File'],
    run(context) {
      context.actions?.openImport?.()
      return { type: 'text', content: 'Opening file picker. Select one or more supported text files.' }
    },
  })

  register({
    name: 'Export-File',
    category: 'custom',
    summary: 'Downloads a workspace file as-is, as text, or as JSON.',
    usage: 'Export-File [[-Path] <string>] [-Raw | -Txt | -Json]',
    parameters: [
      { name: '-Path', required: false, description: 'The workspace file to download.' },
      { name: '-Raw', required: false, description: 'Keep the current filename extension and content.' },
      { name: '-Txt', required: false, description: 'Download the content with a .txt extension.' },
      { name: '-Json', required: false, description: 'Download valid JSON with a .json extension.' },
    ],
    examples: ['Export-File', 'Export-File notes.csv -Raw', 'Export-File notes.csv -Txt', 'Export-File notes.csv -Json'],
    run(context, args, params) {
      const path = params.Path || params.LiteralPath || args[0]
      const selectedFormats = ['Raw', 'Txt', 'Json'].filter((format) => getSwitch(params, format))
      if (selectedFormats.length > 1) {
        return { type: 'text', content: 'Export-File: Choose only one format flag: -Raw, -Txt, or -Json.' }
      }
      const format = selectedFormats[0]?.toLowerCase()
      if (!path) {
        context.actions?.openExport?.({ format: format || 'raw' })
        return { type: 'text', content: 'Opened the export dialog. Choose a file and review its current format.' }
      }
      const result = context.vfs.read(path, context.session.cwd || '')
      if (result.error) return { type: 'text', content: `Export-File: ${result.error}` }
      if (!format) {
        context.actions?.openExport?.({ path: result.path || path })
        return { type: 'text', content: 'Opened the export dialog. Review the current file format and choose a download format.' }
      }
      const name = getExportName(result.path || path, format)
      downloadText(name, getExportContent(result.content || '', format))
      return { type: 'text', content: `Downloaded ${name} to your device (${format.toUpperCase()} format).` }
    },
  })

  register({
    name: 'Save-Changes',
    category: 'custom',
    summary: 'Saves the current editor buffer or exports changes.',
    usage: 'Save-Changes [[-Path] <string>] [-Export]',
    parameters: [
      { name: '-Path', required: false, description: 'Target path to save to.' },
      { name: '-Export', required: false, description: 'Download after saving.' },
    ],
    examples: ['Save-Changes -Path notes.txt', 'Save-Changes -Path notes.txt -Export'],
    run(context, args, params) {
      const path = params.Path || args[0]
      if (!path) return { type: 'text', content: 'Save-Changes: Missing -Path. Specify where to save in the workspace.' }
      if (!context.session.editorBuffer) {
        return { type: 'text', content: 'Save-Changes: No editor buffer found. Open a file in the editor or use Set-Content.' }
      }
      const result = context.vfs.write(path, context.session.editorBuffer, context.session.cwd || '', false)
      if (!result.ok) return { type: 'text', content: `Save-Changes: ${result.error}` }
      context.actions?.autosave?.()
      if (params.Export) {
        const name = path.split('/').pop() || 'file.txt'
        downloadText(name, context.session.editorBuffer || '')
        return { type: 'text', content: `Saved ${displayPath(result.path)} and downloaded ${name}.` }
      }
      return { type: 'text', content: `Saved editor buffer to ${displayPath(result.path)}.` }
    },
  })

  register({
    name: 'Export-Workspace',
    category: 'custom',
    summary: 'Downloads the entire workspace as a ZIP archive.',
    usage: 'Export-Workspace',
    examples: ['Export-Workspace'],
    run(context) {
      try {
        const blob = buildZip(context.vfs.nodes, context.vfs.nodes.rootId)
        downloadBlob(blob, `powershellish-workspace-${timestamp()}.zip`)
        return { type: 'text', content: 'Exported workspace as a ZIP. Check your downloads.' }
      } catch (err) {
        return { type: 'text', content: `Export-Workspace: ${err.message}` }
      }
    },
  })

  register({
    name: 'Clear-Workspace',
    category: 'custom',
    summary: 'Clears workspace data with confirmation.',
    usage: 'Clear-Workspace',
    examples: ['Clear-Workspace'],
    run(context) {
      context.actions?.requestClearWorkspace?.()
      return { type: 'text', content: 'Confirmation required. A dialog will ask you to confirm clearing local workspace data.' }
    },
  })

  register({
    name: 'Write-Success',
    category: 'custom',
    summary: 'Shows a friendly success message.',
    usage: 'Write-Success [-Message] <string>',
    parameters: [
      { name: '-Message', required: false, description: 'Message to display.' },
    ],
    examples: ['Write-Success -Message "You are getting the hang of it."'],
    run(context, args, params) {
      const message = params.Message || args.join(' ') || 'Success.'
      return { type: 'text', content: `[SUCCESS] ${message}` }
    },
  })

  register({
    name: 'Send-Encouragement',
    category: 'custom',
    summary: 'Sends a bit of encouragement.',
    usage: 'Send-Encouragement',
    examples: ['Send-Encouragement'],
    run() {
      const messages = [
        'Keep going. Small steps add up.',
        'You just tried a real command pattern. Nicely done.',
        'Curiosity is a superpower in the terminal.',
        'Mistakes teach faster than perfection. Try again.',
      ]
      return { type: 'text', content: messages[Math.floor(Math.random() * messages.length)] }
    },
  })

  register({
    name: 'Get-Coffee',
    category: 'custom',
    summary: 'Displays a playful coffee break suggestion.',
    usage: 'Get-Coffee',
    examples: ['Get-Coffee'],
    run() {
      return { type: 'text', content: '☕ Coffee break: stretch, take a sip, then come back ready to learn.' }
    },
  })

  register({
    name: 'Greet-User',
    category: 'custom',
    summary: 'Greets you by name.',
    usage: 'Greet-User [-Name] <string>',
    parameters: [{ name: '-Name', required: false, description: 'The name to include in the greeting.' }],
    examples: ['Greet-User -Name Alex'],
    run(context, args, params) {
      const name = params.Name || args[0] || 'there'
      return { type: 'text', content: `Hello, ${name}! Welcome to PowerShellish.` }
    },
  })

  register({
    name: 'Open-YouTube',
    category: 'custom',
    summary: 'Opens YouTube or a supplied YouTube link in a new browser tab.',
    usage: 'Open-YouTube [[-Url] <YouTubeUrl>]',
    parameters: [{ name: '-Url', required: false, description: 'YouTube video or channel URL to open.' }],
    examples: ['Open-YouTube', 'Open-YouTube https://youtu.be/dQw4w9WgXcQ', 'Open-YouTube -Url https://www.youtube.com/'],
    run(context, args, params) {
      const suppliedUrl = params.Url || params.url || args.join(' ')
      let url
      try {
        url = new URL(suppliedUrl || 'https://www.youtube.com/')
      } catch {
        return { type: 'text', content: 'Open-YouTube: That URL is not valid. Try Open-YouTube https://youtu.be/<video-id>.' }
      }
      const allowedHosts = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtube-nocookie.com']
      if (!['http:', 'https:'].includes(url.protocol) || !allowedHosts.includes(url.hostname.toLowerCase())) {
        return { type: 'text', content: 'Open-YouTube: Use an http or https YouTube link, such as https://youtu.be/<video-id>.' }
      }
      window.open(url.href, '_blank', 'noopener,noreferrer')
      return { type: 'text', content: `Requested ${url.href} in a new tab. If it did not appear, your browser may have blocked the pop-up.` }
    },
  })

  register({
    name: 'Open-WhatsApp',
    aliases: ['Send-WhatsApp'],
    category: 'custom',
    summary: 'Opens a WhatsApp chat with a phone number and optional prefilled message.',
    usage: 'Open-WhatsApp -n <country-code-and-number> [-t "<message>"]',
    parameters: [
      { name: '-n', required: true, description: 'Phone number with country code, for example 15551234567.' },
      { name: '-t', required: false, description: 'Message to prefill in the chat. It is not sent automatically.' },
    ],
    examples: ['Open-WhatsApp -n 15551234567', 'Open-WhatsApp -n 15551234567 -t "Hello from PowerShellish"'],
    run(context, args, params) {
      const number = params.n || params.N || params.Number || ''
      const message = params.t || params.T || params.Text || ''
      const normalizedNumber = String(number).replace(/[\s()+.-]/g, '')
      if (!/^\d{7,15}$/.test(normalizedNumber)) {
        return { type: 'text', content: 'Open-WhatsApp: Provide a phone number with country code using -n, such as Open-WhatsApp -n 15551234567.' }
      }
      const url = new URL(`https://wa.me/${normalizedNumber}`)
      if (message) url.searchParams.set('text', message)
      window.open(url.href, '_blank', 'noopener,noreferrer')
      return { type: 'text', content: `Opened a WhatsApp chat link for ${normalizedNumber}. Review the message in WhatsApp and choose Send yourself.` }
    },
  })

  register({
    name: 'Get-DadJoke',
    category: 'custom',
    summary: 'Displays a short, terminal themed dad joke.',
    usage: 'Get-DadJoke',
    examples: ['Get-DadJoke'],
    run() {
      const jokes = [
        'Why did the script go to therapy? It had too many unresolved variables.',
        'I asked the terminal for a joke. It said: command not found, but I laughed anyway.',
        'Why do developers prefer dark mode? Because light attracts bugs.',
      ]
      return { type: 'text', content: jokes[Math.floor(Math.random() * jokes.length)] }
    },
  })

  register({
    name: 'Get-Motivation',
    category: 'custom',
    summary: 'Displays a playful encouragement for your next command.',
    usage: 'Get-Motivation',
    examples: ['Get-Motivation'],
    run() {
      const messages = [
        'One command at a time. Even the biggest script starts with a line.',
        'You are not stuck; you are debugging with extra steps.',
        'Keep going. Your future self already appreciates these notes.',
      ]
      return { type: 'text', content: messages[Math.floor(Math.random() * messages.length)] }
    },
  })
}
