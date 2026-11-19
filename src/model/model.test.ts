import { describe, expect, it } from 'vitest'
import { createTextLayer } from './factory'
import { snapBox } from './snap'
import { isCardDesign } from './validate'
import { loadPresetDesign } from '@/presets'

describe('snapBox', () => {
  it('snaps box center to card center within 1.5mm', () => {
    expect(snapBox({ x: 8.6, y: 18, w: 20, h: 10 })).toEqual({ x: 8.6, y: 18 })
    expect(snapBox({ x: 18.0, y: 37.0, w: 20, h: 10 })).toEqual({ x: 17.5, y: 37.5 })
  })
  it('snaps edges to safe zone', () => {
    expect(snapBox({ x: 4.2, y: 70.9, w: 10, h: 10 })).toEqual({ x: 3, y: 72 })
  })
  it('snaps right edge to safe zone', () => {
    expect(snapBox({ x: 41.5, y: 20, w: 10, h: 10 })).toEqual({ x: 42, y: 20 })
  })
})

describe('createTextLayer', () => {
  it('has defaults', () => {
    const l = createTextLayer()
    expect(l).toMatchObject({ type: 'text', w: 40, h: 10, props: { text: 'Nhập chữ', size: 14, align: 'center' } })
    expect(l.x).toBeCloseTo(7.5)
    expect(createTextLayer().id).not.toBe(l.id)
  })
})

describe('isCardDesign', () => {
  it('rejects garbage and wrong version', () => {
    expect(isCardDesign(null)).toBe(false)
    expect(isCardDesign({ version: 2, front: { layers: [] }, back: { layers: [] } })).toBe(false)
    expect(isCardDesign(loadPresetDesign('photocard-basic'))).toBe(true)
  })
  it('rejects layers with bad type or non-finite numbers', () => {
    const d = loadPresetDesign('photocard-basic')
    d.front.layers[0].x = Number.NaN
    expect(isCardDesign(d)).toBe(false)
    const e = loadPresetDesign('photocard-basic') as unknown as { front: { layers: { type: string }[] } }
    e.front.layers[0].type = 'shape'
    expect(isCardDesign(e)).toBe(false)
  })
})
