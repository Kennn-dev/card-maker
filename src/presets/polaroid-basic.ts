import { CARD } from '@/model/card'
import { createImageLayer, createTextLayer } from '@/model/factory'
import type { CardDesign } from '@/model/card'

export const polaroidBasic: CardDesign = {
  version: 1,
  presetId: 'polaroid-basic',
  size: CARD,
  finish: 'glossy',
  front: {
    background: { color: '#ffffff' },
    layers: [
      createImageLayer({ x: 5, y: 5, w: 45, h: 55 }),
      createTextLayer({
        x: 7.5,
        y: 66,
        w: 40,
        h: 10,
        props: { text: 'Chú thích', font: 'Geist', size: 12, color: '#111111', align: 'center' },
      }),
    ],
  },
  back: { background: { color: '#ffffff' }, layers: [] },
}
