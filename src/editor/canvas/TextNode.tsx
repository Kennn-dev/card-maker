import { Text } from 'react-konva'
import type { TextLayer } from '@/model/card'
import { ptToMm } from './geometry'
import { LAYER_NODE_NAME, type LayerNodeEvents } from './nodeProps'

type Props = LayerNodeEvents & { layer: TextLayer; s: number }

export function TextNode({ layer, s, ...events }: Props) {
  const { props } = layer
  return (
    <Text
      id={layer.id}
      name={LAYER_NODE_NAME}
      x={layer.x * s}
      y={layer.y * s}
      width={layer.w * s}
      height={layer.h * s}
      rotation={layer.rotation}
      text={props.text}
      fontFamily={props.font}
      fontSize={ptToMm(props.size) * s}
      fill={props.color}
      align={props.align}
      verticalAlign="middle"
      wrap="word"
      {...events}
    />
  )
}
