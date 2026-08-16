import { useEffect, useState } from 'react'

/**
 * Three layouts, not a hard desktop cutoff:
 *   wide   ≥1280 — all three columns side by side
 *   medium ≥768  — list + thread; lead details slide over as a panel
 *   narrow <768  — one pane at a time, with back navigation
 */
export const BP = { wide: 1280, medium: 768 }

const read = () => {
  const w = typeof window === 'undefined' ? BP.wide : window.innerWidth
  return w >= BP.wide ? 'wide' : w >= BP.medium ? 'medium' : 'narrow'
}

export default function useLayout() {
  const [layout, setLayout] = useState(read)

  useEffect(() => {
    let frame = 0
    const onResize = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setLayout(read()))
    }
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
    }
  }, [])

  return layout
}
