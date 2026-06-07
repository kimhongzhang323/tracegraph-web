import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ErrorBoundary } from './ErrorBoundary'
import { Component } from 'react'

// A helper component that throws an error when told to do so
class Thrower extends Component<{ shouldThrow: boolean; errorMsg?: string }> {
  render() {
    if (this.props.shouldThrow) {
      throw new Error(this.props.errorMsg || 'Test Render Error')
    }
    return <div>Normal Render Content</div>
  }
}

describe('ErrorBoundary', () => {
  const originalLocation = window.location

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    sessionStorage.clear()

    // Mock window.location.reload
    Object.defineProperty(window, 'location', {
      value: { reload: vi.fn() },
      writable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
    })
  })

  it('renders children when there are no errors', () => {
    render(
      <ErrorBoundary>
        <Thrower shouldThrow={false} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Normal Render Content')).toBeInTheDocument()
  })

  it('renders fallback UI when a normal rendering error is caught', () => {
    render(
      <ErrorBoundary>
        <Thrower shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('An unexpected error occurred while rendering this page.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reload App' })).toBeInTheDocument()
  })

  it('triggers window.location.reload on a chunk load error and sets sessionStorage flag', () => {
    render(
      <ErrorBoundary>
        <Thrower shouldThrow={true} errorMsg="Failed to fetch dynamically imported module" />
      </ErrorBoundary>
    )

    expect(window.location.reload).toHaveBeenCalledOnce()
    expect(sessionStorage.getItem('tg-chunk-reloaded')).toBe('true')
  })

  it('does not reload again and shows fallback UI if sessionStorage indicates it already reloaded once', () => {
    sessionStorage.setItem('tg-chunk-reloaded', 'true')

    render(
      <ErrorBoundary>
        <Thrower shouldThrow={true} errorMsg="Failed to fetch dynamically imported module" />
      </ErrorBoundary>
    )

    expect(window.location.reload).not.toHaveBeenCalled()
    expect(screen.getByText('Application Update')).toBeInTheDocument()
    expect(screen.getByText('A new version of the app has been deployed. Please reload to load the latest version.')).toBeInTheDocument()
  })

  it('resets the reload flag on manual click of the Reload App button', async () => {
    sessionStorage.setItem('tg-chunk-reloaded', 'true')

    render(
      <ErrorBoundary>
        <Thrower shouldThrow={true} errorMsg="Failed to fetch dynamically imported module" />
      </ErrorBoundary>
    )

    const reloadBtn = screen.getByRole('button', { name: 'Reload App' })
    await userEvent.click(reloadBtn)

    expect(sessionStorage.getItem('tg-chunk-reloaded')).toBeNull()
    expect(window.location.reload).toHaveBeenCalledOnce()
  })
})
