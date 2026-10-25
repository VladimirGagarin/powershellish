import { resolve, describe } from './commands/registry.js'
import { parse } from './parser.js'
import { displayPath, isInside, normalizePath } from './paths.js'

const pathScopedCommands = new Set([
  'get-childitem', 'get-content', 'get-item', 'set-content', 'add-content', 'clear-content',
  'remove-item', 'rename-item', 'copy-item', 'move-item', 'out-file', 'select-string',
  'new-item', 'export-file', 'edit-file',
])
const pathParameterNames = new Set(['path', 'literalpath', 'filepath', 'destination'])
const positionalPathCommands = new Set([
  'get-childitem', 'get-content', 'get-item', 'remove-item', 'new-item', 'export-file',
  'edit-file', 'copy-item', 'move-item', 'select-string',
])

export function createEngine({ vfs, session, registry, paths, navigate, actions }) {
  const context = {
    vfs,
    session,
    registry,
    paths,
    navigate,
    actions,
  }

  function personalizeError(message) {
    const firstName = context.session.userName?.first
    return firstName ? `${firstName}, ${message.charAt(0).toLowerCase()}${message.slice(1)}` : message
  }

  function execute(input) {
    // Split pipelines only at an unquoted pipe. Quoted text can contain | safely.
    const stages = []
    let stage = ''
    let quote = null
    for (const char of input) {
      if (quote) {
        if (char === quote) quote = null
        stage += char
      } else if (char === '"' || char === "'") {
        quote = char
        stage += char
      } else if (char === '|') {
        stages.push(stage)
        stage = ''
      } else stage += char
    }
    stages.push(stage)
    let pipelineValue
    let result = { type: 'text', content: '' }
    for (const part of stages) {
      const parsed = parse(part)
      if (!parsed.ok) {
        return { type: 'text', content: personalizeError(`Parse error: ${parsed.error}`) }
      }
      if (parsed.empty) continue
      const cmd = resolve(parsed.command)
      if (!cmd) {
        const suggestions = registry.find(parsed.command).slice(0, 3).map((c) => c.name)
        let message = `The term "${parsed.command}" is not recognized as a PowerShellish command, function, or cmdlet.\nCheck the spelling or try Get-Command to see available commands.`
        if (suggestions.length) message += `\n\nDid you mean: ${suggestions.join(', ')}`
        return { type: 'text', content: personalizeError(message) }
      }
      try {
        if (pathScopedCommands.has(cmd.name.toLowerCase())) {
          const cwd = context.session.cwd || ''
          const requestedPaths = Object.entries(parsed.params)
            .filter(([name]) => pathParameterNames.has(name.toLowerCase()))
            .map(([, value]) => value)
            .filter((value) => typeof value === 'string')
          if (requestedPaths.length === 0 && positionalPathCommands.has(cmd.name.toLowerCase())) {
            requestedPaths.push(...(cmd.name.toLowerCase() === 'copy-item' || cmd.name.toLowerCase() === 'move-item'
              ? parsed.positionals
              : parsed.positionals.slice(0, 1)))
          }
          for (const requestedPath of requestedPaths) {
            const normalized = normalizePath(requestedPath, cwd)
            const displayCwd = displayPath(cwd, context.session.userName?.first || 'guest')
            if (!normalized.ok) {
              const message = `Path error: ${normalized.error} Current directory: ${displayCwd}.`
              return { type: 'text', content: message, notification: { type: 'path-error', message } }
            }
            if (!isInside(normalized.path, cwd)) {
              const message = `Path error: "${requestedPath}" is outside your current directory ${displayCwd}. Use Set-Location to open its folder first.`
              return { type: 'text', content: message, notification: { type: 'path-error', message } }
            }
          }
        }
        const isMkdirAlias = parsed.command.toLowerCase() === 'mkdir'
        const hasItemType = Object.keys(parsed.params).some((name) => name.toLowerCase() === 'itemtype')
        const commandParams = isMkdirAlias && !hasItemType
          ? { ...parsed.params, ItemType: 'Directory' }
          : parsed.params
        result = cmd.run(context, parsed.positionals, commandParams, pipelineValue)
        const content = result?.content
        if (pathScopedCommands.has(cmd.name.toLowerCase()) && typeof content === 'string' && content.startsWith(`${cmd.name}:`)) {
          result = {
            ...result,
            notification: { type: 'path-error', message: content.split('\n')[0] },
          }
        }
        if (typeof content === 'string' && context.session.userName?.first) {
          const commandError = content.startsWith(`${cmd.name}:`)
            || /^(?:No commands matched|Error:|Parse error:)/i.test(content)
          if (commandError) result = { ...result, content: personalizeError(content) }
        }
        pipelineValue = result.pipeline ?? result.content ?? ''
      } catch (err) {
        return { type: 'text', content: personalizeError(`Error: ${err.message || 'Something went wrong.'}\nTry Get-Help ${cmd.name} for usage and examples.`) }
      }
    }
    return result
  }

  return { execute, context, describe }
}
