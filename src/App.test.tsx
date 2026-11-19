import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import App from '@/App'

it('renders app root', () => {
  render(<App />)
  expect(
    screen.getByRole('heading', { name: 'Idol Card Maker' }),
  ).toBeInTheDocument()
})
