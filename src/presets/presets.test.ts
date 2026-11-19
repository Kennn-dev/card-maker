import { describe, expect, it } from 'vitest'
import { PRESETS, loadPresetDesign } from '.'

describe('presets', () => {
  it('has the two temporary presets', () => {
    expect(PRESETS.map((p) => p.id)).toEqual(['photocard-basic', 'polaroid-basic'])
  })
  it('loadPresetDesign returns fresh copies with new layer ids', () => {
    const a = loadPresetDesign('polaroid-basic')
    const b = loadPresetDesign('polaroid-basic')
    expect(a).not.toBe(b)
    expect(a.front.layers[0].id).not.toBe(b.front.layers[0].id)
    a.front.layers[0].x = 99
    expect(loadPresetDesign('polaroid-basic').front.layers[0].x).toBe(5)
  })
  it('unknown preset id falls back to first preset', () => {
    expect(loadPresetDesign('nope').presetId).toBe('photocard-basic')
  })
  it('photocard-basic front: full-bleed image then name text', () => {
    const d = loadPresetDesign('photocard-basic')
    expect(d.front.layers.map((l) => l.type)).toEqual(['image', 'text'])
    expect(d.front.layers[0]).toMatchObject({ x: -3, y: -3, w: 61, h: 91 })
    expect(d.back.background.color).toBe('#f5f5f5')
  })
  it('polaroid-basic front: image then caption', () => {
    const d = loadPresetDesign('polaroid-basic')
    expect(d.front.layers.map((l) => l.type)).toEqual(['image', 'text'])
    expect(d.front.layers[0]).toMatchObject({ x: 5, y: 5, w: 45, h: 55 })
    expect(d.back.layers).toEqual([])
  })
})
