import { createStore, del, get, keys, set } from 'idb-keyval'
import type { CardDesign } from '@/model/card'

const store = createStore('icm-assets', 'assets')
const urlCache = new Map<string, string>()

export async function putImage(blob: Blob): Promise<string> {
  const id = crypto.randomUUID()
  await set(id, blob, store)
  return id
}

export async function getImageUrl(assetId: string): Promise<string | undefined> {
  const cached = urlCache.get(assetId)
  if (cached) return cached
  const blob = await get<Blob>(assetId, store)
  if (!blob) return undefined
  const url = URL.createObjectURL(blob)
  urlCache.set(assetId, url)
  return url
}

export async function pruneAssets(keep: Set<string>): Promise<number> {
  const all = await keys<string>(store)
  let removed = 0
  for (const id of all) {
    if (keep.has(id)) continue
    await del(id, store)
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
