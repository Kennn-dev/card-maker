import { create } from 'zustand'
import type { CardDesign, Layer, SideName } from '@/model/card'
import { isCardDesign } from '@/model/validate'
import { loadPresetDesign, PRESETS } from '@/presets'

export const STORAGE_KEY = 'icm:design:v1'
const DEFAULT_PRESET = 'photocard-basic'
const HISTORY_LIMIT = 50
const SAVE_DEBOUNCE_MS = 1000

type LayerPatch = Partial<Omit<Layer, 'props'>> & { props?: Partial<Layer['props']> }

export type EditorState = {
  design: CardDesign
  side: SideName
  selectedId: string | null
  dirty: boolean
  past: CardDesign[]
  future: CardDesign[]
  saveState: 'saved' | 'pending'
  setSide(side: SideName): void
  select(id: string | null): void
  loadPreset(id: string): void
  addLayer(layer: Layer): void
  updateLayer(id: string, patch: LayerPatch, opts?: { coalesce?: string }): void
  removeLayer(id: string): void
  undo(): void
  redo(): void
}

/** So sánh sâu, không phụ thuộc thứ tự key (design đọc từ JSON có thể khác thứ tự). */
function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  const ka = Object.keys(a)
  const kb = Object.keys(b)
  if (ka.length !== kb.length) return false
  return ka.every(
    (k) => Object.hasOwn(b, k) && deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]),
  )
}

function withoutLayerIds(design: CardDesign): unknown {
  const strip = (side: CardDesign['front']) => ({
    ...side,
    layers: side.layers.map(({ id: _id, ...rest }) => rest),
  })
  return { ...design, front: strip(design.front), back: strip(design.back) }
}

/** Design đã khác bản gốc của preset chưa (bỏ qua id layer). Preset không còn tồn tại → coi là đã chỉnh. */
export function differsFromPreset(design: CardDesign): boolean {
  const preset = PRESETS.find((p) => p.id === design.presetId)
  if (!preset) return true
  return !deepEqual(withoutLayerIds(design), withoutLayerIds(preset.design))
}

function loadInitialDesign(): CardDesign {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        (parsed as { version?: unknown }).version === 1 &&
        isCardDesign((parsed as { design?: unknown }).design)
      ) {
        return (parsed as { design: CardDesign }).design
      }
    }
  } catch {
    // JSON hỏng hoặc localStorage không dùng được → dùng preset mặc định
  }
  return loadPresetDesign(DEFAULT_PRESET)
}

let saveTimer: ReturnType<typeof setTimeout> | undefined
let lastCoalesce: string | null = null

function cancelSaveTimer() {
  if (saveTimer !== undefined) {
    clearTimeout(saveTimer)
    saveTimer = undefined
  }
}

function writeNow(): boolean {
  cancelSaveTimer()
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, design: useEditorStore.getState().design }),
    )
  } catch (err) {
    // đầy bộ nhớ / bị chặn: giữ 'pending' để UI không báo "đã lưu" sai
    console.warn('Không lưu được thiết kế vào localStorage', err)
    return false
  }
  useEditorStore.setState({ saveState: 'saved' })
  return true
}

/** Ghi ngay (không điều kiện). */
export function flushSave(): void {
  writeNow()
}

/** Chỉ ghi khi có thay đổi chưa lưu — tab cũ không đụng tới sẽ không đè dữ liệu tab khác. */
function flushIfPending(): void {
  if (saveTimer !== undefined || useEditorStore.getState().saveState === 'pending') writeNow()
}

function scheduleSave() {
  cancelSaveTimer()
  saveTimer = setTimeout(flushSave, SAVE_DEBOUNCE_MS)
}

function initialState() {
  const design = loadInitialDesign()
  return {
    design,
    side: 'front' as SideName,
    selectedId: null as string | null,
    // Bài đã chỉnh từ phiên trước vẫn là "đã chỉnh": đổi mẫu phải hỏi (lịch sử undo không được lưu).
    dirty: differsFromPreset(design),
    past: [] as CardDesign[],
    future: [] as CardDesign[],
    saveState: 'saved' as const,
  }
}

