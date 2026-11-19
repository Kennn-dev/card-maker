import type { CardDesign } from './card'

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null

function isLayer(v: unknown): boolean {
  if (!isObj(v)) return false
  if (v.type !== 'text' && v.type !== 'image') return false
  if (typeof v.id !== 'string') return false
  if (!['x', 'y', 'w', 'h', 'rotation'].every((k) => isNum(v[k]))) return false
  if (!isObj(v.props)) return false
  return v.type !== 'text' || typeof v.props.text === 'string'
}

function isSide(v: unknown): boolean {
  return (
    isObj(v) &&
    isObj(v.background) &&
    typeof v.background.color === 'string' &&
    Array.isArray(v.layers) && v.layers.every(isLayer)
  )
}

export function isCardDesign(x: unknown): x is CardDesign {
  return isObj(x) && x.version === 1 && typeof x.presetId === 'string' && isSide(x.front) && isSide(x.back)
}
