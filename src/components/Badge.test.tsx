import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from './Badge'

describe('Badge', () => {
  it('renders children text', () => {
    render(<Badge>stable</Badge>)
    expect(screen.getByText('stable')).toBeInTheDocument()
  })

  it('applies neutral tone classes by default', () => {
    render(<Badge>neutral</Badge>)
    expect(screen.getByText('neutral').className).toContain('bg-ink-100')
  })

  it('applies err tone classes', () => {
    render(<Badge tone="err">error</Badge>)
    expect(screen.getByText('error').className).toContain('bg-rose-50')
  })

  it('applies ok tone classes', () => {
    render(<Badge tone="ok">ok</Badge>)
    expect(screen.getByText('ok').className).toContain('bg-emerald-50')
  })
})
