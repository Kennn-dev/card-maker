import type { CardDesign } from '@/model/card'
import { photocardBasic } from './photocard-basic'
import { polaroidBasic } from './polaroid-basic'

export type Preset = { id: string; name: string; design: CardDesign }

export const PRESETS: Preset[] = [
  { id: 'photocard-basic', name: 'Photocard cơ bản', design: photocardBasic },
  { id: 'polaroid-basic', name: 'Polaroid cơ bản', design: polaroidBasic },
]

function freshIds(design: CardDesign): CardDesign {
  const copy = structuredClone(design)
  for (const side of [copy.front, copy.back]) {
    for (const layer of side.layers) layer.id = crypto.randomUUID()
  }
  return copy
}

export function loadPresetDesign(id: string): CardDesign {
  const preset = PRESETS.find((p) => p.id === id) ?? PRESETS[0]
  return freshIds(preset.design)
}
