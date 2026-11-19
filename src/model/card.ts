export const CARD = { w: 55, h: 85, bleed: 3, radius: 3 } as const
export const SAFE_MM = 3

export type SideName = 'front' | 'back'

export type TextProps = {
  text: string
  font: string
  size: number // pt
  color: string
  align: 'left' | 'center' | 'right'
}

export type ImageProps = { assetId?: string } // không có assetId = ô giữ chỗ "Thêm ảnh"

type Base = {
  id: string
  x: number
  y: number
  w: number
  h: number
  rotation: number
  locked?: boolean
  hidden?: boolean
}

export type TextLayer = Base & { type: 'text'; props: TextProps }
export type ImageLayer = Base & { type: 'image'; props: ImageProps }
export type Layer = TextLayer | ImageLayer

export type Side = { background: { color: string }; layers: Layer[] }

export type CardDesign = {
  version: 1
  presetId: string
  size: typeof CARD
  finish: 'glossy'
  front: Side
  back: Side
}
