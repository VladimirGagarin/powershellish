

function crc32(data) {
  let crc = 0xffffffff
  for (let i = 0; i < data.length; i += 1) {
    crc = crc ^ data[i]
    for (let j = 0; j < 8; j += 1) {
      const mask = (crc & 1) ? 0xedb88320 : 0
      crc = ((crc >>> 1) ^ mask) >>> 0
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function writeUint32(view, offset, value) {
  view.setUint32(offset, value >>> 0, true)
}

function writeUint16(view, offset, value) {
  view.setUint16(offset, value & 0xffff, true)
}

function u8(str) {
  return new TextEncoder().encode(str)
}

export function buildZip(nodes, rootId) {
  const files = []
  const byId = nodes.byId
  const stack = [rootId]
  while (stack.length) {
    const current = stack.pop()
    const node = byId[current]
    if (!node) continue
    if (node.type === 'directory') {
      for (let i = 0; i < node.childIds.length; i += 1) stack.push(node.childIds[i])
      continue
    }
    let path = node.name
    let parent = byId[node.parentId]
    while (parent && parent.id !== rootId) {
      path = `${parent.name}/${path}`
      parent = byId[parent.parentId]
    }
    files.push({ name: path, data: u8(node.content || '') })
  }
  if (files.length === 0) {
    throw new Error('The workspace is empty. Create a file before exporting.')
  }
  const localFiles = []
  const central = []
  let offset = 0
  const now = new Date()
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2)
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()
  for (const file of files) {
    const name = u8(file.name)
    const data = file.data
    const crc = crc32(data)
    const localHeaderSize = 30 + name.length
    const view = new DataView(new ArrayBuffer(localHeaderSize + data.length))
    writeUint32(view, 0, 0x04034b50)
    writeUint16(view, 4, 20)
    writeUint16(view, 6, 0x0800)
    writeUint16(view, 8, 0)
    writeUint16(view, 10, dosTime)
    writeUint16(view, 12, dosDate)
    writeUint32(view, 14, crc)
    writeUint32(view, 18, data.length)
    writeUint32(view, 22, data.length)
    writeUint16(view, 26, name.length)
    writeUint16(view, 28, 0)
    new Uint8Array(view.buffer, 30, name.length).set(name)
    new Uint8Array(view.buffer, 30 + name.length, data.length).set(data)
    localFiles.push(view.buffer)
    central.push({ name, data, crc, dosTime, dosDate, offset, size: data.length })
    offset += view.buffer.byteLength
  }
  const centralParts = []
  let centralSize = 0
  for (const file of central) {
    const headerSize = 46 + file.name.length
    const view = new DataView(new ArrayBuffer(headerSize))
    writeUint32(view, 0, 0x02014b50)
    writeUint16(view, 4, 20)
    writeUint16(view, 6, 20)
    writeUint16(view, 8, 0x0800)
    writeUint16(view, 10, 0)
    writeUint16(view, 12, file.dosTime)
    writeUint16(view, 14, file.dosDate)
    writeUint32(view, 16, file.crc)
    writeUint32(view, 20, file.size)
    writeUint32(view, 24, file.size)
    writeUint16(view, 28, file.name.length)
    writeUint16(view, 30, 0)
    writeUint16(view, 32, 0)
    writeUint16(view, 34, 0)
    writeUint16(view, 36, 0)
    writeUint32(view, 38, 0)
    writeUint32(view, 42, file.offset)
    new Uint8Array(view.buffer, 46, file.name.length).set(file.name)
    centralParts.push(view.buffer)
    centralSize += view.buffer.byteLength
  }
  const end = new DataView(new ArrayBuffer(22))
  writeUint32(end, 0, 0x06054b50)
  writeUint16(end, 4, 0)
  writeUint16(end, 6, 0)
  writeUint16(end, 8, central.length)
  writeUint16(end, 10, central.length)
  writeUint32(end, 12, centralSize)
  writeUint32(end, 16, offset)
  writeUint16(end, 20, 0)
  const parts = [...localFiles, ...centralParts, end.buffer]
  return new Blob(parts, { type: 'application/zip' })
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadText(filename, text) {
  downloadBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), filename)
}

export function timestamp() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}
