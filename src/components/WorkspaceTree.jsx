export default function WorkspaceTree({ nodes, onOpen, onRefresh }) {
  const root = nodes?.byId?.[nodes.rootId]
  if (!root) return null

  function renderNode(id, depth = 0) {
    const node = nodes.byId[id]
    if (!node) return null
    if (node.type === 'directory') {
      return (
        <details key={id} className="ws-node ws-dir" style={{ paddingLeft: depth * 12 }} open>
          <summary className="ws-summary">
            <span className="ws-icon">▸</span>
            <span className="ws-name">{node.name}</span>
            <span className="ws-count">{node.childIds.length}</span>
          </summary>
          <div className="ws-children">
            {node.childIds.map((childId) => renderNode(childId, depth + 1))}
          </div>
        </details>
      )
    }
    return (
      <button key={id} type="button" className="ws-node ws-file" style={{ paddingLeft: depth * 12 + 18 }} onClick={() => onOpen?.(getPath(nodes, id))}>
        <span className="ws-icon">·</span>
        <span className="ws-name">{node.name}</span>
      </button>
    )
  }

  function getPath(nodesObj, id) {
    if (!id || id === nodesObj.rootId) return ''
    const parts = []
    let current = nodesObj.byId[id]
    while (current && current.parentId && current.parentId !== nodesObj.rootId) {
      parts.unshift(current.name)
      current = nodesObj.byId[current.parentId]
    }
    if (current && current.parentId === nodesObj.rootId && id !== nodesObj.rootId) {
      // find which child of root
      const rootNode = nodesObj.byId[nodesObj.rootId]
      if (rootNode.childIds.includes(id)) {
        return nodesObj.byId[id].name
      }
    }
    // simpler
    const build = []
    let cur = nodesObj.byId[id]
    while (cur && cur.parentId) {
      build.unshift(cur.name)
      cur = nodesObj.byId[cur.parentId]
    }
    build.shift()
    return build.join('/')
  }

  return (
    <aside className="workspace-tree">
      <div className="workspace-tree-header">
        <span>Workspace</span>
        <button type="button" onClick={onRefresh} title="Refresh">⟳</button>
      </div>
      <div className="workspace-tree-body">
        {root.childIds.length === 0 ? (
          <div className="workspace-empty">Empty workspace<br /><small>Use New-Item to create files.</small></div>
        ) : (
          root.childIds.map((id) => renderNode(id, 0))
        )}
      </div>
    </aside>
  )
}
