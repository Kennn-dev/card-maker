import { describe, expect, it } from 'vitest'
import { pxPerMm } from './useStageScale'

describe('pxPerMm', () => {
  it('fits the 61×91 mm bleed area with a 16 px margin, limited by height', () => {
    // (1000-32)/61 = 15.87; (500-32)/91 = 5.14
    expect(pxPerMm(1000, 500)).toBeCloseTo(468 / 91, 6)
  })
  it('limited by width on narrow containers', () => {
    expect(pxPerMm(390, 800)).toBeCloseTo(358 / 61, 6)
  })
  it('never negative for tiny or empty containers', () => {
    expect(pxPerMm(0, 0)).toBe(0)
    expect(pxPerMm(20, 900)).toBe(0)
  })
})
