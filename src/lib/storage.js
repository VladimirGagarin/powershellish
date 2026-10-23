const LS_THEME = 'powershellish-theme'
const LS_PREFS = 'powershellish-prefs'
const DB_NAME = 'powershellish-vfs'
const STORE = 'workspace'
const KEY = 'snapshot'

function openDb() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('indexeddb-unavailable'))
      return
    }
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function loadWorkspace() {
  try {
    const db = await openDb()
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readonly')
      const store = tx.objectStore(STORE)
      const req = store.get(KEY)
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

export async function saveWorkspace(snapshot) {
  try {
    const db = await openDb()
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readwrite')
      const store = tx.objectStore(STORE)
      store.put(snapshot, KEY)
      tx.oncomplete = () => resolve(true)
      tx.onerror = () => resolve(false)
    })
  } catch {
    return false
  }
}

export async function clearWorkspace() {
  try {
    const db = await openDb()
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readwrite')
      const store = tx.objectStore(STORE)
      store.delete(KEY)
      tx.oncomplete = () => resolve(true)
      tx.onerror = () => resolve(false)
    })
  } catch {
    return false
  }
}

export function loadTheme() {
  try {
    return localStorage.getItem(LS_THEME)
  } catch {
    return null
  }
}

export function saveTheme(theme) {
  try {
    localStorage.setItem(LS_THEME, theme)
  } catch { /* ignore */ }
}

export function loadPrefs() {
  try {
    const raw = localStorage.getItem(LS_PREFS)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function savePrefs(prefs) {
  try {
    localStorage.setItem(LS_PREFS, JSON.stringify(prefs))
    return true
  } catch { return false }
}

export function loadUserName() {
  const name = loadPrefs()?.userName
  if (!name || typeof name.first !== 'string' || typeof name.last !== 'string') return null
  return { first: name.first, last: name.last }
}

export function saveUserName(userName) {
  const prefs = loadPrefs() || {}
  return savePrefs({ ...prefs, userName })
}

export function storageAvailable() {
  try {
    const test = '__ps_check__'
    localStorage.setItem(test, test)
    localStorage.removeItem(test)
    return true
  } catch {
    return false
  }
}