type Set = (partial: Partial<EditorState>) => void

/** Áp một thay đổi design: đẩy bản cũ vào past, xóa future, lên lịch lưu. */
function commit(
  get: () => EditorState,
  set: Set,
  next: CardDesign,
  extra: Partial<EditorState> = {},
  opts: { history?: boolean; dirty?: boolean } = {},
) {
  const { design, past } = get()
  const history = opts.history ?? true
  set({
    design: next,
    past: history ? [...past, design].slice(-HISTORY_LIMIT) : past,
    future: [],
    dirty: opts.dirty ?? true,
    saveState: 'pending',
    ...extra,
  })
  scheduleSave()
}

function keepSelection(design: CardDesign, selectedId: string | null): string | null {
  if (selectedId === null) return null
  const exists = [...design.front.layers, ...design.back.layers].some((l) => l.id === selectedId)
  return exists ? selectedId : null
}

function mapSide(design: CardDesign, side: SideName, fn: (layers: Layer[]) => Layer[]): CardDesign {
  return { ...design, [side]: { ...design[side], layers: fn(design[side].layers) } }
}

export const useEditorStore = create<EditorState>()((set, get) => ({
  ...initialState(),

  setSide(side) {
    lastCoalesce = null
    set({ side, selectedId: null })
  },

  select(id) {
    lastCoalesce = null
    set({ selectedId: id })
  },

  loadPreset(id) {
    lastCoalesce = null
    commit(get, set, loadPresetDesign(id), { selectedId: null }, { dirty: false })
  },

  addLayer(layer) {
    lastCoalesce = null
    const { design, side } = get()
    commit(get, set, mapSide(design, side, (ls) => [...ls, layer]), { selectedId: layer.id })
  },

  updateLayer(id, patch, opts) {
    const { design, side } = get()
    const layers = design[side].layers
    if (!layers.some((l) => l.id === id)) return
    const { props, ...rest } = patch
    const next = mapSide(design, side, (ls) =>
      ls.map((l) =>
        l.id === id ? ({ ...l, ...rest, props: { ...l.props, ...props } } as Layer) : l,
      ),
    )
    const key = opts?.coalesce ?? null
    const coalesced = key !== null && key === lastCoalesce
    lastCoalesce = key
    commit(get, set, next, {}, { history: !coalesced })
  },

  removeLayer(id) {
    lastCoalesce = null
    const { design, side, selectedId } = get()
    if (!design[side].layers.some((l) => l.id === id)) return
    commit(
      get,
      set,
      mapSide(design, side, (ls) => ls.filter((l) => l.id !== id)),
      selectedId === id ? { selectedId: null } : {},
    )
  },

  undo() {
    lastCoalesce = null
    const { past, future, design } = get()
    if (past.length === 0) return
    const prev = past[past.length - 1]
    set({
      design: prev,
      selectedId: keepSelection(prev, get().selectedId),
      past: past.slice(0, -1),
      future: [...future, design],
      dirty: true,
      saveState: 'pending',
    })
    scheduleSave()
  },

  redo() {
    lastCoalesce = null
    const { past, future, design } = get()
    if (future.length === 0) return
    const nxt = future[future.length - 1]
    set({
      design: nxt,
      selectedId: keepSelection(nxt, get().selectedId),
      future: future.slice(0, -1),
      past: [...past, design],
      dirty: true,
      saveState: 'pending',
    })
    scheduleSave()
  },
}))

/** Chỉ dùng cho test: đưa store về trạng thái khởi tạo (đọc lại storage). */
export function resetEditorStoreForTest(): void {
  cancelSaveTimer()
  lastCoalesce = null
  useEditorStore.setState(initialState())
}

if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('pagehide', flushIfPending)
}
