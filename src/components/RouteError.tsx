import { useEffect } from 'react'
import { Link, useRouteError } from 'react-router'
import { Button } from '@/components/ui/button'

/** `errorElement` cho mọi route: thay màn hình lỗi dành cho developer của React Router. */
export function RouteError() {
  const error = useRouteError()
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-[#171717]">Không tải được trang</h1>
      <p className="text-sm text-[#666666]">
        Có thể mạng vừa bị gián đoạn hoặc trang vừa được cập nhật. Tải lại trang để thử lần nữa.
      </p>
      <div className="flex items-center gap-4">
        <Button type="button" onClick={() => window.location.reload()}>
          Tải lại
        </Button>
        <Link to="/" className="text-sm underline underline-offset-4">
          Về trang chủ
        </Link>
      </div>
    </main>
  )
}
