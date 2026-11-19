import { AlignCenter, AlignLeft, AlignRight, ImageUp, Trash2, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { TextLayer, TextProps } from '@/model/card'
import { cn } from '@/lib/utils'
import { fitTextHeight } from './canvas/measureText'
import { useEditorStore } from './store'

export const FONT_SIZE = { min: 6, max: 72 } as const

const ALIGNS: { value: TextProps['align']; label: string; icon: LucideIcon }[] = [
  { value: 'left', label: 'Căn trái', icon: AlignLeft },
  { value: 'center', label: 'Căn giữa', icon: AlignCenter },
  { value: 'right', label: 'Căn phải', icon: AlignRight },
]

type Props = {
  /** id layer chữ vừa thêm: focus ô "Nội dung" một lần rồi gọi `onFocused`. */
  focusTextId: string | null
  onFocused(): void
  onReplaceImage(layerId: string): void
}

/** Thanh thuộc tính ngay trên thẻ, chỉ hiện khi có layer được chọn. */
export function ContextToolbar({ focusTextId, onFocused, onReplaceImage }: Props) {
  const layer = useEditorStore((s) =>
    s.selectedId === null ? undefined : s.design[s.side].layers.find((l) => l.id === s.selectedId),
  )
  const removeLayer = useEditorStore((s) => s.removeLayer)
  if (!layer) return null

  return (
    <div
      role="toolbar"
      aria-label="Thuộc tính lớp"
      className="flex max-w-full items-center gap-1 overflow-x-auto rounded-lg border border-[#EAEAEA] bg-white p-1.5 md:gap-2"
    >
      {layer.type === 'text' ? (
        <TextControls key={layer.id} layer={layer} focus={focusTextId === layer.id} onFocused={onFocused} />
      ) : (
        <Button type="button" variant="ghost" size="sm" onClick={() => onReplaceImage(layer.id)}>
          <ImageUp />
          {layer.props.assetId ? 'Thay ảnh' : 'Thêm ảnh'}
        </Button>
      )}
      <div className="h-5 w-px shrink-0 bg-[#EAEAEA]" aria-hidden />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label="Xóa lớp"
        title="Xóa lớp (Delete)"
        className="shrink-0 px-2 text-[#666666]"
        onClick={() => removeLayer(layer.id)}
      >
        <Trash2 />
        <span className="hidden md:inline">Xóa lớp</span>
      </Button>
    </div>
  )
}

function TextControls({
  layer,
  focus,
  onFocused,
}: {
  layer: TextLayer
  focus: boolean
  onFocused(): void
}) {
  const updateLayer = useEditorStore((s) => s.updateLayer)
  const textRef = useRef<HTMLInputElement>(null)
  // Bản nháp của ô cỡ chữ: cho phép gõ dở (rỗng, "1") mà không ghi giá trị ngoài 6–72.
  const [sizeDraft, setSizeDraft] = useState<string | null>(null)
  const id = layer.id
  const p = layer.props

  /** Đổi thuộc tính chữ và nới chiều cao hộp (cùng một bước undo) để không dòng nào bị cắt. */
  const updateText = (props: Partial<TextProps>, coalesce: string) => {
    const h = fitTextHeight({ w: layer.w, h: layer.h, props: { ...p, ...props } })
    updateLayer(id, h > layer.h ? { props, h } : { props }, { coalesce })
  }

  useEffect(() => {
    if (!focus) return
    textRef.current?.focus()
    textRef.current?.select()
    onFocused()
  }, [focus, onFocused])

  return (
    <>
      <Label htmlFor={`text-${id}`} className="sr-only">
        Nội dung
      </Label>
      <Input
        id={`text-${id}`}
        ref={textRef}
        value={p.text}
        onChange={(e) => updateText({ text: e.target.value }, `text:${id}`)}
        className="h-8 w-24 shrink-0 md:w-56"
      />

      <Label htmlFor={`size-${id}`} className="sr-only">
        Cỡ chữ (pt)
      </Label>
      <div className="flex shrink-0 items-center gap-1">
        <Input
          id={`size-${id}`}
          type="number"
          inputMode="decimal"
          min={FONT_SIZE.min}
          max={FONT_SIZE.max}
          step={1}
          value={sizeDraft ?? String(p.size)}
          onChange={(e) => {
            const raw = e.target.value
            setSizeDraft(raw)
            const n = Number(raw)
            if (raw !== '' && Number.isFinite(n) && n >= FONT_SIZE.min && n <= FONT_SIZE.max) {
              updateText({ size: n }, `size:${id}`)
            }
          }}
          onBlur={() => setSizeDraft(null)}
          className="h-8 w-14 md:w-16"
        />
        <span className="text-xs text-[#666666]" aria-hidden>
          pt
        </span>
      </div>

      <Label htmlFor={`color-${id}`} className="sr-only">
        Màu
      </Label>
      <input
        id={`color-${id}`}
        type="color"
        value={p.color}
        onChange={(e) => updateLayer(id, { props: { color: e.target.value } }, { coalesce: `color:${id}` })}
        className="size-8 shrink-0 cursor-pointer rounded-md border border-[#EAEAEA] bg-white p-1"
      />

      <div role="group" aria-label="Căn chữ" className="flex shrink-0 items-center">
        {ALIGNS.map(({ value, label, icon: Icon }) => (
          <Button
            key={value}
            type="button"
            variant="ghost"
            size="icon"
            aria-label={label}
            aria-pressed={p.align === value}
            title={label}
            onClick={() => updateLayer(id, { props: { align: value } })}
            className={cn('size-8', p.align === value ? 'bg-[#F2F2F2] text-[#171717]' : 'text-[#666666]')}
          >
            <Icon />
          </Button>
        ))}
      </div>
    </>
  )
}
