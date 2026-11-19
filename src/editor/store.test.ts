import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createImageLayer, createTextLayer } from '@/model/factory'
import { loadPresetDesign } from '@/presets'
import { STORAGE_KEY, flushSave, resetEditorStoreForTest, useEditorStore } from './store'

const s = () => useEditorStore.getState()
const frontLen = () => s().design.front.layers.length

beforeEach(() => {
  vi.useFakeTimers()
  localStorage.clear()
  resetEditorStoreForTest()
})
afterEach(() => {
  vi.useRealTimers()
})

describe('history', () => {
  it('addLayer then undo/redo restores designs', () => {
    expect(frontLen()).toBe(2)
    const layer = createTextLayer()
    s().addLayer(layer)
    expect(frontLen()).toBe(3)
    expect(s().selectedId).toBe(layer.id)
    s().undo()
    expect(frontLen()).toBe(2)
    s().redo()
    expect(frontLen()).toBe(3)
  })

  it('addLayer goes to the current side', () => {
    s().setSide('back')
    const before = s().design.back.layers.length
    s().addLayer(createImageLayer())
    expect(s().design.back.layers.length).toBe(before + 1)
    expect(frontLen()).toBe(2)
  })

  it('caps history at 50', () => {
    for (let i = 0; i < 51; i++) s().addLayer(createTextLayer())
    expect(s().past.length).toBe(50)
  })

  it('undo/redo with empty history is a no-op', () => {
    const design = s().design
    s().undo()
    s().redo()
    expect(s().design).toBe(design)
  })

  it('new change clears future', () => {
    s().addLayer(createTextLayer())
    s().undo()
    expect(s().future.length).toBe(1)
    s().addLayer(createTextLayer())
    expect(s().future.length).toBe(0)
  })

  it('coalesced updates make one history step', () => {
    const text = s().design.front.layers.find((l) => l.type === 'text')!
    const original = (text.props as { text: string }).text
    const key = 'text:' + text.id
    s().updateLayer(text.id, { props: { text: 'a' } }, { coalesce: key })
    s().updateLayer(text.id, { props: { text: 'ab' } }, { coalesce: key })
    expect(s().past.length).toBe(1)
    const current = s().design.front.layers.find((l) => l.id === text.id)!
    expect((current.props as { text: string }).text).toBe('ab')
    s().undo()
    const undone = s().design.front.layers.find((l) => l.id === text.id)!
    expect((undone.props as { text: string }).text).toBe(original)
  })

  it('a different action between coalesced updates breaks the coalescing', () => {
    const text = s().design.front.layers.find((l) => l.type === 'text')!
    const key = 'text:' + text.id
    s().updateLayer(text.id, { props: { text: 'a' } }, { coalesce: key })
    s().addLayer(createTextLayer())
    s().updateLayer(text.id, { props: { text: 'ab' } }, { coalesce: key })
    expect(s().past.length).toBe(3)
  })

  it('updateLayer merges props shallowly and patches other fields', () => {
    const text = s().design.front.layers.find((l) => l.type === 'text')!
    const before = text.props as { size: number; text: string }
    s().updateLayer(text.id, { x: 12, props: { text: 'Hi' } })
    const after = s().design.front.layers.find((l) => l.id === text.id)!
    expect(after.x).toBe(12)
    expect((after.props as typeof before).text).toBe('Hi')
    expect((after.props as typeof before).size).toBe(before.size)
  })

  it('removeLayer clears selection only when removing the selected layer', () => {
    const a = createTextLayer()
    const b = createTextLayer()
    s().addLayer(a)
    s().addLayer(b)
    s().removeLayer(a.id)
    expect(s().selectedId).toBe(b.id)
    s().removeLayer(b.id)
    expect(s().selectedId).toBeNull()
    expect(frontLen()).toBe(2)
  })

  it('undo after loadPreset returns previous design', () => {
    const before = s().design
    s().loadPreset('polaroid-basic')
    expect(s().design.presetId).toBe('polaroid-basic')
    expect(s().dirty).toBe(false)
    s().undo()
    expect(s().design).toBe(before)
  })

  it('setSide and select do not create history', () => {
    s().setSide('back')
    s().select('x')
    s().select(null)
    expect(s().past.length).toBe(0)
    expect(s().saveState).toBe('saved')
  })

  it('marks dirty on edits', () => {
    expect(s().dirty).toBe(false)
    s().addLayer(createTextLayer())
    expect(s().dirty).toBe(true)
  })
})

