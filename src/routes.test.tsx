import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
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
    expect(await screen.findByRole('heading', { level: 1, name: 'Editor' })).toBeVisible()
  })

  it('unknown path shows not-found page with home link', () => {
    renderRoute('/abc')
    expect(screen.getByRole('heading', { name: 'Không tìm thấy trang' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Về trang chủ' })).toHaveAttribute('href', '/')
  })
})
