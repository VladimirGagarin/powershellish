import { basename, dirname, displayPath, normalizePath, validateName } from './paths.js'

function uid() {
  return `n_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`
}

export function createVfs() {
  const rootId = uid()
  const workspaceId = uid()
  const now = Date.now()
  const nodes = {
    byId: {
      [rootId]: {
        id: rootId,
        type: 'directory',
        name: 'PS',
        parentId: null,
        childIds: [workspaceId],
        createdAt: now,
        updatedAt: now,
      },
      [workspaceId]: {
        id: workspaceId,
        type: 'directory',
        name: 'workspace',
        parentId: rootId,
        childIds: [],
        createdAt: now,
        updatedAt: now,
      },
    },
    rootId,
    version: 2,
  }
  return nodes
}

function clone(nodes) {
  return JSON.parse(JSON.stringify(nodes))
}

export function migrateVfs(nodes, activePath = '') {
  if (!nodes?.byId?.[nodes.rootId] || nodes.version >= 2) return nodes
  const next = clone(nodes)
  const root = next.byId[next.rootId]
  const now = Date.now()
  const workspaceId = uid()
  const activeRoot = String(activePath || '').split('/').filter(Boolean)[0]
  next.byId[workspaceId] = {
    id: workspaceId,
    type: 'directory',
    name: 'workspace',
    parentId: next.rootId,
    childIds: [],
    createdAt: now,
    updatedAt: now,
  }
  const keepAtRoot = []
  for (const id of root.childIds || []) {
    const child = next.byId[id]
    if (!child) continue
    if (activeRoot && child.name === activeRoot) keepAtRoot.push(id)
    else {
      child.parentId = workspaceId
      next.byId[workspaceId].childIds.push(id)
    }
  }
  root.name = 'PS'
  root.childIds = [workspaceId, ...keepAtRoot]
  root.updatedAt = now
  next.version = 2
  return next
}

function ensureDirectory(nodes, dirPath) {
  if (!dirPath) return nodes.rootId
  let current = nodes.rootId
  const parts = dirPath.split('/').filter(Boolean)
  for (let i = 0; i < parts.length; i += 1) {
    const parent = nodes.byId[current]
    const existingId = parent.childIds.find((id) => {
      const child = nodes.byId[id]
      return child && child.type === 'directory' && child.name === parts[i]
    })
    if (existingId) {
      current = existingId
      continue
    }
    const id = uid()
    const now = Date.now()
    nodes.byId[id] = {
      id,
      type: 'directory',
      name: parts[i],
      parentId: current,
      childIds: [],
      createdAt: now,
      updatedAt: now,
    }
    nodes.byId[current].childIds.push(id)
    nodes.byId[current].updatedAt = now
    current = id
  }
  return current
}

function findChild(nodes, parentId, name) {
  const parent = nodes.byId[parentId]
  if (!parent) return null
  for (let i = 0; i < parent.childIds.length; i += 1) {
    const child = nodes.byId[parent.childIds[i]]
    if (child && child.name === name) return child
  }
  return null
}

function pathToId(nodes, path, cwd = '') {
  if (!path) {
    if (!cwd) return nodes.rootId
    path = cwd
    cwd = ''
  }
  const normalized = normalizePath(path, cwd)
  if (!normalized.ok) return { error: normalized.error }
  if (!normalized.path) return nodes.rootId
  const parts = normalized.path.split('/').filter(Boolean)
  let current = nodes.rootId
  for (let i = 0; i < parts.length; i += 1) {
    const child = findChild(nodes, current, parts[i])
    if (!child) return { error: `The item "${parts[i]}" was not found.` }
    current = child.id
  }
  return current
}

export function getPath(nodes, id) {
  if (!id || id === nodes.rootId) return ''
  const parts = []
  let current = nodes.byId[id]
  while (current && current.parentId) {
    parts.unshift(current.name)
    current = nodes.byId[current.parentId]
  }
  return parts.join('/')
}

