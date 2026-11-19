import { CARD } from '@/model/card'
import { createImageLayer, createTextLayer } from '@/model/factory'
import type { CardDesign } from '@/model/card'

export const photocardBasic: CardDesign = {
  version: 1,
  presetId: 'photocard-basic',
  size: CARD,
  finish: 'glossy',
  front: {
    background: { color: '#ffffff' },
    layers: [
      createImageLayer({ x: -3, y: -3, w: 61, h: 91 }),
      createTextLayer({
        x: 7.5,
        y: 70,
        w: 40,
        h: 10,
        props: { text: 'Tên idol', font: 'Geist', size: 16, color: '#171717', align: 'center' },
      }),
    ],
  },
  back: {
    background: { color: '#f5f5f5' },
    layers: [
      createTextLayer({
        props: { text: 'Idol Card Maker', font: 'Geist', size: 14, color: '#111111', align: 'center' },
      }),
    ],
  },
}
