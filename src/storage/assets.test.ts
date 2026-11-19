import { clear, createStore } from 'idb-keyval'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadPresetDesign } from '@/presets'
import type { CardDesign, ImageLayer } from '@/model/card'
import { getImageUrl, pruneAssets, putImage, usedAssetIds } from './assets'

const img = (id: string, assetId?: string): ImageLayer => ({
  id,
  type: 'image',
  x: 0,
  y: 0,
  w: 10,
  h: 10,
  rotation: 0,
  props: { assetId },
})

let revoked: string[]

beforeEach(async () => {
  await clear(createStore('icm-assets', 'assets'))
  revoked = []
  let n = 0
  URL.createObjectURL = () => `blob:test/${n++}`
  URL.revokeObjectURL = (u: string) => {
    revoked.push(u)
  }
})

afterEach(() => {
  // @ts-expect-error remove stubs (jsdom lacks these)
  delete URL.createObjectURL
  // @ts-expect-error remove stubs
  delete URL.revokeObjectURL
  vi.unstubAllGlobals()
})

describe('assets', () => {
  it('put/get round trip and missing id returns undefined', async () => {
    const id = await putImage(new Blob(['x'], { type: 'image/webp' }))
    const url = await getImageUrl(id)
    expect(url).toMatch(/^blob:/)
    expect(await getImageUrl(id)).toBe(url) // cached
    expect(await getImageUrl('missing')).toBeUndefined()
  })

  it('pruneAssets removes only unused and revokes their urls', async () => {
    const a = await putImage(new Blob(['a']))
    const b = await putImage(new Blob(['b']))
    const urlA = await getImageUrl(a)
    const urlB = await getImageUrl(b)
    expect(await pruneAssets(new Set([b]))).toBe(1)
    expect(await getImageUrl(a)).toBeUndefined()
    expect(await getImageUrl(b)).toBe(urlB)
    expect(revoked).toEqual([urlA])
  })

  it('concurrent getImageUrl calls share one object URL', async () => {
    const id = await putImage(new Blob(['x']))
    let created = 0
    let n = 0
    URL.createObjectURL = () => {
      created++
      return `blob:conc/${n++}`
    }
    const [u1, u2] = await Promise.all([getImageUrl(id), getImageUrl(id)])
    expect(u1).toBe(u2)
    expect(created).toBe(1)
  })

  it('getImageUrl in flight during pruneAssets does not re-cache a deleted asset', async () => {
    const id = await putImage(new Blob(['x']))
    const inFlight = getImageUrl(id)
    await pruneAssets(new Set())
    const url = await inFlight
    // Either the read lost the race (no URL) or its URL was created before the prune and revoked by it.
    if (url) expect(revoked).toContain(url)
    expect(await getImageUrl(id)).toBeUndefined()
  })

  it('usedAssetIds collects ids from both sides', () => {
    const d: CardDesign = structuredClone(loadPresetDesign('photocard-basic'))
    d.front.layers.push(img('1', 'a'), img('2'))
    d.back.layers.push(img('3', 'b'))
    expect(usedAssetIds(d)).toEqual(new Set(['a', 'b']))
  })
})