export function listChildren(nodes, path, cwd = '') {
  const resolved = pathToId(nodes, path || '', cwd)
  if (typeof resolved === 'object' && resolved.error) return resolved
  const dir = nodes.byId[resolved]
  if (!dir || dir.type !== 'directory') return { error: 'That path is not a directory.' }
  const items = dir.childIds.map((id) => {
    const child = nodes.byId[id]
    if (!child) return null
    if (child.type === 'directory') {
      return { name: child.name, type: 'Directory', size: child.childIds.length, path: getPath(nodes, child.id) }
    }
    const bytes = new TextEncoder().encode(child.content || '').length
    return { name: child.name, type: 'File', size: bytes, path: getPath(nodes, child.id) }
  }).filter(Boolean)
  return { items, display: displayPath(getPath(nodes, dir.id) || '') }
}

export function readFile(nodes, path, cwd = '') {
  const resolved = pathToId(nodes, path, cwd)
  if (typeof resolved === 'object' && resolved.error) return resolved
  const node = nodes.byId[resolved]
  if (!node) return { error: 'File not found.' }
  if (node.type !== 'file') return { error: 'That path points to a directory.' }
  return { content: node.content || '', path: getPath(nodes, node.id), display: displayPath(getPath(nodes, node.id)) }
}

export function writeFile(nodes, path, content, cwd = '', append = false) {
  const n = clone(nodes)
  const normalized = normalizePath(path, cwd)
  if (!normalized.ok) return { ok: false, error: normalized.error }
  const fullPath = normalized.path
  if (!fullPath) return { ok: false, error: 'A file path is required.' }
  const dirPath = dirname(fullPath)
  const name = basename(fullPath)
  const nameCheck = validateName(name)
  if (!nameCheck.ok) return { ok: false, error: nameCheck.error }
  const parentId = ensureDirectory(n, dirPath)
  const existing = findChild(n, parentId, name)
  const now = Date.now()
  if (existing) {
    if (existing.type === 'directory') return { ok: false, error: `"${name}" is a directory.` }
    existing.content = append ? (existing.content || '') + (content || '') : (content || '')
    existing.updatedAt = now
    n.byId[parentId].updatedAt = now
    return { ok: true, nodes: n, path: getPath(n, existing.id) }
  }
  const id = uid()
  n.byId[id] = {
    id,
    type: 'file',
    name,
    parentId,
    content: content || '',
    createdAt: now,
    updatedAt: now,
  }
  n.byId[parentId].childIds.push(id)
  n.byId[parentId].updatedAt = now
  return { ok: true, nodes: n, path: getPath(n, id) }
}

export function newItem(nodes, itemType, path, cwd = '') {
  const type = String(itemType).toLowerCase()
  if (type !== 'file' && type !== 'directory') {
    return { ok: false, error: "ItemType must be 'File' or 'Directory'." }
  }
  const normalized = normalizePath(path, cwd)
  if (!normalized.ok) return { ok: false, error: normalized.error }
  const fullPath = normalized.path
  if (!fullPath) return { ok: false, error: 'A path is required.' }
  const dirPath = dirname(fullPath)
  const name = basename(fullPath)
  const nameCheck = validateName(name)
  if (!nameCheck.ok) return { ok: false, error: nameCheck.error }
  const n = clone(nodes)
  const parentId = ensureDirectory(n, dirPath)
  if (findChild(n, parentId, name)) return { ok: false, error: `"${displayPath(fullPath)}" already exists.` }
  const id = uid()
  const now = Date.now()
  if (type === 'directory') {
    n.byId[id] = { id, type: 'directory', name, parentId, childIds: [], createdAt: now, updatedAt: now }
  } else {
    n.byId[id] = { id, type: 'file', name, parentId, content: '', createdAt: now, updatedAt: now }
  }
  n.byId[parentId].childIds.push(id)
  n.byId[parentId].updatedAt = now
  return { ok: true, nodes: n, path: fullPath }
}

