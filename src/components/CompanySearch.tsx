import { useState, useRef, useEffect } from 'react'
import type { SearchResult } from '../types'
import { searchCompanies } from '../api'

const r = (px: number) => `${px / 16}rem`

interface Props {
  player: 1 | 2
  onSelect: (result: SearchResult) => void
  disabled?: boolean
}

export default function CompanySearch({ player, onSelect, disabled }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const color = player === 1 ? 'var(--p1)' : 'var(--p2)'
  const label = player === 1 ? 'P1' : 'P2'

  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      setOpen(false)
      return
    }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await searchCompanies(query)
        setResults(data.filter(r => !r.deregistered))
        setOpen(true)
      } finally {
        setLoading(false)
      }
    }, 350)
  }, [query])

  const handleSelect = (r: SearchResult) => {
    setQuery(r.name)
    setOpen(false)
    onSelect(r)
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'var(--bg-card)',
        border: `2px solid ${color}`,
        borderRadius: 4,
        boxShadow: `0 0 10px ${color}44, inset 0 0 10px rgba(0,0,0,0.5)`,
        padding: '2px 12px',
        opacity: disabled ? 0.5 : 1,
      }}>
        <span style={{
          fontFamily: 'Orbitron',
          color,
          fontSize: r(11),
          fontWeight: 900,
          letterSpacing: 2,
          textShadow: `0 0 8px ${color}`,
          whiteSpace: 'nowrap',
        }}>{label}</span>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Leitaðu að fyrirtæki..."
          disabled={disabled}
          style={{
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text)',
            fontSize: r(13),
            padding: '10px 0',
            width: '100%',
            letterSpacing: 1,
          }}
        />
        {loading && (
          <span style={{ color, fontSize: r(11), animation: 'blink 1s infinite' }}>●●●</span>
        )}
      </div>

      {open && results.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          zIndex: 100,
          background: 'var(--bg-panel)',
          border: `1px solid ${color}`,
          borderTop: 'none',
          borderRadius: '0 0 4px 4px',
          maxHeight: 280,
          overflowY: 'auto',
          boxShadow: `0 8px 24px rgba(0,0,0,0.8)`,
        }}>
          {results.map(result => (
            <div
              key={result.ssn}
              onClick={() => handleSelect(result)}
              style={{
                padding: '8px 14px',
                cursor: 'pointer',
                borderBottom: '1px solid var(--border)',
                transition: 'background 0.15s',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = `${color}22`)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontSize: r(13) }}>{result.name}</span>
              <span style={{ fontSize: r(11), color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                {result.ssn.slice(0,6)}-{result.ssn.slice(6)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
