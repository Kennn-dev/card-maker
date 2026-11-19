import { X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CardCanvas } from '@/editor/canvas/CardCanvas'
import { ContextToolbar } from '@/editor/ContextToolbar'
import { ImageDrawer } from '@/editor/drawers/ImageDrawer'
import { PresetDrawer } from '@/editor/drawers/PresetDrawer'
import { TextDrawer } from '@/editor/drawers/TextDrawer'
import { DRAWERS, EditorRail, type DrawerId } from '@/editor/EditorRail'
import { EditorTopBar } from '@/editor/EditorTopBar'
import { useEditorStore } from '@/editor/store'
import { useEditorShortcuts } from '@/editor/useEditorShortcuts'
import { isMobileNow, useIsMobile } from '@/editor/useIsMobile'
import type { SideName } from '@/model/card'
import { createImageLayer } from '@/model/factory'
import { compressImage, ImageDecodeError } from '@/storage/image'
import { pruneAssets, putImage, usedAssetIds } from '@/storage/assets'

/** id của ô ảnh trống đang được chọn ở mặt hiện tại (ảnh tải lên sẽ vào ô này). */
function selectedEmptyImageId(): string | null {
  const { design, side, selectedId } = useEditorStore.getState()
  const layer = design[side].layers.find((l) => l.id === selectedId)
  return layer?.type === 'image' && !layer.props.assetId ? layer.id : null
}

/** Gắn ảnh vào layer `targetId` nếu nó còn ở mặt hiện tại, ngược lại thêm layer ảnh mới. */
function placeImage(assetId: string, targetId: string | null) {
  const st = useEditorStore.getState()
  const target = targetId ? st.design[st.side].layers.find((l) => l.id === targetId) : undefined
  if (target?.type === 'image') {
    st.updateLayer(target.id, { props: { assetId } })
    st.select(target.id)
  } else {
    st.addLayer(createImageLayer({ props: { assetId } }))
  }
}

