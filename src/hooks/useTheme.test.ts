import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTheme } from './useTheme'

beforeEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove('dark')
})

describe('useTheme', () => {
  it('defaults to light when localStorage is empty', () => {
    const { result } = renderHook(() => useTheme())
    expect(result.current[0]).toBe('light')
  })

  it('reads stored value from localStorage on mount', () => {
    localStorage.setItem('tg-theme', 'dark')
    const { result } = renderHook(() => useTheme())
    expect(result.current[0]).toBe('dark')
  })

  it('adds dark class to documentElement when theme is dark', () => {
    const { result } = renderHook(() => useTheme())
    act(() => result.current[1]('dark'))
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('removes dark class when switching back to light', () => {
    const { result } = renderHook(() => useTheme())
    act(() => result.current[1]('dark'))
    act(() => result.current[1]('light'))
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('persists theme to localStorage', () => {
    const { result } = renderHook(() => useTheme())
    act(() => result.current[1]('dark'))
    expect(localStorage.getItem('tg-theme')).toBe('dark')
  })

  it('returns a [theme, setTheme] tuple', () => {
    const { result } = renderHook(() => useTheme())
    expect(typeof result.current[0]).toBe('string')
    expect(typeof result.current[1]).toBe('function')
  })
})
