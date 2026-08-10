import { describe, it, expect } from 'vitest'
import { fmt } from './format'

describe('fmt', () => {
  it('formats zero/null/undefined as "0"', () => {
    expect(fmt(0)).toBe('0')
    expect(fmt(null)).toBe('0')
    expect(fmt(undefined)).toBe('0')
  })

  it('formats numbers with locale grouping', () => {
    expect(fmt(1000)).toBe('1,000')
    expect(fmt(1806000)).toBe('1,806,000')
  })
})
