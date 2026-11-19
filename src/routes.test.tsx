import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderRoute } from '@/test/renderRoute'

// Konva cần canvas thật: jsdom không import nó, canvas được test bằng Playwright.
vi.mock('@/editor/canvas/CardCanvas', () => ({ CardCanvas: () => null }))

describe('routes', () => {
  it('landing shows title and CTA', () => {
    renderRoute('/')
    expect(screen.getByRole('heading', { level: 1, name: 'Idol Card Maker' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Bắt đầu thiết kế' })).toHaveAttribute('href', '/editor')
  })

  it('CTA navigates to lazy editor, showing loading fallback first', async () => {
    const { user } = renderRoute('/')
    await user.click(screen.getByRole('link', { name: 'Bắt đầu thiết kế' }))
    expect(screen.getByText('Đang tải editor…')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Hoàn tác' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Idol Card Maker' })).toHaveAttribute('href', '/')
  })

  it('unknown path shows not-found page with home link', () => {
    renderRoute('/abc')
    expect(screen.getByRole('heading', { name: 'Không tìm thấy trang' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Về trang chủ' })).toHaveAttribute('href', '/')
  })
})

describe('route error', () => {
  afterEach(() => {
    vi.doUnmock('@/pages/EditorPage')
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it('shows friendly error when editor chunk fails to load', async () => {
    // React Router log lỗi render ra console: tắt để output test sạch.
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.doMock('@/pages/EditorPage', () => {
      throw new Error('Failed to fetch dynamically imported module')
    })
    vi.resetModules()
    const { renderRoute: render } = await import('@/test/renderRoute')
    const { unmount } = render('/editor')
    try {
      expect(await screen.findByRole('heading', { name: 'Không tải được trang' })).toBeVisible()
      expect(screen.getByRole('button', { name: 'Tải lại' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Về trang chủ' })).toHaveAttribute('href', '/')
    } finally {
      unmount()
    }
  })
})
