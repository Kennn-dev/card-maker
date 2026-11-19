import { Link } from 'react-router'

export default function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Không tìm thấy trang</h1>
      <Link to="/" className="text-sm underline underline-offset-4">
        Về trang chủ
      </Link>
    </main>
  )
}
