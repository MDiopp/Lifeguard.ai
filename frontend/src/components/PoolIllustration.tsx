import { useId } from 'react'

export type IllustratedSwimmer = {
  id: string; x: number; y: number; direction: number
  color: 'ink' | 'sand' | 'sun' | 'coral'; affected?: boolean
}

/** Presentation-only pool placeholder; no detection or game rules. */
export function PoolIllustration({ swimmers, time = 0, reveal }: { swimmers: IllustratedSwimmer[]; time?: number; reveal?: string }) {
  const uid = useId().replace(/:/g, '')
  return (
          <svg className="demo-pool-art" viewBox="0 0 1000 562.5" aria-hidden="true">
            <defs>
              <linearGradient id={`${uid}-water`} x2="1" y2="1"><stop stopColor="var(--seafoam)" /><stop offset="1" stopColor="var(--lagoon)" /></linearGradient>
              <pattern id={`${uid}-tiles`} width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="var(--sand)" strokeOpacity=".23" strokeWidth="1" /></pattern>
            </defs>
            <rect width="1000" height="562.5" fill="var(--sand)" />
            <rect x="20" y="20" width="960" height="522.5" rx="8" fill={`url(#${uid}-water)`} />
            <rect x="20" y="20" width="960" height="522.5" rx="8" fill={`url(#${uid}-tiles)`} />
            <g stroke="var(--teal)" strokeWidth="5" opacity=".12">
              {[155, 282, 410].map(y => <path key={y} d={`M65 ${y}H935 M65 ${y - 22}v44 M935 ${y - 22}v44`} />)}
            </g>
            <g fill="none" stroke="var(--sand)" strokeWidth="2" opacity=".3">
              <path d="M20 108Q155 64 290 108T560 108T830 108T1100 108M20 330Q155 286 290 330T560 330T830 330T1100 330M20 455Q155 411 290 455T560 455T830 455T1100 455" />
            </g>
            {swimmers.map((swimmer, index) => {
              const stroke = Math.sin(time * (swimmer.affected ? 5 : 2.5) + index) * (swimmer.affected ? 14 : 8)
              return <g key={swimmer.id} transform={`translate(${swimmer.x * 1000} ${swimmer.y * 562.5})`}>
                <ellipse rx="29" ry="17" fill="none" stroke="var(--sand)" strokeWidth="2" opacity=".55" />
                <g transform={`rotate(${swimmer.direction * 90})`}>
                  <ellipse cy="8" rx="9" ry="19" fill="var(--ink)" opacity=".14" transform="translate(4 5)" />
                  <path d={`M-5 1L-18 ${-8 + stroke}M5 1L18 ${-8 - stroke}M-3 17L-8 30M3 17L9 29`} fill="none" stroke="var(--secondary)" strokeWidth="5" strokeLinecap="round" />
                  <rect x="-6" y="-1" width="12" height="21" rx="6" fill="var(--ink)" />
                  <circle cy="-9" r="8" fill={`var(--${swimmer.color})`} />
                </g>
                {reveal === swimmer.id && <circle className="demo-reveal-ring" r="38" fill="none" stroke="var(--ink)" strokeWidth="3" strokeDasharray="6 5" />}
              </g>
            })}
            <g stroke="var(--secondary)" strokeWidth="3" fill="none"><path d="M940 20v42q0 8 8 8M958 20v42q0 8 8 8M940 35h18M940 48h18" /></g>
          </svg>
  )
}
