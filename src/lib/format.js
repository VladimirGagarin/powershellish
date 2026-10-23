export function badge(category) {
  if (category === 'real') return 'Real · simulated'
  if (category === 'custom') return 'PowerShellish'
  if (category === 'educational') return 'Example'
  return category
}

export function badgeClass(category) {
  if (category === 'real') return 'badge-real'
  if (category === 'custom') return 'badge-custom'
  return 'badge-example'
}

export function success(text) {
  return text
}

export function table(rows) {
  if (!rows.length) return ''
  const keys = Object.keys(rows[0])
  const header = keys.join('  ')
  const sep = keys.map((key) => '-'.repeat(Math.max(key.length, 4))).join('  ')
  const body = rows.map((row) => keys.map((key) => String(row[key] ?? '')).join('  ')).join('\n')
  return [header, sep, body].filter(Boolean).join('\n')
}

export function error(message) {
  return `Error: ${message}`
}

export function teach(message) {
  return message
}
