import { describe, expect, it } from 'vitest'
import { coverCrop, ptToMm, roundMm } from './geometry'

describe('ptToMm', () => {
  it('converts points to millimetres', () => {
    expect(ptToMm(72)).toBeCloseTo(25.4, 6)
    expect(ptToMm(16)).toBeCloseTo(5.6444, 3)
  })
})

describe('roundMm', () => {
  it('rounds to 0.1', () => {
    expect(roundMm(7.549)).toBe(7.5)
    expect(roundMm(7.55)).toBe(7.6)
    expect(roundMm(-2.96)).toBe(-3)
  })
})

describe('coverCrop', () => {
  it('crops the sides of a wide image, centred', () => {
    // ảnh 4000×2000 vào khung 1:1 → lấy 2000×2000 ở giữa
    expect(coverCrop(4000, 2000, 10, 10)).toEqual({ x: 1000, y: 0, width: 2000, height: 2000 })
  })
  it('crops top/bottom of a tall image, centred', () => {
    expect(coverCrop(1000, 3000, 20, 10)).toEqual({ x: 0, y: 1250, width: 1000, height: 500 })
  })
  it('uses the full image when ratios match', () => {
    expect(coverCrop(610, 910, 61, 91)).toEqual({ x: 0, y: 0, width: 610, height: 910 })
  })
})
