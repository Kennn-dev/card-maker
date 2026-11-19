import { afterEach, describe, expect, it, vi } from 'vitest'
import { compressImage, fitWithin, ImageDecodeError } from './image'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('image', () => {
  it('fitWithin shrinks long edge to 1500 keeping ratio', () => {
    expect(fitWithin(4000, 3000)).toEqual({ w: 1500, h: 1125 })
    expect(fitWithin(3000, 4000)).toEqual({ w: 1125, h: 1500 })
    expect(fitWithin(800, 600)).toEqual({ w: 800, h: 600 })
  })

  it('compressImage rejects non-images with ImageDecodeError', async () => {
    vi.stubGlobal('createImageBitmap', () => Promise.reject(new Error('bad image')))
    await expect(
      compressImage(new Blob(['hello'], { type: 'text/plain' })),
    ).rejects.toBeInstanceOf(ImageDecodeError)
  })
})
