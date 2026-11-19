import type Konva from 'konva'
import { Group, Rect, Shape } from 'react-konva'
import { CARD, SAFE_MM } from '@/model/card'

export const GUIDE_COLORS = { trim: 'rgba(0,0,0,0.18)', bleed: '#EF4444', safe: '#A1A1A1' } as const
const BLEED_FADE = 'rgba(242,242,242,0.55)' // phần bleed (sẽ bị cắt) nhạt đi theo màu mặt bàn
const SHADOW = { color: 'rgba(0,0,0,0.16)', blur: 18, offsetY: 4 } as const

function roundRectPath(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.moveTo(x + r, y)
  c.arcTo(x + w, y, x + w, y + h, r)
  c.arcTo(x + w, y + h, x, y + h, r)
  c.arcTo(x, y + h, x, y, r)
  c.arcTo(x, y, x + w, y, r)
  c.closePath()
}

/**
 * Vẽ phía trên nội dung nhưng chỉ ở ngoài vùng thành phẩm: làm nhạt vùng bleed và đổ bóng
 * của tấm thẻ, để thẻ (vùng thành phẩm) là vật thể nổi trên mặt bàn kể cả khi ảnh tràn bleed.
 */
function CardLift({ s }: { s: number }) {
  const b = CARD.bleed * s
  const w = CARD.w * s
  const h = CARD.h * s
  const r = CARD.radius * s
  const pad = SHADOW.blur * 3
  return (
    <Shape
      sceneFunc={(ctx: Konva.Context) => {
        const c = ctx._context
        const ratio = ctx.getCanvas().getPixelRatio()
        c.save()
        c.beginPath()
        c.rect(-b - pad, -b - pad, w + 2 * (b + pad), h + 2 * (b + pad))
        roundRectPath(c, 0, 0, w, h, r)
        c.clip('evenodd')
        c.fillStyle = BLEED_FADE
        c.fillRect(-b, -b, w + 2 * b, h + 2 * b)
        c.shadowColor = SHADOW.color
        c.shadowBlur = SHADOW.blur * ratio
        c.shadowOffsetY = SHADOW.offsetY * ratio
        c.fillStyle = '#000000'
        c.beginPath()
        roundRectPath(c, 0, 0, w, h, r)
        c.fill()
        c.restore()
      }}
    />
  )
}

type Props = { originX: number; originY: number; s: number }

/** Viền thành phẩm, viền bleed, safe zone — chỉ để nhìn, không bắt sự kiện, không xuất file. */
export function Guides({ originX, originY, s }: Props) {
  const b = CARD.bleed
  return (
    <Group x={originX} y={originY} listening={false}>
      <CardLift s={s} />
      <Rect
        x={-b * s}
        y={-b * s}
        width={(CARD.w + 2 * b) * s}
        height={(CARD.h + 2 * b) * s}
        stroke={GUIDE_COLORS.bleed}
        strokeWidth={1}
      />
      <Rect
        width={CARD.w * s}
        height={CARD.h * s}
        cornerRadius={CARD.radius * s}
        stroke={GUIDE_COLORS.trim}
        strokeWidth={1}
      />
      <Rect
        x={SAFE_MM * s}
        y={SAFE_MM * s}
        width={(CARD.w - 2 * SAFE_MM) * s}
        height={(CARD.h - 2 * SAFE_MM) * s}
        stroke={GUIDE_COLORS.safe}
        strokeWidth={1}
        dash={[4, 4]}
      />
    </Group>
  )
}
