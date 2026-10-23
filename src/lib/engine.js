import { resolve, describe } from './commands/registry.js'
import { parse } from './parser.js'

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
        result = cmd.run(context, parsed.positionals, parsed.params, pipelineValue)
        const content = result?.content
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
