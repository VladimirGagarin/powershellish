import { register } from './registry.js'
import { displayPath } from '../paths.js'
import { table } from '../format.js'
import { badge } from '../format.js'

function requirePath(args, params) {
  if (params.Path) return params.Path
  if (params.LiteralPath) return params.LiteralPath
  if (args.length > 0) return args[0]
  return null
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
      return { type: 'text', content: `Path\n----\n${displayPath(cwd)}` }
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
      if (!target) {
        context.session.cwd = ''
        return { type: 'text', content: `Path\n----\n${displayPath('')}` }
      }
      const result = context.vfs.list(target, context.session.cwd || '')
      if (result.error) return { type: 'text', content: `Set-Location: ${result.error}` }
      if (!result.items) return { type: 'text', content: `Set-Location: ${result.display || target} is not a directory.` }
      const { normalizePath } = context.paths
      const normalized = normalizePath(target, context.session.cwd || '')
      if (!normalized.ok) return { type: 'text', content: `Set-Location: ${normalized.error}` }
      context.session.cwd = normalized.path
      return { type: 'text', content: `Path\n----\n${displayPath(context.session.cwd)}` }
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
        return { type: 'text', content: `    Directory: ${result.display}\n\n(no items)` }
      }
      const rows = result.items.map((item) => ({
        Mode: item.type === 'Directory' ? 'd----' : '-a---',
        Name: item.name,
      }))
      return { type: 'text', content: `    Directory: ${result.display}\n\n${table(rows)}` }
    },
  })

  register({
    name: 'New-Item',
    category: 'real',
    aliases: ['ni'],
    summary: 'Creates a new item in the workspace.',
    usage: 'New-Item -ItemType <File|Directory> [-Path] <string>',
    parameters: [
      { name: '-ItemType', required: true, description: 'Specifies the type: File or Directory.' },
      { name: '-Path', required: true, description: 'The path of the item to create.' },
    ],
    examples: ['New-Item -ItemType File -Path notes.txt', 'New-Item -ItemType Directory -Path drafts'],
    simulated: true,
    run(context, args, params) {
      const itemType = params.ItemType || params.itemtype
      const path = requirePath(args, params)
      if (!itemType) return { type: 'text', content: "New-Item: Missing -ItemType. Use -ItemType File or -ItemType Directory." }
      if (!path) return { type: 'text', content: "New-Item: Missing -Path. Specify the path to create." }
      const result = context.vfs.newItem(itemType, path, context.session.cwd || '')
      if (!result.ok) return { type: 'text', content: `New-Item: ${result.error}` }
      return { type: 'text', content: `Created ${String(itemType).toLowerCase()} ${displayPath(result.path)} in the workspace.` }
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
      return { type: 'text', content: params.Raw ? result.content : (result.content || '(empty)'), pipeline: result.content }
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
      const value = params.Value || params.value
      if (!path) return { type: 'text', content: 'Set-Content: Missing -Path.' }
      if (value === undefined || value === null) return { type: 'text', content: 'Set-Content: Missing -Value.' }
      const result = context.vfs.write(path, value, context.session.cwd || '', false)
      if (!result.ok) return { type: 'text', content: `Set-Content: ${result.error}` }
      context.actions?.autosave?.()
      return { type: 'text', content: `Wrote content to ${displayPath(result.path)}.` }
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
      context.actions?.autosave?.()
      return { type: 'text', content: `Appended content to ${displayPath(result.path)}.` }
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
        return { type: 'text', content: `Remove-Item: Confirmation required. Review the dialog before deleting ${displayPath(result.path)}.` }
      }
      if (!result.ok) return { type: 'text', content: `Remove-Item: ${result.error}` }
      context.actions?.autosave?.()
      return { type: 'text', content: `Removed ${displayPath(path)}.` }
    },
  })

  register({
    name: 'Rename-Item',
    category: 'real',
    aliases: ['ren', 'mv'],
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
      context.actions?.autosave?.()
      return { type: 'text', content: `Renamed ${displayPath(result.oldPath)} to ${displayPath(result.path)}.` }
    },
  })
}