export default function EditorPage() {
  useEditorShortcuts()
  const isMobile = useIsMobile()
  const side = useEditorStore((s) => s.side)
  const setSide = useEditorStore((s) => s.setSide)

  // Chưa chỉnh gì → mở sẵn ngăn "Mẫu" (desktop). Trên mobile bottom sheet che thẻ nên để đóng.
  const [drawer, setDrawer] = useState<DrawerId | null>(() =>
    isMobileNow() || useEditorStore.getState().dirty ? null : 'preset',
  )
  const [focusTextId, setFocusTextId] = useState<string | null>(null)
  const clearFocusText = useCallback(() => setFocusTextId(null), [])

  // Dọn ảnh không còn dùng một lần khi mở editor; ảnh mới chỉ ghi sau khi dọn xong
  // để không bị xóa nhầm (danh sách giữ lại được chụp lúc mở).
  const pruned = useRef<Promise<unknown>>(Promise.resolve())
  useEffect(() => {
    pruned.current = pruneAssets(usedAssetIds(useEditorStore.getState().design)).catch((err) => {
      console.warn('Không dọn được ảnh cũ', err)
    })
  }, [])

  const fileRef = useRef<HTMLInputElement>(null)
  // Layer đích của lần chọn file đang mở (null = theo ô ảnh trống đang chọn, hoặc thêm mới).
  // Mỗi lần mở hộp chọn file đều ghi lại giá trị này nên hủy hộp chọn không để lại đích cũ.
  const fileTarget = useRef<string | null>(null)

  const openFilePicker = useCallback((targetId: string | null) => {
    fileTarget.current = targetId
    fileRef.current?.click()
  }, [])

  const addImageFile = useCallback(async (file: File, targetId: string | null) => {
    try {
      await pruned.current
      const blob = await compressImage(file)
      const assetId = await putImage(blob)
      placeImage(assetId, targetId)
    } catch (err) {
      if (err instanceof ImageDecodeError) {
        toast.error('Không đọc được ảnh này')
      } else {
        console.error(err)
        toast.error('Không lưu được ảnh. Hãy thử lại.')
      }
    }
  }, [])

  const closeIfMobile = () => {
    if (isMobileNow()) setDrawer(null)
  }

  const onFiles = (files: FileList, targetId: string | null) => {
    const file = files[0]
    if (!file) return
    closeIfMobile()
    void addImageFile(file, targetId ?? selectedEmptyImageId())
  }

  const toggleDrawer = (id: DrawerId) => setDrawer((cur) => (cur === id ? null : id))

  const drawerContent: Record<DrawerId, ReactNode> = {
    preset: <PresetDrawer onApplied={closeIfMobile} />,
    text: (
      <TextDrawer
        onAdded={(id) => {
          closeIfMobile()
          setFocusTextId(id)
        }}
      />
    ),
    image: <ImageDrawer onPick={() => openFilePicker(null)} onFiles={(f) => onFiles(f, null)} />,
  }
  // Giữ nội dung sheet trong lúc nó trượt xuống sau khi đóng.
  const [lastDrawer, setLastDrawer] = useState<DrawerId>('preset')
  if (drawer && drawer !== lastDrawer) setLastDrawer(drawer)
  const shown = drawer ?? lastDrawer
  const drawerLabel = DRAWERS.find((d) => d.id === shown)?.label ?? ''

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-white text-[#171717]">
      <EditorTopBar />

      <div className="flex min-h-0 flex-1">
        <EditorRail variant="rail" active={drawer} onToggle={toggleDrawer} className="hidden md:flex" />

        {drawer && !isMobile && (
          <aside
            aria-label={drawerLabel}
            className="hidden w-60 shrink-0 flex-col border-r border-[#EAEAEA] bg-white md:flex"
          >
            <div className="flex h-11 items-center justify-between pr-2 pl-4">
              <h2 className="text-sm font-medium">{drawerLabel}</h2>
              <button
                type="button"
                aria-label="Đóng ngăn kéo"
                onClick={() => setDrawer(null)}
                className="rounded-md p-1.5 text-[#666666] hover:bg-[#F2F2F2] hover:text-[#171717]"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">{drawerContent[drawer]}</div>
          </aside>
        )}

        <main className="flex min-w-0 flex-1 flex-col bg-[#F2F2F2]">
          {/* Dải cố định: thanh thuộc tính hiện/ẩn không làm thẻ nhảy chỗ. */}
          <div className="flex h-14 shrink-0 items-center justify-center px-3">
            <ContextToolbar
              focusTextId={focusTextId}
              onFocused={clearFocusText}
              onReplaceImage={(id) => openFilePicker(id)}
            />
          </div>
          <div className="min-h-0 flex-1">
            <CardCanvas onRequestImage={(id) => openFilePicker(id)} />
          </div>
          <div className="flex h-14 shrink-0 items-center justify-center">
            <Tabs value={side} onValueChange={(v) => setSide(v as SideName)}>
              <TabsList className="border border-[#EAEAEA] bg-white">
                <TabsTrigger value="front" className="px-4 data-[state=active]:bg-[#F2F2F2] data-[state=active]:shadow-none">
                  Mặt trước
                </TabsTrigger>
                <TabsTrigger value="back" className="px-4 data-[state=active]:bg-[#F2F2F2] data-[state=active]:shadow-none">
                  Mặt sau
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </main>
      </div>

      <EditorRail variant="tabbar" active={drawer} onToggle={toggleDrawer} className="flex md:hidden" />

      <Sheet open={isMobile && drawer !== null} onOpenChange={(open) => !open && setDrawer(null)}>
        <SheetContent
          side="bottom"
          aria-describedby={undefined}
          // Không trả focus về nút tab: ô "Nội dung" của chữ vừa thêm cần giữ focus.
          onCloseAutoFocus={(e) => e.preventDefault()}
          className="max-h-[70dvh] gap-0 rounded-t-xl"
        >
          <SheetHeader className="pb-2">
            <SheetTitle className="text-sm">{drawerLabel}</SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto px-4 pb-6">{drawerContent[shown]}</div>
        </SheetContent>
      </Sheet>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const files = e.target.files
          const target = fileTarget.current
          fileTarget.current = null
          if (files && files.length > 0) onFiles(files, target)
          e.target.value = '' // cho phép chọn lại cùng một file
        }}
      />
    </div>
  )
}
