import { useEffect, useState } from 'react'
import { Group, Image as KImage, Rect, Text } from 'react-konva'
import type { ImageLayer } from '@/model/card'
import { getImageUrl } from '@/storage/assets'
import { coverCrop } from './geometry'
import { LAYER_NODE_NAME, type LayerNodeEvents } from './nodeProps'

export const PLACEHOLDER = { fill: '#E5E5E5', text: '#8F8F8F', label: 'Thêm ảnh' } as const

/** Tải ảnh của assetId từ IndexedDB; null khi chưa có, không tồn tại hoặc lỗi. */
function useAssetImage(assetId: string | undefined): HTMLImageElement | null {
  const [loaded, setLoaded] = useState<{ assetId: string; img: HTMLImageElement } | null>(null)

  useEffect(() => {
    if (!assetId) return
    let cancelled = false
    getImageUrl(assetId)
      .then((url) => {
        if (cancelled || !url) return
        const img = new window.Image()
        img.onload = () => {
          if (!cancelled) setLoaded({ assetId, img })
        }
        img.src = url
      })
      .catch(() => {
        // IndexedDB lỗi → giữ ô giữ chỗ
      })
    return () => {
      cancelled = true
    }
  }, [assetId])

  return loaded && loaded.assetId === assetId ? loaded.img : null
}

type Props = LayerNodeEvents & { layer: ImageLayer; s: number }

export function ImageNode({ layer, s, ...events }: Props) {
  const img = useAssetImage(layer.props.assetId)
  const w = layer.w * s
  const h = layer.h * s
  return (
    <Group
      id={layer.id}
      name={LAYER_NODE_NAME}
      x={layer.x * s}
      y={layer.y * s}
      rotation={layer.rotation}
      {...events}
    >
      {img ? (
        <KImage
          image={img}
          width={w}
          height={h}
          crop={coverCrop(img.naturalWidth, img.naturalHeight, w, h)}
        />
      ) : (
        <>
          <Rect width={w} height={h} fill={PLACEHOLDER.fill} />
          <Text
            width={w}
            height={h}
            text={PLACEHOLDER.label}
            fontFamily="Geist"
            fontSize={3.5 * s}
            fill={PLACEHOLDER.text}
            align="center"
            verticalAlign="middle"
          />
        </>
      )}
    </Group>
  )
}
