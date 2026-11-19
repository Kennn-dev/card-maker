import { Link } from 'react-router'
import { Button } from '@/components/ui/button'

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">Idol Card Maker</h1>
      <p className="text-muted-foreground">
        Thiết kế photocard idol của riêng bạn và xem trước hiệu ứng holo 3D ngay trên trình duyệt.
      </p>
      <Button asChild>
        <Link to="/editor">Bắt đầu thiết kế</Link>
      </Button>
    </main>
  )
}
