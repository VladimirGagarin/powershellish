function tokenize(input) {
  const tokens = []
  let current = ''
  let quote = null
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i]
    if (quote) {
      if (char === quote) {
        quote = null
        continue
      }
      current += char
      continue
    }
    if (char === '"' || char === "'") {
      quote = char
      continue
    }
    if (/\s/.test(char)) {
      if (current) {
        tokens.push(current)
        current = ''
      }
      continue
    }
    current += char
  }
  if (quote) {
    throw new Error('Unclosed quote. Use a matching " or \' and try again.')
  }
  if (current) tokens.push(current)
  return tokens
}

export function parse(input) {
  try {
    const tokens = tokenize(input.trim())
    if (tokens.length === 0) return { ok: true, empty: true, command: '', args: [], params: {}, positionals: [] }
    const [command, ...rest] = tokens
    const params = {}
    const positionals = []
    for (let i = 0; i < rest.length; i += 1) {
      const token = rest[i]
      if (token.startsWith('-')) {
        const name = token.replace(/^--?/, '')
        if (i + 1 < rest.length && !rest[i + 1].startsWith('-')) {
          params[name] = rest[i + 1]
          i += 1
        } else {
          params[name] = true
        }
        continue
      }
      positionals.push(token)
    }
    return { ok: true, command, args: rest, params, positionals }
  } catch (error) {
    return { ok: false, error: error.message }
  }
}
