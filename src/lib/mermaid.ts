import type { Edge, StudioNode } from '@/types'

function cleanNode(part: string): { id: string; label?: string } {
  const match = part.trim().match(/^(\w+)(?:\["([^"]+)"\]|\[([^\]]+)\]|\("([^"]+)"\)|\(([^)]+)\)|{([^}]+)})?/)
  if (!match) return { id: part.trim() }
  const id = match[1]
  const label = match[2] ?? match[3] ?? match[4] ?? match[5] ?? match[6]
  return { id, label }
}

export function parseMermaid(src: string): { nodes: StudioNode[]; edges: Edge[] } {
  const nodeMap = new Map<string, { id: string; label?: string }>()
  const edges: Edge[] = []
  
  const lines = src.split('\n')
  for (let line of lines) {
    line = line.trim()
    if (!line || line.startsWith('graph') || line.startsWith('subgraph') || line.startsWith('end') || line.startsWith('style') || line.startsWith('classDef') || line.startsWith('class') || line.startsWith('%%')) {
      continue
    }

    // Split line by --> or --!>
    const parts = line.split(/--!?>/)
    if (parts.length < 2) {
      // Just a node declaration? e.g. A[Label]
      const cleaned = cleanNode(line)
      if (cleaned.id) {
        nodeMap.set(cleaned.id, cleaned)
      }
      continue
    }

    // Process parts sequentially
    let prevNode = cleanNode(parts[0])
    if (prevNode.id) nodeMap.set(prevNode.id, prevNode)

    for (let i = 1; i < parts.length; i++) {
      let part = parts[i].trim()
      let edgeLabel: string | undefined = undefined

      // Check if part starts with |label|
      const labelMatch = part.match(/^\|([^|]+)\|\s*(.*)/)
      if (labelMatch) {
        edgeLabel = labelMatch[1].trim()
        part = labelMatch[2].trim()
      }

      // Check for multi-target, e.g. B & C
      const targets = part.split(/&/).map(t => t.trim())
      for (const target of targets) {
        const currNode = cleanNode(target)
        if (currNode.id) {
          nodeMap.set(currNode.id, currNode)
          edges.push({
            from: prevNode.id,
            to: currNode.id,
            ...(edgeLabel ? { label: edgeLabel } : {})
          })
        }
      }

      const lastTarget = targets[targets.length - 1]
      if (lastTarget) {
        prevNode = cleanNode(lastTarget)
      }
    }
  }

  // Compute in-degrees and out-degrees to determine entry and terminal nodes
  const inDegree = new Map<string, number>()
  const outDegree = new Map<string, number>()

  for (const nodeId of nodeMap.keys()) {
    inDegree.set(nodeId, 0)
    outDegree.set(nodeId, 0)
  }

  for (const edge of edges) {
    inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1)
    outDegree.set(edge.from, (outDegree.get(edge.from) ?? 0) + 1)
  }

  const nodes: StudioNode[] = Array.from(nodeMap.values()).map((node) => {
    const inDeg = inDegree.get(node.id) ?? 0
    const outDeg = outDegree.get(node.id) ?? 0
    return {
      name: node.id,
      kind: 'sync',
      fn: `${node.id}Fn`,
      retry: '-',
      entry: inDeg === 0,
      terminal: outDeg === 0,
    }
  })

  return { nodes, edges }
}
