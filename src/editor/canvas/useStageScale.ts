import { useLayoutEffect, useState, type RefObject } from 'react'
import { CARD } from '@/model/card'

const MARGIN_PX = 16
const BLEED_W = CARD.w + 2 * CARD.bleed // 61 mm
const BLEED_H = CARD.h + 2 * CARD.bleed // 91 mm

/** Số px cho 1 mm để vùng thẻ kèm bleed (61×91 mm) vừa khít container, chừa lề 16 px mỗi phía. */
export function pxPerMm(containerW: number, containerH: number): number {
  const s = Math.min((containerW - 2 * MARGIN_PX) / BLEED_W, (containerH - 2 * MARGIN_PX) / BLEED_H)
  return s > 0 ? s : 0
}

/** Theo dõi kích thước phần tử (ResizeObserver) và trả về tỉ lệ px/mm tương ứng. */
export function useStageScale(ref: RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ width: 0, height: 0 })

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => {
      const width = el.clientWidth
      const height = el.clientHeight
      setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])

  return { ...size, scale: pxPerMm(size.width, size.height) }
}
