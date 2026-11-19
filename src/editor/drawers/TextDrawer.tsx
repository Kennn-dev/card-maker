import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createTextLayer } from '@/model/factory'
import { useEditorStore } from '../store'

type Props = { onAdded(layerId: string): void }

export function TextDrawer({ onAdded }: Props) {
  const addLayer = useEditorStore((s) => s.addLayer)
  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="outline"
        className="justify-start"
        onClick={() => {
          const layer = createTextLayer()
          addLayer(layer)
          onAdded(layer.id)
        }}
      >
        <Plus />
        Thêm chữ
      </Button>
    </div>
  )
}
