import { createStore, del, get, keys, set } from 'idb-keyval'
import type { CardDesign } from '@/model/card'

const store = createStore('icm-assets', 'assets')
const urlCache = new Map<string, string>()
const inflight = new Map<string, Promise<string | undefined>>()

export async function putImage(blob: Blob): Promise<string> {
  const id = crypto.randomUUID()
  await set(id, blob, store)
  return id
}

export function getImageUrl(assetId: string): Promise<string | undefined> {
  const cached = urlCache.get(assetId)
  if (cached) return Promise.resolve(cached)
  const pending = inflight.get(assetId)
  if (pending) return pending
  let p!: Promise<string | undefined>
  p = (async () => {
    const blob = await get<Blob>(assetId, store)
    // pruneAssets dropped this entry while we were reading: the asset is gone, don't re-cache.
    if (!blob || inflight.get(assetId) !== p) return undefined
    const url = URL.createObjectURL(blob)
    urlCache.set(assetId, url)
    return url
  })().finally(() => {
    if (inflight.get(assetId) === p) inflight.delete(assetId)
  })
  inflight.set(assetId, p)
  return p
}

export async function pruneAssets(keep: Set<string>): Promise<number> {
  const all = await keys<string>(store)
  let removed = 0
  for (const id of all) {
    if (keep.has(id)) continue
    inflight.delete(id)
    await del(id, store)
    inflight.delete(id)
    const url = urlCache.get(id)
    if (url) {
      URL.revokeObjectURL(url)
      urlCache.delete(id)
    }
    removed++
  }
  return removed
}

export function usedAssetIds(design: CardDesign): Set<string> {
  const ids = new Set<string>()
  for (const side of [design.front, design.back]) {
    for (const l of side.layers) {
      if (l.type === 'image' && l.props.assetId) ids.add(l.props.assetId)
    }
  }
  return ids
}
