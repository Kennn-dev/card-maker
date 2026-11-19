import { Image as ImageIcon, LayoutTemplate, Type, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type DrawerId = 'preset' | 'text' | 'image'

export const DRAWERS: { id: DrawerId; label: string; icon: LucideIcon }[] = [
  { id: 'preset', label: 'Mẫu', icon: LayoutTemplate },
  { id: 'text', label: 'Chữ', icon: Type },
  { id: 'image', label: 'Ảnh', icon: ImageIcon },
]

type Props = {
  active: DrawerId | null
  onToggle(id: DrawerId): void
  /** `rail`: cột trái 64px (desktop); `tabbar`: thanh đáy (mobile). */
  variant: 'rail' | 'tabbar'
  className?: string
}

export function EditorRail({ active, onToggle, variant, className }: Props) {
  const isRail = variant === 'rail'
  return (
    <nav
      aria-label="Công cụ"
      className={cn(
        'shrink-0 border-[#EAEAEA] bg-white',
        isRail ? 'w-16 flex-col gap-1 border-r py-2' : 'h-14 flex-row border-t',
        className,
      )}
    >
      {DRAWERS.map(({ id, label, icon: Icon }) => {
        const pressed = active === id
        return (
          <button
            key={id}
            type="button"
            aria-pressed={pressed}
            onClick={() => onToggle(id)}
            className={cn(
              'flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
              isRail ? 'mx-2 h-14 rounded-md' : 'h-full flex-1',
              pressed ? 'text-[#171717]' : 'text-[#666666] hover:text-[#171717]',
              isRail && pressed && 'bg-[#F2F2F2]',
            )}
          >
            <Icon className="size-5" aria-hidden />
            {label}
          </button>
        )
      })}
    </nav>
  )
}
