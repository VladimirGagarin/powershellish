import { register } from './registry.js'
import { displayPath as formatPath, normalizePath } from '../paths.js'
import { table } from '../format.js'
import { badge } from '../format.js'

function requirePath(args, params) {
  if (params.Path) return params.Path
  if (params.LiteralPath) return params.LiteralPath
  if (args.length > 0) return args[0]
  return null
}

function displayPath(path, context) {
  return formatPath(path, context?.session?.userName?.first || 'guest')
}

export function registerPowerShellLogics() {
  register({
    name: 'Get-Help',
    category: 'real',
    summary: 'Displays information about PowerShellish commands and concepts.',
    usage: 'Get-Help [<CommandName>]',
    parameters: [
      { name: '-Name', required: false, description: 'Name of the command to get help for.' },
    ],
    examples: ['Get-Help', 'Get-Help Get-ChildItem'],
    simulated: true,
    run(context, args, params) {
      const target = params.Name || args[0]
      if (!target) {
        const commands = context.registry.list()
        const groups = [
          { category: 'real', title: 'PowerShell tailored · simulated cmdlets' },
          { category: 'custom', title: 'Pseudo PowerShell tailored · PowerShellish commands' },
          { category: 'educational', title: 'Learning examples' },
        ]
        const commandSections = groups.flatMap(({ category, title }) => {
          const entries = commands.filter((command) => command.category === category)
          return entries.length
            ? ['', title, ...entries.map((command) => `  ${command.name} — ${command.summary || 'No summary available.'}`)]
            : []
        })
        return {
          type: 'text',
          content: [
            'PowerShellish Help (simulated)',
            '-----------------------------',
            '',
            'Use Get-Help <command> for syntax, parameters, examples, and details.',
            'Use Get-Command to browse or filter the complete registry.',
            ...commandSections,
            '',
            'Quick start:',
            '  Get-ChildItem        List your workspace',
            '  New-Item -ItemType File -Path notes.txt',
            '  Set-Content -Path notes.txt -Value "Hello"',
            '  Get-Content -Path notes.txt',
            '  Export-File -Path notes.txt',
            '  Export-Workspace    Download a ZIP of everything',
          ].join('\n'),
        }
      }
      const { resolve, describe } = context.registry
      const cmd = resolve(target)
      if (!cmd) {
        const suggestions = context.registry.find(target).slice(0, 3).map((c) => c.name).join(', ')
        return {
          type: 'text',
          content: `Get-Help: Could not find help for "${target}".\nTry Get-Command to list available commands.${suggestions ? `\nSimilar: ${suggestions}` : ''}`,
        }
      }
      return { type: 'text', content: describe(cmd) }
    },
  })

  register({
    name: 'Get-Command',
    category: 'real',
    summary: 'Gets all commands that are installed in the current session.',
    usage: 'Get-Command [-Name <string>]',
    parameters: [
      { name: '-Name', required: false, description: 'Wildcard or substring to filter commands.' },
    ],
    examples: ['Get-Command', 'Get-Command *Item*'],
    simulated: true,
    run(context, args, params) {
      const filter = params.Name || args[0] || ''
      const list = context.registry.find(filter)
      if (list.length === 0) {
        return { type: 'text', content: 'No commands matched. Try Get-Command without a filter.' }
      }
      const rows = list.map((cmd) => ({ Name: cmd.name, Category: badge(cmd.category), Summary: cmd.summary || '' }))
      return { type: 'text', content: table(rows) }
    },
  })

  register({
    name: 'Get-Location',
    category: 'real',
    aliases: ['pwd'],
    summary: 'Gets information about the current workspace location.',
    usage: 'Get-Location',
    examples: ['Get-Location'],
    simulated: true,
    run(context) {
      const cwd = context.session.cwd || ''
      return { type: 'text', content: `Path\n----\n${displayPath(cwd, context)}` }
    },
  })

  register({
    name: 'Whoami',
    category: 'real',
    summary: 'Shows the name saved for your PowerShellish session.',
    usage: 'Whoami',
    examples: ['Whoami'],
    simulated: true,
    run(context) {
      const { first, last } = context.session.userName || {}
      if (!first && !last) {
        return {
          type: 'text',
          content: 'No name is saved for this PowerShellish session. Set one with Set-Name Kelvin Einstein. This browser simulation cannot read your Windows account.',
        }
      }
      return {
        type: 'text',
        content: `${[first, last].filter(Boolean).join(' ')} (PowerShellish local session; simulated)`,
      }
    },
  })

  register({
    name: 'Set-Location',
    category: 'real',
    aliases: ['cd'],
    summary: 'Sets the current workspace location.',
    usage: 'Set-Location [-Path] <path>',
    parameters: [
      { name: '-Path', required: false, description: 'Path to change to.' },
    ],
    examples: ['Set-Location drafts', 'Set-Location ..'],
    simulated: true,
    run(context, args, params) {
      const target = requirePath(args, params) || ''
      const parentRequest = String(target).trim().replace(/\\/g, '/').replace(/\/+$/, '') === '..'
      if (parentRequest && !(context.session.cwd || '')) {
        context.actions?.requestNewWorkspace?.()
        return { type: 'text', content: 'You are at your user folder. Use cd workspace to return to the default workspace, or create a project folder here.' }
      }
      if (!target) {
        context.session.cwd = 'workspace'
        context.actions?.setWorkingDirectory?.('workspace')
        return { type: 'text', content: `Path\n----\n${displayPath('workspace', context)}` }
      }
      const result = context.vfs.list(target, context.session.cwd || '')
      if (result.error) return { type: 'text', content: `Set-Location: ${result.error}` }
      if (!result.items) return { type: 'text', content: `Set-Location: ${result.display || target} is not a directory.` }
      const normalized = normalizePath(target, context.session.cwd || '')
      if (!normalized.ok) return { type: 'text', content: `Set-Location: ${normalized.error}` }
      context.session.cwd = normalized.path
      context.actions?.setWorkingDirectory?.(normalized.path)
      return { type: 'text', content: `Path\n----\n${displayPath(context.session.cwd, context)}` }
    },
  })

  register({
    name: 'Get-ChildItem',
    category: 'real',
    aliases: ['ls', 'dir'],
    summary: 'Gets the items and child items in one or more locations.',
    usage: 'Get-ChildItem [[-Path] <string>]',
    parameters: [
      { name: '-Path', required: false, description: 'The path to list.' },
    ],
    examples: ['Get-ChildItem', 'Get-ChildItem drafts'],
    simulated: true,
    run(context, args, params) {
      const target = requirePath(args, params)
      const result = context.vfs.list(target, context.session.cwd || '')
      if (result.error) return { type: 'text', content: `Get-ChildItem: ${result.error}` }
      if (result.items.length === 0) {
        const emptyPath = target ? normalizePath(target, context.session.cwd || '').path : (context.session.cwd || '')
        return { type: 'text', content: `    Directory: ${displayPath(emptyPath, context)}\n\n(no items)` }
      }
      const rows = result.items.map((item) => ({
        Mode: item.type === 'Directory' ? 'd----' : '-a---',
        Name: item.name,
      }))
      const targetPath = target ? normalizePath(target, context.session.cwd || '').path : (context.session.cwd || '')
      return { type: 'text', content: `    Directory: ${displayPath(targetPath, context)}\n\n${table(rows)}` }
    },
  })

  register({
    name: 'New-Item',
    category: 'real',
    aliases: ['ni', 'mkdir'],
    summary: 'Creates a new item in the workspace.',
    usage: 'New-Item [-ItemType <File|Directory>] [-Path] <string>',
    parameters: [
      { name: '-ItemType', required: false, description: 'File is the default. Choose Directory to create a folder.' },
      { name: '-Path', required: true, description: 'The path of the item to create.' },
    ],
    examples: ['New-Item script.js', 'New-Item -ItemType File -Path notes.txt', 'New-Item -ItemType Directory -Path drafts'],
    simulated: true,
    run(context, args, params) {
      // PowerShellish treats a path-only New-Item as a file for a friendlier first step.
      const itemType = params.ItemType || params.itemtype || 'File'
      const path = requirePath(args, params)
      if (!path) return { type: 'text', content: 'New-Item: Tell me what to create. Try ni script.js for a file or New-Item -ItemType Directory -Path scripts for a folder.' }
      const workingFolder = context.session.cwd || ''
      const folderCheck = context.vfs.list(workingFolder, '')
      if (folderCheck.error) {
        context.actions?.requestWorkingDirectory?.()
        return { type: 'text', content: 'New-Item: Your current folder is no longer available. Choose the workspace root or another folder before creating this item.' }
      }
      const result = context.vfs.newItem(itemType, path, context.session.cwd || '')
      if (!result.ok) return { type: 'text', content: `New-Item: ${result.error}` }
      return {
        type: 'text',
        content: `Created ${String(itemType).toLowerCase()} ${displayPath(result.path, context)} in the virtual workspace. Use Edit-File -Path "${result.path}" to write in it, or Set-Content -Path "${result.path}" -Value "Hello!".`,
        downloadPath: String(itemType).toLowerCase() === 'file' ? result.path : undefined,
      }
    },
  })

  register({
    name: 'Get-Content',
    category: 'real',
    aliases: ['gc'],
    summary: 'Gets the content of a file.',
    usage: 'Get-Content [-Path] <string>',
    parameters: [
      { name: '-Path', required: true, description: 'The path to the file to read.' },
    ],
    examples: ['Get-Content -Path notes.txt'],
    simulated: true,
    run(context, args, params) {
      const path = requirePath(args, params)
      if (!path) return { type: 'text', content: 'Get-Content: Missing -Path.' }
      const result = context.vfs.read(path, context.session.cwd || '')
      if (result.error) return { type: 'text', content: `Get-Content: ${result.error}` }
      const content = result.content === ''
        ? '(This file is empty. Add text with Set-Content or Add-Content.)'
        : result.content
      return { type: 'text', content, pipeline: result.content }
    },
  })

  register({
    name: 'Set-Clipboard',
    category: 'real',
    summary: 'Places text from the pipeline into a browser sharing panel for copying.',
    usage: 'Set-Clipboard [-Value <string>] (or receive text from a pipeline)',
    parameters: [{ name: '-Value', required: false, description: 'Text to place in the sharing panel.' }],
    examples: ['Get-Content pasted_data.csv -Raw | Set-Clipboard'],
    simulated: true,
    run(context, args, params, pipeline) {
      const value = params.Value ?? pipeline ?? args.join(' ')
      if (!value) return { type: 'text', content: 'Set-Clipboard: No text received. Try Get-Content file.txt -Raw | Set-Clipboard.' }
      context.actions?.openClipboard?.(String(value))
      return { type: 'text', content: 'Opened the sharing panel. Choose Copy to place this text on your clipboard.' }
    },
  })

  register({
    name: 'Set-Content',
    category: 'real',
    aliases: ['sc'],
    summary: 'Writes or replaces the content in a file.',
    usage: 'Set-Content [-Path] <string> [-Value] <string>',
    parameters: [
      { name: '-Path', required: true, description: 'The path to the file.' },
      { name: '-Value', required: true, description: 'The content to write.' },
    ],
    examples: ['Set-Content -Path notes.txt -Value "Hello, PowerShellish."'],
    simulated: true,
    run(context, args, params) {
      const path = requirePath(args, params)
      const value = params.Value ?? params.value
      if (!path) return { type: 'text', content: 'Set-Content: Missing -Path.' }
      if (value === undefined || value === null) return { type: 'text', content: 'Set-Content: Missing -Value.' }
      const result = context.vfs.write(path, value, context.session.cwd || '', false)
      if (!result.ok) return { type: 'text', content: `Set-Content: ${result.error}` }
      return { type: 'text', content: `Wrote content to ${displayPath(result.path, context)}.`, downloadPath: result.path }
    },
  })

  register({
    name: 'Add-Content',
    category: 'real',
    aliases: ['ac'],
    summary: 'Appends content to a file.',
    usage: 'Add-Content [-Path] <string> [-Value] <string>',
    parameters: [
      { name: '-Path', required: true, description: 'The path to the file.' },
      { name: '-Value', required: true, description: 'The content to append.' },
    ],
    examples: ['Add-Content -Path notes.txt -Value "More notes."'],
    simulated: true,
    run(context, args, params) {
      const path = requirePath(args, params)
      const value = params.Value || params.value || ''
      if (!path) return { type: 'text', content: 'Add-Content: Missing -Path.' }
      const result = context.vfs.write(path, value, context.session.cwd || '', true)
      if (!result.ok) return { type: 'text', content: `Add-Content: ${result.error}` }
      return { type: 'text', content: `Appended content to ${displayPath(result.path, context)}.`, downloadPath: result.path }
    },
  })

  register({
    name: 'Remove-Item',
    category: 'real',
    aliases: ['rm', 'ri', 'del'],
    summary: 'Deletes a file or folder after in-app confirmation.',
    usage: 'Remove-Item [-Path] <string>',
    parameters: [
      { name: '-Path', required: true, description: 'The path of the item to remove.' },
    ],
    examples: ['Remove-Item -Path notes.txt', 'ri notes.txt'],
    simulated: true,
    run(context, args, params) {
      const path = requirePath(args, params)
      if (!path) return { type: 'text', content: 'Remove-Item: Missing -Path.' }
      const result = context.vfs.remove(path, context.session.cwd || '')
      if (!result.ok && result.needsConfirm) {
        context.actions?.requestDelete?.({ path: result.path, kind: result.kind, count: result.count })
        return { type: 'text', content: `Remove-Item: Confirmation required. Review the dialog before deleting ${displayPath(result.path, context)}.` }
      }
      if (!result.ok) return { type: 'text', content: `Remove-Item: ${result.error}` }
      return { type: 'text', content: `Removed ${displayPath(path, context)}.` }
    },
  })

  register({
    name: 'Rename-Item',
    category: 'real',
    aliases: ['ren'],
    summary: 'Renames an item in the workspace.',
    usage: 'Rename-Item [-Path] <string> -NewName <string>',
    parameters: [
      { name: '-Path', required: true, description: 'The path of the item to rename.' },
      { name: '-NewName', required: true, description: 'The new name for the item.' },
    ],
    examples: ['Rename-Item -Path notes.txt -NewName readme.txt'],
    simulated: true,
    run(context, args, params) {
      const path = requirePath(args, params)
      const newName = params.NewName || params.newname
      if (!path) return { type: 'text', content: 'Rename-Item: Missing -Path.' }
      if (!newName) return { type: 'text', content: 'Rename-Item: Missing -NewName.' }
      const result = context.vfs.rename(path, newName, context.session.cwd || '')
      if (!result.ok) return { type: 'text', content: `Rename-Item: ${result.error}` }
      return { type: 'text', content: `Renamed ${displayPath(result.oldPath, context)} to ${displayPath(result.path, context)}.` }
    },
  })

  register({
    name: 'Copy-Item',
    category: 'real',
    aliases: ['cp', 'copy'],
    summary: 'Copies a file or folder to a new location.',
    usage: 'Copy-Item [-Path] <string> [-Destination] <string>',
    parameters: [
      { name: '-Path', required: true, description: 'The path of the item to copy.' },
      { name: '-Destination', required: true, description: 'The destination path.' },
    ],
    examples: ['Copy-Item script.js script-backup.js', 'cp notes.txt backup/notes.txt'],
    simulated: true,
    run(context, args, params) {
      const path = requirePath(args, params)
      const destination = params.Destination || params.destination || args[1]
      if (!path) return { type: 'text', content: 'Copy-Item: Missing -Path.' }
      if (!destination) return { type: 'text', content: 'Copy-Item: Missing -Destination.' }
      const read = context.vfs.read(path, context.session.cwd || '')
      if (read.error) return { type: 'text', content: `Copy-Item: ${read.error}` }
      const write = context.vfs.write(destination, read.content || '', context.session.cwd || '', false)
      if (!write.ok) return { type: 'text', content: `Copy-Item: ${write.error}` }
      return { type: 'text', content: `Copied ${displayPath(read.path || path, context)} to ${displayPath(write.path, context)}.`, downloadPath: write.path }
    },
  })

  register({
    name: 'Move-Item',
    category: 'real',
    aliases: ['mv', 'move'],
    summary: 'Moves or renames an item to a new location.',
    usage: 'Move-Item [-Path] <string> [-Destination] <string>',
    parameters: [
      { name: '-Path', required: true, description: 'The path of the item to move.' },
      { name: '-Destination', required: true, description: 'The destination path or new name.' },
    ],
    examples: ['Move-Item script.js scripts/script.js', 'mv notes.txt archive/'],
    simulated: true,
    run(context, args, params) {
      const path = requirePath(args, params)
      const destination = params.Destination || params.destination || args[1]
      if (!path) return { type: 'text', content: 'Move-Item: Missing -Path.' }
      if (!destination) return { type: 'text', content: 'Move-Item: Missing -Destination.' }
      const rename = context.vfs.rename(path, destination.split('/').pop(), context.session.cwd || '')
      if (!rename.ok) {
        const read = context.vfs.read(path, context.session.cwd || '')
        if (read.error) return { type: 'text', content: `Move-Item: ${read.error}` }
        const write = context.vfs.write(destination, read.content || '', context.session.cwd || '', false)
        if (!write.ok) return { type: 'text', content: `Move-Item: ${write.error}` }
        const remove = context.vfs.remove(path, context.session.cwd || '', true)
        if (!remove.ok && remove.needsConfirm) {
          context.actions?.requestDelete?.({ path: remove.path, kind: remove.kind, count: remove.count })
          return { type: 'text', content: `Move-Item: Copied to ${displayPath(destination, context)} but confirmation required to remove original.` }
        }
        return { type: 'text', content: `Moved ${displayPath(path, context)} to ${displayPath(destination, context)}.`, downloadPath: write.path }
      }
      const movedFile = context.vfs.read(rename.path, '')
      return { type: 'text', content: `Moved/Renamed ${displayPath(rename.oldPath, context)} to ${displayPath(rename.path, context)}.`, downloadPath: movedFile.error ? undefined : rename.path }
    },
  })

  register({
    name: 'Out-File',
    category: 'real',
    summary: 'Sends output to a file.',
    usage: 'Out-File [-FilePath] <string> [-InputObject <string>]',
    parameters: [
      { name: '-FilePath', required: true, description: 'Path to the output file.' },
      { name: '-InputObject', required: false, description: 'Content to write.' },
    ],
    examples: ["'hello' | Out-File test.txt", "Out-File -FilePath test.txt -InputObject 'hello'"],
    simulated: true,
    run(context, args, params, pipeline) {
      const path = params.FilePath || params.Path || params.filepath || requirePath(args, params)
      const value = params.InputObject ?? pipeline ?? args.join(' ')
      if (!path) return { type: 'text', content: 'Out-File: Missing -FilePath.' }
      const result = context.vfs.write(path, value === undefined || value === null ? '' : String(value), context.session.cwd || '', false)
      if (!result.ok) return { type: 'text', content: `Out-File: ${result.error}` }
      return { type: 'text', content: `Wrote output to ${displayPath(result.path, context)}.`, downloadPath: result.path }
    },
  })

  const extraCmdlets = [
    {
      name: 'Clear-Content', summary: 'Empties a file while keeping the file.', usage: 'Clear-Content -Path <path>',
      parameters: [{ name: '-Path', required: true, description: 'Virtual workspace file to empty.' }], examples: ['Clear-Content -Path notes.txt'],
      run(context, args, params) {
        const path = requirePath(args, params)
        if (!path) return { type: 'text', content: 'Clear-Content: Add -Path followed by a file name.' }
        const result = context.vfs.write(path, '', context.session.cwd || '', false)
        return result.ok
          ? { type: 'text', content: `Emptied ${displayPath(result.path, context)}. The file is still there.`, downloadPath: result.path }
          : { type: 'text', content: `Clear-Content: ${result.error}` }
      },
    },
    {
      name: 'Test-Path', summary: 'Checks whether a virtual workspace item exists.', usage: 'Test-Path -Path <path>',
      parameters: [{ name: '-Path', required: true, description: 'File or folder to check.' }], examples: ['Test-Path -Path notes.txt'],
      run(context, args, params) {
        const path = requirePath(args, params)
        if (!path) return { type: 'text', content: 'Test-Path: Add -Path followed by a file or folder name.' }
        const file = context.vfs.read(path, context.session.cwd || '')
        if (!file.error) return { type: 'text', content: 'True' }
        const folder = context.vfs.list(path, context.session.cwd || '')
        return { type: 'text', content: folder.error ? 'False' : 'True' }
      },
    },
    {
      name: 'Select-String', summary: 'Finds matching text inside a virtual workspace file.', usage: 'Select-String -Path <path> -Pattern <text>',
      parameters: [{ name: '-Path', required: true, description: 'File to search.' }, { name: '-Pattern', required: true, description: 'Text to find.' }], examples: ['Select-String -Path notes.txt -Pattern hello'],
      run(context, args, params) {
        const path = requirePath(args, params), pattern = params.Pattern || params.pattern
        if (!path || pattern === undefined) return { type: 'text', content: 'Select-String: Use -Path <file> -Pattern <text>.' }
        const result = context.vfs.read(path, context.session.cwd || '')
        if (result.error) return { type: 'text', content: `Select-String: ${result.error}` }
        const matches = result.content.split(/\r?\n/).map((line, index) => ({ line, number: index + 1 })).filter((row) => row.line.toLowerCase().includes(String(pattern).toLowerCase()))
        return { type: 'text', content: matches.length ? matches.map((row) => `${displayPath(result.path, context)}:${row.number}: ${row.line}`).join('\n') : `No lines in ${displayPath(result.path, context)} matched "${pattern}".` }
      },
    },
    {
      name: 'Get-Item', summary: 'Shows one item from the virtual workspace.', usage: 'Get-Item -Path <path>',
      parameters: [{ name: '-Path', required: true, description: 'File or folder to show.' }], examples: ['Get-Item -Path notes.txt'],
      run(context, args, params) {
        const path = requirePath(args, params)
        if (!path) return { type: 'text', content: 'Get-Item: Add -Path followed by a file or folder name.' }
        const file = context.vfs.read(path, context.session.cwd || '')
        if (!file.error) return { type: 'text', content: `Name: ${file.path.split('/').pop()}\nType: File\nPath: ${displayPath(file.path, context)}\nLength: ${new TextEncoder().encode(file.content).length} bytes` }
        const folder = context.vfs.list(path, context.session.cwd || '')
        if (folder.error) return { type: 'text', content: `Get-Item: ${folder.error}` }
        const targetPath = normalizePath(path, context.session.cwd || '').path
        return { type: 'text', content: `Name: ${path.split('/').pop()}\nType: Directory\nPath: ${displayPath(targetPath, context)}\nItems: ${folder.items.length}` }
      },
    },
    {
      name: 'Measure-Object', summary: 'Counts lines, words, and characters in text.', usage: 'Measure-Object [-Text <text>] (or receive text from a pipeline)',
      parameters: [{ name: '-Text', required: false, description: 'Text to count; a pipeline value also works.' }], examples: ["Get-Content -Path notes.txt -Raw | Measure-Object"],
      run(context, args, params, pipeline) {
        const value = String(params.Text ?? pipeline ?? args.join(' '))
        if (!value) return { type: 'text', content: 'Measure-Object: Give it text with -Text or pass text through a pipe.' }
        const words = value.trim() ? value.trim().split(/\s+/).length : 0
        return { type: 'text', content: `Lines: ${value ? value.split(/\r?\n/).length : 0}\nWords: ${words}\nCharacters: ${value.length}`, pipeline: value }
      },
    },
    {
      name: 'ConvertTo-Json', summary: 'Turns simple text or data into JSON text.', usage: 'ConvertTo-Json [-InputObject <text>]',
      parameters: [{ name: '-InputObject', required: false, description: 'Text or data to convert.' }], examples: ["ConvertTo-Json -InputObject 'hello'"],
      run(context, args, params, pipeline) {
        const value = params.InputObject ?? pipeline ?? args.join(' ')
        if (value === '') return { type: 'text', content: 'ConvertTo-Json: Give it a value with -InputObject or a pipe.' }
        const output = JSON.stringify(value, null, 2)
        return { type: 'text', content: output, pipeline: output }
      },
    },
    {
      name: 'ConvertFrom-Json', summary: 'Reads JSON text and shows its value.', usage: 'ConvertFrom-Json [-InputObject <json>]',
      parameters: [{ name: '-InputObject', required: false, description: 'JSON text to read.' }], examples: ["ConvertFrom-Json -InputObject '{\"pet\":\"Bunny\"}'"],
      run(context, args, params, pipeline) {
        const value = params.InputObject ?? pipeline ?? args.join(' ')
        if (!value) return { type: 'text', content: 'ConvertFrom-Json: Give it JSON text with -InputObject or a pipe.' }
        try { const output = JSON.stringify(JSON.parse(value), null, 2); return { type: 'text', content: output, pipeline: output } }
        catch { return { type: 'text', content: 'ConvertFrom-Json: That text is not valid JSON. Check the quotes, commas, and brackets.' } }
      },
    },
    {
      name: 'Get-Date', summary: 'Shows the current date and time in this browser session.', usage: 'Get-Date', examples: ['Get-Date'],
      run() { return { type: 'text', content: `${new Date().toLocaleString()} (your device clock)` } },
    },
    {
      name: 'Get-Random', summary: 'Picks a random whole number from 0 to 100.', usage: 'Get-Random', examples: ['Get-Random'],
      run() { const value = Math.floor(Math.random() * 101); return { type: 'text', content: String(value), pipeline: value } },
    },
    {
      name: 'Set-Variable', summary: 'Saves a named value for this terminal session.', usage: 'Set-Variable -Name <name> -Value <text>',
      parameters: [{ name: '-Name', required: true, description: 'Variable name without the $ sign.' }, { name: '-Value', required: true, description: 'Text to save.' }], examples: ["Set-Variable -Name pet -Value Bunny"],
      run(context, args, params) {
        const name = params.Name || params.name, value = params.Value ?? params.value
        if (!name || value === undefined) return { type: 'text', content: 'Set-Variable: Use -Name <name> -Value <text>.' }
        context.session.variables ||= {}
        context.session.variables[String(name).replace(/^\$/, '')] = String(value)
        return { type: 'text', content: `Saved $${String(name).replace(/^\$/, '')} for this terminal session.` }
      },
    },
    {
      name: 'Get-Variable', summary: 'Shows values saved with Set-Variable in this session.', usage: 'Get-Variable [-Name <name>]',
      parameters: [{ name: '-Name', required: false, description: 'Variable name, with or without $.' }], examples: ['Get-Variable', 'Get-Variable -Name pet'],
      run(context, args, params) {
        const values = context.session.variables || {}, wanted = String(params.Name || params.name || args[0] || '').replace(/^\$/, '')
        const entries = Object.entries(values).filter(([name]) => !wanted || name.toLowerCase() === wanted.toLowerCase())
        return { type: 'text', content: entries.length ? entries.map(([name, value]) => `$${name} = ${value}`).join('\n') : 'No matching session variables. Try Set-Variable -Name pet -Value Bunny first.' }
      },
    },
    {
      name: 'Clear-Variable', summary: 'Removes a named value from this terminal session.', usage: 'Clear-Variable -Name <name>',
      parameters: [{ name: '-Name', required: true, description: 'Variable name to clear.' }], examples: ['Clear-Variable -Name pet'],
      run(context, args, params) {
        const name = String(params.Name || params.name || args[0] || '').replace(/^\$/, '')
        if (!name) return { type: 'text', content: 'Clear-Variable: Add -Name followed by a variable name.' }
        if (!context.session.variables?.[name]) return { type: 'text', content: `Clear-Variable: $${name} was not found in this session.` }
        delete context.session.variables[name]
        return { type: 'text', content: `Cleared $${name} from this terminal session.` }
      },
    },
  ]

  for (const cmdlet of extraCmdlets) register({ category: 'real', simulated: true, ...cmdlet })
}
