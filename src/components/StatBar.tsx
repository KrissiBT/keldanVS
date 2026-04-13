import { useEffect, useState } from 'react'

interface Props {
  label: string
  labelEn: string
  value1: number | undefined
  value2: number | undefined
  currency1: string
  currency2: string
  numbersIn1: number
  numbersIn2: number
  invert?: boolean
}

function fmt(v: number, currency: string, numbersIn: number): string {
  const actual = v * numbersIn
  const abs = Math.abs(actual)
  if (abs >= 1_000_000_000) return `${(actual / 1_000_000_000).toFixed(1)}B ${currency}`
  if (abs >= 1_000_000) return `${(actual / 1_000_000).toFixed(1)}M ${currency}`
  if (abs >= 1_000) return `${(actual / 1_000).toFixed(0)}K ${currency}`
  return `${actual.toFixed(0)} ${currency}`
}

export default function StatBar({ label, labelEn, value1, value2, currency1, currency2, numbersIn1, numbersIn2, invert = false }: Props) {
  const [animated, setAnimated] = useState(false)
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 80); return () => clearTimeout(t) }, [value1, value2])

  const hasV1 = value1 !== undefined && value1 !== null
  const hasV2 = value2 !== undefined && value2 !== null

  // Normalise to ISK-equivalent for comparison (multiply by numbersIn)
  const abs1 = hasV1 ? Math.abs(value1! * numbersIn1) : 0
  const abs2 = hasV2 ? Math.abs(value2! * numbersIn2) : 0
  const max = Math.max(abs1, abs2, 1)
  const pct1 = (abs1 / max) * 100
  const pct2 = (abs2 / max) * 100

  const both = hasV1 && hasV2
  const p1Wins = both && (invert ? value1! < value2! : value1! > value2!)
  const p2Wins = both && (invert ? value2! < value1! : value2! > value1!)

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 80px 1fr',
      alignItems: 'center',
      gap: 6,
      padding: '7px 0',
      borderBottom: '1px solid #1a1a33',
    }}>
      {/* P1 side */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
        <span style={{
          fontFamily: 'Share Tech Mono',
          fontSize: 13,
          color: !hasV1 ? '#555' : value1! < 0 ? '#ff7777' : p1Wins ? 'var(--gold)' : 'var(--p1)',
          textShadow: p1Wins ? '0 0 8px var(--gold)' : hasV1 ? '0 0 6px var(--p1)' : 'none',
        }}>
          {hasV1 ? fmt(value1!, currency1, numbersIn1) : '—'}
          {p1Wins && <span style={{ marginLeft: 5, fontSize: 10 }}>◀ WIN</span>}
        </span>
        <div style={{ width: '100%', height: 6, background: '#0d0e1f', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            float: 'right',
            height: '100%',
            width: animated ? `${pct1}%` : '0%',
            background: p1Wins
              ? 'linear-gradient(90deg, transparent, var(--gold))'
              : 'linear-gradient(90deg, transparent, var(--p1))',
            borderRadius: 3,
            transition: 'width 0.7s cubic-bezier(0.34,1.2,0.64,1)',
            boxShadow: `0 0 5px ${p1Wins ? 'var(--gold)' : 'var(--p1)'}`,
          }} />
        </div>
      </div>

      {/* Label */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'Orbitron', fontSize: 8, color: '#666', letterSpacing: 1, textTransform: 'uppercase', lineHeight: 1.3 }}>
          {label}
        </div>
        <div style={{ fontFamily: 'Share Tech Mono', fontSize: 9, color: '#444', letterSpacing: 0 }}>
          {labelEn}
        </div>
      </div>

      {/* P2 side */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3 }}>
        <span style={{
          fontFamily: 'Share Tech Mono',
          fontSize: 13,
          color: !hasV2 ? '#555' : value2! < 0 ? '#ff7777' : p2Wins ? 'var(--gold)' : 'var(--p2)',
          textShadow: p2Wins ? '0 0 8px var(--gold)' : hasV2 ? '0 0 6px var(--p2)' : 'none',
        }}>
          {p2Wins && <span style={{ marginRight: 5, fontSize: 10 }}>WIN ▶</span>}
          {hasV2 ? fmt(value2!, currency2, numbersIn2) : '—'}
        </span>
        <div style={{ width: '100%', height: 6, background: '#0d0e1f', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: animated ? `${pct2}%` : '0%',
            background: p2Wins
              ? 'linear-gradient(90deg, var(--gold), transparent)'
              : 'linear-gradient(90deg, var(--p2), transparent)',
            borderRadius: 3,
            transition: 'width 0.7s cubic-bezier(0.34,1.2,0.64,1)',
            boxShadow: `0 0 5px ${p2Wins ? 'var(--gold)' : 'var(--p2)'}`,
          }} />
        </div>
      </div>
    </div>
  )
}
