import { CARD } from '@/model/card'

const MM_PER_PT = 25.4 / 72

export function ptToMm(pt: number): number {
  return pt * MM_PER_PT
}

/** Làm tròn về 0.1 (dùng cho mm và độ xoay khi ghi vào store). */
export function roundMm(v: number): number {
  return Math.round(v * 10) / 10 + 0 // + 0 để -0 thành 0
}

export type Crop = { x: number; y: number; width: number; height: number }

/** Vùng cắt của ảnh (px ảnh) để phủ kín khung boxW×boxH kiểu "cover", căn giữa. */
export function coverCrop(imgW: number, imgH: number, boxW: number, boxH: number): Crop {
  const scale = Math.max(boxW / imgW, boxH / imgH)
  const width = Math.min(imgW, boxW / scale)
  const height = Math.min(imgH, boxH / scale)
  return { x: (imgW - width) / 2, y: (imgH - height) / 2, width, height }
}

/** Phần tối thiểu (mm) của hộp layer phải còn nằm trong vùng bleed để vẫn bấm chọn được. */
export const MIN_VISIBLE_MM = 2

/**
 * Vị trí (mm) gần nhất để hộp bao `box` còn ít nhất `MIN_VISIBLE_MM` mỗi chiều
 * nằm trong vùng bleed (61×91 mm từ -3,-3).
 */
export function clampToBleed(box: { x: number; y: number; w: number; h: number }): { x: number; y: number } {
  const b = CARD.bleed
  const clamp = (pos: number, size: number, cardSize: number) =>
    Math.min(Math.max(pos, -b + MIN_VISIBLE_MM - size), cardSize + b - MIN_VISIBLE_MM)
  return { x: clamp(box.x, box.w, CARD.w), y: clamp(box.y, box.h, CARD.h) }
}
