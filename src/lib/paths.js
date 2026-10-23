export const RESERVED_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i

export function validateName(name) {
  if (typeof name !== 'string' || !name.trim()) {
    return { ok: false, error: 'A name is required.' }
  }
  if (name === '.' || name === '..') {
    return { ok: false, error: 'That name is reserved.' }
  }
  // eslint-disable-next-line no-control-regex
  if (/[<>:"/\\|?*\u0000-\u001f]/.test(name)) {
    return { ok: false, error: `"${name}" contains a character that is not allowed.` }
  }
  if (name !== name.trim() || /[. ]$/.test(name)) {
    return { ok: false, error: `"${name}" cannot start or end with a space or end with a dot.` }
  }
  if (RESERVED_NAMES.test(name)) {
    return { ok: false, error: `"${name}" is a reserved Windows name.` }
  }
  return { ok: true }
}

export function normalizePath(input, cwd = '') {
  if (typeof input !== 'string' || !input.trim()) {
    return { ok: false, error: 'A path is required.' }
  }
  let raw = input.trim().replace(/\\/g, '/')
  const fromRoot = raw.startsWith('/') || raw.startsWith('~')
  if (fromRoot) {
    raw = raw.replace(/^[~/]+/, '')
  }
  const stack = fromRoot ? [] : cwd.split('/').filter(Boolean)
  for (const part of raw.split('/')) {
    if (!part || part === '.') continue
    if (part === '..') {
      if (stack.length === 0) {
        return { ok: false, error: 'That path leaves the workspace.' }
      }
      stack.pop()
      continue
    }
    const nameCheck = validateName(part)
    if (!nameCheck.ok) return nameCheck
    stack.push(part)
  }
  return { ok: true, path: stack.join('/') }
}

export function joinPath(...parts) {
  return parts.filter(Boolean).join('/')
}

export function dirname(path) {
  if (!path) return ''
  const index = path.lastIndexOf('/')
  return index === -1 ? '' : path.slice(0, index)
}

export function basename(path) {
  if (!path) return 'workspace'
  const index = path.lastIndexOf('/')
  return index === -1 ? path : path.slice(index + 1)
}

export function displayPath(path) {
  return path ? `C:\\workspace\\${path.replace(/\//g, '\\')}` : 'C:\\workspace'
}

export function isInside(path, parent) {
  if (path === parent) return true
  if (!parent) return true
  return path.startsWith(`${parent}/`)
}
