import Konva from 'konva'
import type { TextLayer } from '@/model/card'
import { ptToMm } from './geometry'

/** Đo ở 10 px/mm cho đủ mịn; kết quả đổi lại về mm. */
const PX_PER_MM = 10

let probe: Konva.Text | null = null

/**
 * Chiều cao (mm) cần để hiện hết chữ của layer: cùng bề rộng, font, cỡ, kiểu xuống dòng
 * như TextNode nhưng không giới hạn chiều cao (Konva bỏ các dòng vượt `height`).
 */
export function measureTextHeightMm(layer: Pick<TextLayer, 'w' | 'props'>): number {
  probe ??= new Konva.Text({ wrap: 'word' })
  probe.setAttrs({
    text: layer.props.text,
    fontFamily: layer.props.font,
    fontSize: ptToMm(layer.props.size) * PX_PER_MM,
    align: layer.props.align,
    width: layer.w * PX_PER_MM,
  })
  return probe.height() / PX_PER_MM
}

/** Chiều cao mới (mm, làm tròn lên 0.1) đủ chứa chữ; không bao giờ nhỏ hơn `h` hiện tại. */
export function fitTextHeight(layer: Pick<TextLayer, 'w' | 'h' | 'props'>): number {
  const needed = Math.ceil(measureTextHeightMm(layer) * 10 - 1e-6) / 10
  return Math.max(layer.h, needed)
}
