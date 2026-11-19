import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import { PRESETS } from '@/presets'
import { useEditorStore } from '../store'

type Props = { onApplied?(): void }

export function PresetDrawer({ onApplied }: Props) {
  const presetId = useEditorStore((s) => s.design.presetId)
  const loadPreset = useEditorStore((s) => s.loadPreset)
  const [pending, setPending] = useState<string | null>(null)

  const apply = (id: string) => {
    loadPreset(id)
    onApplied?.()
  }

  const choose = (id: string) => {
    if (useEditorStore.getState().dirty) setPending(id)
    else apply(id)
  }

  return (
    <div className="flex flex-col gap-2">
      {PRESETS.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => choose(p.id)}
          aria-current={p.id === presetId ? 'true' : undefined}
          className={cn(
            'rounded-md border px-3 py-2.5 text-left text-sm transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
            p.id === presetId
              ? 'border-[#171717] text-[#171717]'
              : 'border-[#EAEAEA] text-[#171717] hover:border-[#C9C9C9]',
          )}
        >
          {p.name}
        </button>
      ))}

      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Đổi mẫu?</AlertDialogTitle>
            <AlertDialogDescription>
              Thiết kế hiện tại sẽ bị thay thế. Bạn vẫn có thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pending) apply(pending)
                setPending(null)
              }}
            >
              Đổi mẫu
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
