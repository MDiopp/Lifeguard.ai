import { useEffect, useState } from 'react'

const preferenceKey = 'lifeguard-motion-paused'

function readPausedPreference() {
  try {
    return localStorage.getItem(preferenceKey) === 'true'
  } catch {
    return false
  }
}

export function useMotionPreference() {
  const [paused, setPaused] = useState(readPausedPreference)
  const [reduced, setReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  const [visible, setVisible] = useState(() => !document.hidden)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(query.matches)
    const onVisibility = () => setVisible(!document.hidden)
    query.addEventListener('change', onChange)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      query.removeEventListener('change', onChange)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  const toggle = () => {
    const next = !paused
    setPaused(next)
    try {
      localStorage.setItem(preferenceKey, String(next))
    } catch {
      // Motion controls still work when browser storage is unavailable.
    }
  }

  return { paused, reduced, active: !paused && !reduced && visible, toggle }
}
