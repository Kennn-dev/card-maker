import { lazy, Suspense } from 'react'
import type { RouteObject } from 'react-router'
import { RouteError } from './components/RouteError'
import LandingPage from './pages/LandingPage'
import NotFoundPage from './pages/NotFoundPage'

const EditorPage = lazy(() => import('./pages/EditorPage'))

export const routes: RouteObject[] = [
  { path: '/', element: <LandingPage />, errorElement: <RouteError /> },
  {
    path: '/editor',
    element: (
      <Suspense fallback={<p className="px-4 py-8 text-center">Đang tải editor…</p>}>
        <EditorPage />
      </Suspense>
    ),
    errorElement: <RouteError />,
  },
  { path: '*', element: <NotFoundPage />, errorElement: <RouteError /> },
]
