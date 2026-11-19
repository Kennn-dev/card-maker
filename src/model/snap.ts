import { CARD, SAFE_MM } from './card'

type Box = { x: number; y: number; w: number; h: number }

// Chọn đích gần nhất trong ngưỡng; trả về độ dịch cần áp dụng, hoặc null.
function pickShift(candidates: { from: number; to: number }[], threshold: number): number | null {
  let best: number | null = null
  for (const { from, to } of candidates) {
    const d = to - from
    if (Math.abs(d) <= threshold && (best === null || Math.abs(d) < Math.abs(best))) best = d
  }
  return best
}

function snapAxis(pos: number, size: number, cardSize: number, threshold: number): number {
  const shift = pickShift(
    [
      { from: pos + size / 2, to: cardSize / 2 }, // tâm → tâm thẻ
      { from: pos, to: SAFE_MM }, // mép đầu → safe zone
      { from: pos + size, to: cardSize - SAFE_MM }, // mép cuối → safe zone
    ],
    threshold,
  )
  return shift === null ? pos : pos + shift
}

export function snapBox(box: Box, thresholdMm = 1.5): { x: number; y: number } {
  return {
    x: snapAxis(box.x, box.w, CARD.w, thresholdMm),
    y: snapAxis(box.y, box.h, CARD.h, thresholdMm),
  }
}
