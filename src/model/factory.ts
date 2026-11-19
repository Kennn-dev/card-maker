import { CARD, type ImageLayer, type TextLayer } from './card'

function centered(w: number, h: number) {
  return { x: (CARD.w - w) / 2, y: (CARD.h - h) / 2, w, h }
}

export function createTextLayer(partial: Partial<TextLayer> = {}): TextLayer {
  const { props, ...rest } = partial
  return {
    id: crypto.randomUUID(),
    type: 'text',
    ...centered(40, 10),
    rotation: 0,
    ...rest,
    props: { text: 'Nhập chữ', font: 'Geist', size: 14, color: '#111111', align: 'center', ...props },
  }
}

export function createImageLayer(partial: Partial<ImageLayer> = {}): ImageLayer {
  const { props, ...rest } = partial
  return {
    id: crypto.randomUUID(),
    type: 'image',
    ...centered(40, 50),
    rotation: 0,
    ...rest,
    props: { ...props },
  }
}
