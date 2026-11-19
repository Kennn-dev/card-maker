import { useEffect } from 'react'
import { useEditorStore } from './store'

const TYPING_SELECTOR = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])'
// Phím trong hộp thoại (xác nhận đổi mẫu, bottom sheet) thuộc về hộp thoại, không phải thẻ.
const DIALOG_SELECTOR = '[role="dialog"], [role="alertdialog"]'

/** Có nên bỏ qua phím tắt vì người dùng đang gõ chữ hoặc đang ở trong hộp thoại không. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  if (target instanceof HTMLElement && target.isContentEditable) return true
  return target.closest(TYPING_SELECTOR) !== null || target.closest(DIALOG_SELECTOR) !== null
}

/**
 * Phím tắt editor: Ctrl/Cmd+Z hoàn tác, Ctrl/Cmd+Shift+Z hoặc Ctrl+Y làm lại,
 * Delete/Backspace xóa layer đang chọn. Bỏ qua khi focus ở ô nhập liệu.
 */
export function useEditorShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing || isTypingTarget(e.target)) return
      const st = useEditorStore.getState()
      const key = e.key.toLowerCase()
      const mod = e.ctrlKey || e.metaKey

      if (mod && !e.altKey && key === 'z') {
        e.preventDefault()
        if (e.shiftKey) st.redo()
        else st.undo()
        return
      }
      if (e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && key === 'y') {
        e.preventDefault()
        st.redo()
        return
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && !mod && !e.altKey) {
        if (st.selectedId === null) return
        e.preventDefault()
        st.removeLayer(st.selectedId)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
