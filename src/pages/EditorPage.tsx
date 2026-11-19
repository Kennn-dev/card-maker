import { Link } from 'react-router'
import { CardCanvas } from '@/editor/canvas/CardCanvas'

// Bố cục tạm (Task 4): Task 5 thay bằng bố cục editor thật.
export default function EditorPage() {
  return (
    <main className="flex h-dvh flex-col">
      <header className="flex items-center justify-between gap-4 px-4 py-2">
        <h1 className="text-lg font-semibold tracking-tight">Editor</h1>
        <Link to="/" className="text-sm underline underline-offset-4">
          Trang chủ
        </Link>
      </header>
      <div className="min-h-0 flex-1">
        <CardCanvas />
      </div>
    </main>
  )
}
