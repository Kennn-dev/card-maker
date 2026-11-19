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
