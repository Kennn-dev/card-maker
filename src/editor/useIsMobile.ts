import { useSyncExternalStore } from 'react'

/** Khớp breakpoint `md` của Tailwind (768px): dưới mức này dùng tab bar đáy + bottom sheet. */
export const MOBILE_QUERY = '(max-width: 767px)'

function query(): MediaQueryList | null {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(MOBILE_QUERY)
    : null
}

export function isMobileNow(): boolean {
  return query()?.matches ?? false
}

function subscribe(cb: () => void) {
  const mq = query()
  mq?.addEventListener('change', cb)
  return () => mq?.removeEventListener('change', cb)
}

export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, isMobileNow, () => false)
}
