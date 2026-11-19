import type Konva from 'konva'
import { useEffect, useRef, useState } from 'react'
import { Group, Layer as KLayer, Rect, Stage, Transformer } from 'react-konva'
import { CARD, type Layer } from '@/model/card'
import { snapBox } from '@/model/snap'
import { useEditorStore } from '@/editor/store'
import { roundMm } from './geometry'
import { Guides } from './Guides'
import { ImageNode } from './ImageNode'
import { LAYER_NODE_NAME, type LayerNodeEvents } from './nodeProps'
import { TextNode } from './TextNode'
import { useStageScale } from './useStageScale'

export const CANVAS_COLORS = { studio: '#F2F2F2', selection: '#0070F3' } as const
const MIN_SIZE_MM = 2
const ROTATION_SNAPS = [0, 90, 180, 270]

type Box = { id: string; x: number; y: number; w: number; h: number; rotation: number }

function useFontsEpoch(fonts: string[]): number {
  const [epoch, setEpoch] = useState(0)
  const key = [...new Set(fonts)].sort().join('|')
  useEffect(() => {
    if (typeof document === 'undefined' || !document.fonts) return
    const families = key.split('|').filter(Boolean)
    const specs = families.map((f) => `16px "${f}"`)
    if (specs.every((spec) => document.fonts.check(spec))) return
    let cancelled = false
    // Konva đo chữ lúc vẽ: font tải xong thì vẽ lại để không kẹt ở font dự phòng.
    Promise.allSettled(specs.map((spec) => document.fonts.load(spec))).then(() => {
      if (!cancelled) setEpoch((e) => e + 1)
    })
    return () => {
      cancelled = true
    }
  }, [key])
  return epoch
}

type CardCanvasProps = {
  /** Bấm lần nữa vào ô ảnh trống đang được chọn: EditorPage mở hộp chọn file cho ô đó. */
  onRequestImage?: (layerId: string) => void
}

/** Ngưỡng (px) để phân biệt bấm với kéo. */
const CLICK_SLOP_PX = 4

