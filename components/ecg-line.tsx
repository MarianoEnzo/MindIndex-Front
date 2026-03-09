'use client'

import { useEffect, useRef } from 'react'

interface EcgLineProps {
  active: boolean
}

export function EcgLine({ active }: EcgLineProps) {
  const pathRef = useRef<SVGPathElement>(null)

  // Build ECG-style path
  const flatPath = 'M0,20 L400,20'
  const ecgPath =
    'M0,20 L60,20 L70,18 L80,20 L90,20 L100,20 L108,4 L112,36 L116,4 L120,20 L140,20 L148,18 L152,20 L170,20 L230,20 L238,18 L248,20 L258,20 L268,20 L276,4 L280,36 L284,4 L288,20 L308,20 L316,18 L320,20 L340,20 L400,20'

  return (
    <svg
      viewBox="0 0 400 40"
      className="w-full h-10"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <path
        ref={pathRef}
        d={active ? ecgPath : flatPath}
        fill="none"
        stroke="#00C853"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          transition: 'all 0.4s ease',
          ...(active
            ? {
                strokeDasharray: '800',
                strokeDashoffset: '0',
                animation: 'ecg-march 2s linear infinite',
              }
            : {}),
        }}
      />
      <style>{`
        @keyframes ecg-march {
          from { stroke-dashoffset: 800; }
          to   { stroke-dashoffset: 0; }
        }
      `}</style>
    </svg>
  )
}
