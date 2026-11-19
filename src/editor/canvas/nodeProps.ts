import type Konva from 'konva'

/** Thuộc tính sự kiện chung CardCanvas truyền cho mọi node layer. */
export type LayerNodeEvents = {
  draggable: boolean
  onDragMove(e: Konva.KonvaEventObject<DragEvent>): void
  onDragEnd(e: Konva.KonvaEventObject<DragEvent>): void
  onTransform(e: Konva.KonvaEventObject<Event>): void
  onTransformEnd(e: Konva.KonvaEventObject<Event>): void
}

/** Tên Konva gắn cho node gốc của mỗi layer (dùng để tìm layer từ đích click). */
export const LAYER_NODE_NAME = 'layer'
