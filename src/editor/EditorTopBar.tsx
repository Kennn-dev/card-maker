import { Redo2, Undo2 } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { useEditorStore } from './store'

export function EditorTopBar() {
  const canUndo = useEditorStore((s) => s.past.length > 0)
  const canRedo = useEditorStore((s) => s.future.length > 0)
  const saveState = useEditorStore((s) => s.saveState)
  const undo = useEditorStore((s) => s.undo)
  const redo = useEditorStore((s) => s.redo)

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-[#EAEAEA] bg-white px-3 md:px-4">
      <Link to="/" className="text-sm font-semibold tracking-tight whitespace-nowrap text-[#171717]">
        Idol Card Maker
      </Link>
      <div className="h-5 w-px bg-[#EAEAEA]" aria-hidden />
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Hoàn tác"
          title="Hoàn tác (Ctrl+Z)"
          disabled={!canUndo}
          onClick={undo}
          className="text-[#666666]"
        >
          <Undo2 />
          <span className="hidden lg:inline">Hoàn tác</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Làm lại"
          title="Làm lại (Ctrl+Shift+Z)"
          disabled={!canRedo}
          onClick={redo}
          className="text-[#666666]"
        >
          <Redo2 />
          <span className="hidden lg:inline">Làm lại</span>
        </Button>
      </div>
      <span role="status" aria-live="polite" className="ml-auto text-xs whitespace-nowrap text-[#666666]">
        {saveState === 'pending' ? 'Đang lưu…' : 'Đã lưu'}
      </span>
    </header>
  )
}