/** Canvas Konva của mặt thẻ đang chọn. Đọc và ghi qua `useEditorStore`. */
export function CardCanvas({ onRequestImage }: CardCanvasProps = {}) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<Konva.Group>(null)
  const trRef = useRef<Konva.Transformer>(null)
  const { width, height, scale: s } = useStageScale(wrapperRef)

  const side = useEditorStore((st) => st.design[st.side])
  const selectedId = useEditorStore((st) => st.selectedId)
  const select = useEditorStore((st) => st.select)
  const updateLayer = useEditorStore((st) => st.updateLayer)

  // Hộp đang biến đổi (mm), chỉ sống trong lúc kéo handle của Transformer.
  const [live, setLive] = useState<Box | null>(null)
  const liveRef = useRef<Box | null>(null)
  const setLiveBox = (b: Box | null) => {
    liveRef.current = b
    setLive(b)
  }

  const fontEpoch = useFontsEpoch([
    'Geist',
    ...side.layers.flatMap((l) => (l.type === 'text' ? [l.props.font] : [])),
  ])

  const visible = side.layers.filter((l) => !l.hidden)
  const selected = visible.find((l) => l.id === selectedId)

  // Card trim origin (px trong stage): khối 61×91 mm nằm giữa stage.
  const originX = (width - (CARD.w + 2 * CARD.bleed) * s) / 2 + CARD.bleed * s
  const originY = (height - (CARD.h + 2 * CARD.bleed) * s) / 2 + CARD.bleed * s

  useEffect(() => {
    const tr = trRef.current
    if (!tr) return
    const node = selected
      ? contentRef.current?.findOne((n: Konva.Node) => n.id() === selected.id)
      : undefined
    tr.nodes(node ? [node] : [])
    tr.getLayer()?.batchDraw()
  }, [selected, fontEpoch, s, width, height])

  const findLayer = (id: string): Layer | undefined => side.layers.find((l) => l.id === id)

  const commitNode = (node: Konva.Node, box: Omit<Box, 'id'>) => {
    const next = {
      x: roundMm(box.x),
      y: roundMm(box.y),
      w: roundMm(box.w),
      h: roundMm(box.h),
      rotation: roundMm(box.rotation),
    }
    updateLayer(node.id(), next)
    node.position({ x: next.x * s, y: next.y * s })
  }

  const events: Omit<LayerNodeEvents, 'draggable'> = {
    onDragMove(e) {
      const node = e.target
      const content = contentRef.current
      if (!content || s === 0) return
      // Hộp bao theo trục (đã tính xoay) trong hệ tọa độ thẻ, đổi px → mm để snap.
      const r = node.getClientRect({ relativeTo: content, skipShadow: true, skipStroke: true })
      const box = { x: r.x / s, y: r.y / s, w: r.width / s, h: r.height / s }
      const snapped = snapBox(box)
      node.position({
        x: node.x() + (snapped.x - box.x) * s,
        y: node.y() + (snapped.y - box.y) * s,
      })
    },
    onDragEnd(e) {
      const node = e.target
      const layer = findLayer(node.id())
      if (!layer || s === 0) return
      commitNode(node, { x: node.x() / s, y: node.y() / s, w: layer.w, h: layer.h, rotation: node.rotation() })
    },
    onTransform(e) {
      const node = e.target
      const layer = findLayer(node.id())
      if (!layer || s === 0) return
      const cur = liveRef.current?.id === layer.id ? liveRef.current : layer
      const w = cur.w * node.scaleX()
      const h = cur.h * node.scaleY()
      // Đổi kích thước hộp thay vì phóng to nội dung (chữ giữ cỡ, ảnh cắt lại kiểu cover).
      node.scale({ x: 1, y: 1 })
      if (layer.type === 'text') node.size({ width: w * s, height: h * s })
      setLiveBox({ id: layer.id, x: node.x() / s, y: node.y() / s, w, h, rotation: node.rotation() })
    },
    onTransformEnd(e) {
      const node = e.target
      const layer = findLayer(node.id())
      if (!layer || s === 0) return
      const cur = liveRef.current?.id === layer.id ? liveRef.current : layer
      setLiveBox(null)
      commitNode(node, { x: node.x() / s, y: node.y() / s, w: cur.w, h: cur.h, rotation: node.rotation() })
    },
  }

  // Lần bấm hiện tại bắt đầu trên layer nào, layer đó đã được chọn từ trước chưa.
  const pressRef = useRef<{ id: string; wasSelected: boolean; x: number; y: number } | null>(null)

  const onStagePointerDown = (e: Konva.KonvaEventObject<PointerEvent>) => {
    const target = e.target
    pressRef.current = null
    if (target.findAncestor('Transformer', true)) return // đang bấm handle
    const layerNode = target.findAncestor(`.${LAYER_NODE_NAME}`, true)
    if (layerNode) {
      pressRef.current = {
        id: layerNode.id(),
        wasSelected: layerNode.id() === selectedId,
        x: e.evt.clientX,
        y: e.evt.clientY,
      }
    }
    select(layerNode ? layerNode.id() : null)
  }

  // Mở hộp chọn file ở pointerup/click (có user activation trên cả chuột lẫn cảm ứng).
  const onStagePointerClick = (e: Konva.KonvaEventObject<PointerEvent>) => {
    const press = pressRef.current
    pressRef.current = null
    if (!onRequestImage || !press?.wasSelected) return
    if (Math.hypot(e.evt.clientX - press.x, e.evt.clientY - press.y) > CLICK_SLOP_PX) return
    const layer = findLayer(press.id)
    if (layer?.type === 'image' && !layer.props.assetId) onRequestImage(layer.id)
  }

  const renderLayer = (stored: Layer) => {
    const layer = live?.id === stored.id ? { ...stored, ...live } : stored
    const nodeEvents: LayerNodeEvents = { ...events, draggable: !layer.locked }
    return layer.type === 'text' ? (
      <TextNode key={layer.id} layer={layer} s={s} {...nodeEvents} />
    ) : (
      <ImageNode key={layer.id} layer={layer} s={s} {...nodeEvents} />
    )
  }

  const b = CARD.bleed
  return (
    <div
      ref={wrapperRef}
      data-testid="card-canvas"
      data-px-per-mm={s}
      className="relative h-full w-full overflow-hidden"
      style={{ background: CANVAS_COLORS.studio }}
    >
      {s > 0 && (
        <Stage
          width={width}
          height={height}
          onPointerDown={onStagePointerDown}
          onPointerClick={onStagePointerClick}
        >
          <KLayer>
            <Group
              key={fontEpoch}
              ref={contentRef}
              x={originX}
              y={originY}
              clipX={-b * s}
              clipY={-b * s}
              clipWidth={(CARD.w + 2 * b) * s}
              clipHeight={(CARD.h + 2 * b) * s}
            >
              <Rect
                name="card-bg"
                x={-b * s}
                y={-b * s}
                width={(CARD.w + 2 * b) * s}
                height={(CARD.h + 2 * b) * s}
                fill={side.background.color}
              />
              {visible.map(renderLayer)}
            </Group>
            <Guides originX={originX} originY={originY} s={s} />
            <Transformer
              ref={trRef}
              rotationSnaps={ROTATION_SNAPS}
              flipEnabled={false}
              resizeEnabled={!selected?.locked}
              rotateEnabled={!selected?.locked}
              borderStroke={CANVAS_COLORS.selection}
              anchorStroke={CANVAS_COLORS.selection}
              anchorFill="#FFFFFF"
              anchorSize={9}
              anchorCornerRadius={2}
              boundBoxFunc={(oldBox, newBox) =>
                Math.abs(newBox.width) < MIN_SIZE_MM * s || Math.abs(newBox.height) < MIN_SIZE_MM * s
                  ? oldBox
                  : newBox
              }
            />
          </KLayer>
        </Stage>
      )}
    </div>
  )
}
