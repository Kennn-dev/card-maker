import { ImageUp, Upload } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Props = {
  /** Mở hộp chọn file (input ẩn nằm ở EditorPage). */
  onPick(): void
  onFiles(files: FileList): void
}

export function ImageDrawer({ onPick, onFiles }: Props) {
  const [over, setOver] = useState(false)
  return (
    <div className="flex flex-col gap-3">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          if (e.dataTransfer.files.length > 0) onFiles(e.dataTransfer.files)
        }}
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-md border border-dashed px-3 py-6 text-center text-xs text-[#666666] transition-colors',
          over ? 'border-[#171717] bg-[#F2F2F2]' : 'border-[#D4D4D4]',
        )}
      >
        <ImageUp className="size-5" aria-hidden />
        Kéo thả ảnh vào đây
      </div>
      <Button type="button" variant="outline" onClick={onPick}>
        <Upload />
        Tải ảnh lên
      </Button>
      <p className="text-xs text-[#666666]">Nếu đang chọn một ô ảnh trống, ảnh sẽ vào ô đó.</p>
    </div>
  )
}
