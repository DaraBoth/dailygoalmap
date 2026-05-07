import * as React from "react"

const MOBILE_BREAKPOINT = 1024 // Updated to iPad breakpoint
const LARGE_SCREEN_BREAKPOINT = 1536 // 2xl (desktop large)

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  // Coerce to boolean for backward compatibility
  // Note: Returns false on first render, causing a one-frame layout flash on mobile
  // This is acceptable for a pure SPA (no SSR hydration issues)
  return !!isMobile
}

export function useIsLargeScreen() {
  const [isLarge, setIsLarge] = React.useState<boolean>(
    () => typeof window !== 'undefined' ? window.innerWidth >= LARGE_SCREEN_BREAKPOINT : false
  )

  React.useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${LARGE_SCREEN_BREAKPOINT}px)`)
    const onChange = () => {
      setIsLarge(mql.matches)
    }
    mql.addEventListener("change", onChange)
    setIsLarge(mql.matches)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isLarge
}
