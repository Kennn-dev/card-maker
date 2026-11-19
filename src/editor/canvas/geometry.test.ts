import { describe, expect, it } from 'vitest'
import { clampToBleed, coverCrop, ptToMm, roundMm } from './geometry'

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

describe('clampToBleed', () => {
  // vùng bleed: 61×91 mm từ (-3,-3); phải còn ít nhất 2 mm của hộp nằm trong
  it('leaves a box inside the bleed untouched', () => {
    expect(clampToBleed({ x: 7.5, y: 70, w: 40, h: 10 })).toEqual({ x: 7.5, y: 70 })
  })

  it('pulls a box dragged past the right/bottom edge back so 2 mm stay inside', () => {
    expect(clampToBleed({ x: 80, y: 120, w: 40, h: 10 })).toEqual({ x: 56, y: 86 })
  })

  it('pulls a box dragged past the left/top edge back so 2 mm stay inside', () => {
    expect(clampToBleed({ x: -100, y: -50, w: 40, h: 10 })).toEqual({ x: -41, y: -11 })
  })
})