describe('autosave', () => {
  it('saves to localStorage 1s after change, not before', () => {
    s().addLayer(createTextLayer())
    vi.advanceTimersByTime(999)
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    vi.advanceTimersByTime(1)
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(saved.version).toBe(1)
    expect(saved.design.front.layers.length).toBe(3)
    expect(Object.keys(saved).sort()).toEqual(['design', 'version'])
  })

  it('debounces: repeated changes restart the timer', () => {
    s().addLayer(createTextLayer())
    vi.advanceTimersByTime(600)
    s().addLayer(createTextLayer())
    vi.advanceTimersByTime(600)
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    vi.advanceTimersByTime(400)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).design.front.layers.length).toBe(4)
  })

  it('saveState is pending after a change and saved after the write', () => {
    expect(s().saveState).toBe('saved')
    s().addLayer(createTextLayer())
    expect(s().saveState).toBe('pending')
    vi.advanceTimersByTime(1000)
    expect(s().saveState).toBe('saved')
  })

  it('flushSave writes immediately and settles saveState', () => {
    s().addLayer(createTextLayer())
    flushSave()
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull()
    expect(s().saveState).toBe('saved')
  })

  it('pagehide with no pending edits leaves storage untouched', () => {
    localStorage.setItem(STORAGE_KEY, 'from-another-tab')
    window.dispatchEvent(new Event('pagehide'))
    expect(localStorage.getItem(STORAGE_KEY)).toBe('from-another-tab')
  })

  it('saveState stays pending when the write fails', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    s().addLayer(createTextLayer())
    vi.advanceTimersByTime(1000)
    expect(s().saveState).toBe('pending')
    expect(warn).toHaveBeenCalled()
    setItem.mockRestore()
    window.dispatchEvent(new Event('pagehide')) // retries because still pending
    expect(s().saveState).toBe('saved')
    warn.mockRestore()
  })

  it('visibilitychange to hidden flushes a pending save', () => {
    s().addLayer(createTextLayer())
    const vis = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    document.dispatchEvent(new Event('visibilitychange'))
    vis.mockRestore()
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull()
    expect(s().saveState).toBe('saved')
  })

  it('visibilitychange to visible does not write', () => {
    s().addLayer(createTextLayer())
    const vis = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    document.dispatchEvent(new Event('visibilitychange'))
    vis.mockRestore()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('pagehide flushes the save', () => {
    s().addLayer(createTextLayer())
    window.dispatchEvent(new Event('pagehide'))
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull()
  })
})

describe('initial load', () => {
  async function freshStore() {
    vi.resetModules()
    return await import('./store')
  }

  it('falls back to default preset when storage is corrupt or wrong version', async () => {
    localStorage.setItem(STORAGE_KEY, '{oops')
    let mod = await freshStore()
    expect(mod.useEditorStore.getState().design.presetId).toBe('photocard-basic')

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 9, design: {} }))
    mod = await freshStore()
    expect(mod.useEditorStore.getState().design.presetId).toBe('photocard-basic')

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, design: { version: 1 } }))
    mod = await freshStore()
    expect(mod.useEditorStore.getState().design.presetId).toBe('photocard-basic')
  })

  it('restores a valid saved design on load', async () => {
    const saved = loadPresetDesign('polaroid-basic')
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, design: saved }))
    const mod = await freshStore()
    const st = mod.useEditorStore.getState()
    expect(st.design).toEqual(saved)
    expect(st.past).toEqual([])
    expect(st.dirty).toBe(false)
    expect(st.saveState).toBe('saved')
  })

  it('restored design that differs from its preset starts dirty (preset switch must confirm)', async () => {
    const saved = loadPresetDesign('photocard-basic')
    const text = saved.front.layers.find((l) => l.type === 'text')!
    if (text.type === 'text') text.props.text = 'Jennie'
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, design: saved }))
    const st = (await freshStore()).useEditorStore.getState()
    expect(st.dirty).toBe(true)
    expect(st.saveState).toBe('saved')
  })

  it('restored design equal to a fresh preset copy (different layer ids, key order) is not dirty', async () => {
    const saved = loadPresetDesign('polaroid-basic')
    // id mới và thứ tự key khác vẫn coi là chưa chỉnh
    const reordered = { ...saved, front: { layers: saved.front.layers.map((l) => ({ ...l, id: 'x-' + l.id })), background: saved.front.background } }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, design: reordered }))
    expect((await freshStore()).useEditorStore.getState().dirty).toBe(false)
  })

  it('restored design with an unknown presetId starts dirty', async () => {
    const saved = { ...loadPresetDesign('polaroid-basic'), presetId: 'gone' }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, design: saved }))
    expect((await freshStore()).useEditorStore.getState().dirty).toBe(true)
  })
})