export function removeItem(nodes, path, cwd = '', confirmed = false) {
  const n = clone(nodes)
  const normalized = normalizePath(path, cwd)
  if (!normalized.ok) return { ok: false, error: normalized.error }
  if (!normalized.path) return { ok: false, error: 'You cannot remove the workspace root.' }
  const resolved = pathToId(n, normalized.path)
  if (typeof resolved === 'object' && resolved.error) return { ok: false, error: resolved.error }
  const node = n.byId[resolved]
  if (!node) return { ok: false, error: 'Item not found.' }
  if (node.parentId === null) return { ok: false, error: 'You cannot remove the workspace root.' }
  const parent = n.byId[node.parentId]
  if (!confirmed) {
    function countItems(id) {
      const current = n.byId[id]
      if (!current || current.type !== 'directory') return 0
      return current.childIds.reduce((total, childId) => {
        const child = n.byId[childId]
        return total + 1 + (child?.type === 'directory' ? countItems(childId) : 0)
      }, 0)
    }
    return {
      ok: false,
      needsConfirm: true,
      kind: node.type,
      path: normalized.path,
      count: node.type === 'directory' ? countItems(node.id) : 0,
    }
  }
  function collect(id, set) {
    const cur = n.byId[id]
    if (!cur) return
    set.add(id)
    if (cur.type === 'directory') cur.childIds.forEach((childId) => collect(childId, set))
  }
  const toDelete = new Set()
  collect(resolved, toDelete)
  toDelete.forEach((id) => { delete n.byId[id] })
  parent.childIds = parent.childIds.filter((id) => id !== resolved)
  parent.updatedAt = Date.now()
  return { ok: true, nodes: n }
}

export function renameItem(nodes, path, newName, cwd = '') {
  const n = clone(nodes)
  const normalized = normalizePath(path, cwd)
  if (!normalized.ok) return { ok: false, error: normalized.error }
  if (!normalized.path) return { ok: false, error: 'You cannot rename the workspace root.' }
  const nameCheck = validateName(newName)
  if (!nameCheck.ok) return { ok: false, error: nameCheck.error }
  const resolved = pathToId(n, normalized.path)
  if (typeof resolved === 'object' && resolved.error) return { ok: false, error: resolved.error }
  const node = n.byId[resolved]
  if (!node || node.parentId === null) return { ok: false, error: 'You cannot rename the workspace root.' }
  const parent = n.byId[node.parentId]
  if (findChild(n, node.parentId, newName)) return { ok: false, error: `"newName" collides with an existing item.` }
  const oldPath = getPath(n, node.id)
  node.name = newName
  node.updatedAt = Date.now()
  parent.updatedAt = Date.now()
  return { ok: true, nodes: n, path: getPath(n, node.id), oldPath }
}

export function importFiles(nodes, files, cwd = '') {
  let n = clone(nodes)
  const results = []
  for (let i = 0; i < files.length; i += 1) {
    const file = files[i]
    const name = file.name
    const nameCheck = validateName(basename(name))
    if (!nameCheck.ok) {
      results.push({ name, ok: false, error: nameCheck.error })
      continue
    }
    try {
      const text = file.text
      if (text.includes('\u0000')) {
        results.push({ name, ok: false, error: 'Binary files are not supported in Phase 1.' })
        continue
      }
      if (new TextEncoder().encode(text).length > 1024 * 1024) {
        results.push({ name, ok: false, error: 'File exceeds the 1 MB limit.' })
        continue
      }
      const result = writeFile(n, name, text, cwd, false)
      if (!result.ok) {
        results.push({ name, ok: false, error: result.error })
        continue
      }
      n = result.nodes
      results.push({ name, ok: true, path: result.path })
    } catch {
      results.push({ name, ok: false, error: 'Could not read that file.' })
    }
  }
  return { ok: true, nodes: n, results }
}

export function serialize(nodes) {
  return JSON.stringify(nodes)
}

export function deserialize(raw) {
  try {
    const parsed = JSON.parse(raw)
    if (parsed && parsed.byId && parsed.rootId) return parsed
  } catch { /* ignore */ }
  return null
}
