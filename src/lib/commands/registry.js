import { badge, badgeClass } from '../format.js'

const commands = new Map()
const aliases = new Map()

export function register(def) {
  if (!def || !def.name) throw new Error('Command requires a name')
  const normalizedName = def.name.toLowerCase()
  if (commands.has(normalizedName)) throw new Error(`Command already registered: ${def.name}`)
  if (!def.run) throw new Error(`Command ${def.name} requires run()`)
  commands.set(normalizedName, def)
  if (Array.isArray(def.aliases)) {
    for (const alias of def.aliases) {
      const normalizedAlias = alias.toLowerCase()
      if (aliases.has(normalizedAlias)) throw new Error(`Alias already registered: ${alias}`)
      aliases.set(normalizedAlias, normalizedName)
    }
  }
  return def
}

export function resolve(name) {
  if (!name) return null
  const normalizedName = name.toLowerCase()
  const canonicalName = aliases.get(normalizedName) || normalizedName
  return commands.get(canonicalName) || null
}

export function list() {
  return Array.from(commands.values()).sort((a, b) => a.name.localeCompare(b.name))
}

export function find(query) {
  const q = query.toLowerCase()
  return list().filter((cmd) => {
    return cmd.name.toLowerCase().includes(q) || (cmd.summary || '').toLowerCase().includes(q)
  })
}

export function describe(cmd) {
  if (!cmd) return ''
  const lines = []
  lines.push(`${cmd.name}  [${badge(cmd.category)}]`)
  if (cmd.summary) lines.push(`Summary: ${cmd.summary}`)
  if (cmd.simulated || cmd.category === 'real') {
    lines.push('Note: Simulated in your browser. This does not execute native PowerShell or touch your real filesystem.')
  }
  if (cmd.usage) lines.push(`Usage:   ${cmd.usage}`)
  if (Array.isArray(cmd.parameters) && cmd.parameters.length) {
    lines.push('Parameters:')
    for (const param of cmd.parameters) {
      const required = param.required ? '(Required)' : '(Optional)'
      lines.push(`  ${param.name} ${required} - ${param.description || ''}`)
    }
  }
  if (Array.isArray(cmd.aliases) && cmd.aliases.length) {
    lines.push(`Aliases: ${cmd.aliases.join(', ')}`)
  }
  if (Array.isArray(cmd.examples) && cmd.examples.length) {
    lines.push('Examples:')
    for (const example of cmd.examples) {
      lines.push(`  ${example}`)
    }
  }
  return lines.join('\n')
}

export function badgeInfo(cmd) {
  return { text: badge(cmd.category), className: badgeClass(cmd.category) }
}
