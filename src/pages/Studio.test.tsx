import { describe, it, expect } from 'vitest'
import { parseMermaid } from '@/lib/mermaid'

describe('parseMermaid', () => {
  it('should parse standard --> connections', () => {
    const src = `
      graph TD
      A --> B
    `
    const { nodes, edges } = parseMermaid(src)
    expect(nodes).toHaveLength(2)
    expect(nodes.map(n => n.name)).toContain('A')
    expect(nodes.map(n => n.name)).toContain('B')
    expect(edges).toHaveLength(1)
    expect(edges[0]).toEqual({ from: 'A', to: 'B' })
  })

  it('should parse --!> connections as HTML comment end tags / edges', () => {
    const src = `
      graph TD
      A --!> B
    `
    const { nodes, edges } = parseMermaid(src)
    expect(nodes).toHaveLength(2)
    expect(nodes.map(n => n.name)).toContain('A')
    expect(nodes.map(n => n.name)).toContain('B')
    expect(edges).toHaveLength(1)
    expect(edges[0]).toEqual({ from: 'A', to: 'B' })
  })

  it('should parse multi-step connections with a mix of --> and --!>', () => {
    const src = `
      graph TD
      A --> B --!> C
    `
    const { nodes, edges } = parseMermaid(src)
    expect(nodes).toHaveLength(3)
    expect(nodes.map(n => n.name)).toContain('A')
    expect(nodes.map(n => n.name)).toContain('B')
    expect(nodes.map(n => n.name)).toContain('C')
    expect(edges).toHaveLength(2)
    expect(edges[0]).toEqual({ from: 'A', to: 'B' })
    expect(edges[1]).toEqual({ from: 'B', to: 'C' })
  })
})
