import React, { useState, useCallback, useEffect, useRef } from 'react'
import CompanySearch from './components/CompanySearch'
import StatBar from './components/StatBar'
import TrendChart from './components/TrendChart'
import { getCompanyData } from './api'
import type { SearchResult, CompanyData, YearData } from './types'

const EMPTY: CompanyData = { ssn: '', name: '', years: [], keys: {}, loading: false, error: null }

// Read initial state from URL params
function readUrlParams() {
  const p = new URLSearchParams(window.location.search)
  return {
    ssn1: p.get('c1') ?? '',
    ssn2: p.get('c2') ?? '',
    year1: p.get('y1') ? Number(p.get('y1')) : null,
    year2: p.get('y2') ? Number(p.get('y2')) : null,
  }
}

const INCOME_KEYS: [number, boolean][] = [
  [110000, false],  // Rekstrartekjur
  [910200, true],   // Rekstrargjöld (lower=better)
  [910400, false],  // EBITDA
  [910500, false],  // EBIT
  [910700, false],  // Hagnaður
]
const BALANCE_KEYS: [number, boolean][] = [
  [200000, false],  // Eignir
  [300000, false],  // Eigið fé
  [400000, true],   // Skuldir
  [920500, true],   // Vaxtaberandi skuldir
  [224000, false],  // Handbært fé
]
const CASHFLOW_KEYS: [number, boolean][] = [
  [510000, false],  // Sjóðstreymi frá rekstri
  [520000, false],  // Fjárfestingarhreyfingar
  [530000, false],  // Fjármögnunarhreyfingar
]

function pickYear(years: YearData[], selected: number | null): YearData | null {
  if (!years.length) return null
  if (selected !== null) return years.find(y => y.year === selected) ?? years[0]
  return years[0]
}

function calcScore(y1: YearData | null, y2: YearData | null): [number, number] {
  if (!y1 || !y2) return [0, 0]
  const all = [...INCOME_KEYS, ...BALANCE_KEYS]
  let s1 = 0, s2 = 0
  for (const [k, invert] of all) {
    const v1 = y1[k] as number | undefined
    const v2 = y2[k] as number | undefined
    if (v1 === undefined || v2 === undefined) continue
    if (invert ? v1 < v2 : v1 > v2) s1++
    else if (invert ? v2 < v1 : v2 > v1) s2++
  }
  return [s1, s2]
}

type Tab = 'income' | 'balance' | 'cashflow' | 'trends'

export default function App() {
  const initialParams = useRef(readUrlParams())
  const [c1, setC1] = useState<CompanyData>({ ...EMPTY })
  const [c2, setC2] = useState<CompanyData>({ ...EMPTY })
  const [year1, setYear1] = useState<number | null>(null)
  const [year2, setYear2] = useState<number | null>(null)
  const [tab, setTab] = useState<Tab>('income')
  const [vsFlash, setVsFlash] = useState(false)
  const [copied, setCopied] = useState(false)

  // Keep URL in sync whenever companies or years change
  useEffect(() => {
    const p = new URLSearchParams()
    if (c1.ssn) p.set('c1', c1.ssn)
    if (c2.ssn) p.set('c2', c2.ssn)
    if (year1) p.set('y1', String(year1))
    if (year2) p.set('y2', String(year2))
    const qs = p.toString()
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname)
  }, [c1.ssn, c2.ssn, year1, year2])

  const loadCompany = useCallback(async (
    r: SearchResult,
    set: React.Dispatch<React.SetStateAction<CompanyData>>,
    setYear: React.Dispatch<React.SetStateAction<number | null>>,
    preselectedYear?: number | null
  ) => {
    set({ ...EMPTY, ssn: r.ssn, name: r.name, loading: true })
    setYear(null)
    setVsFlash(false)
    try {
      const data = await getCompanyData(r.ssn)
      if (!data) throw new Error('No data returned')
      set({ ssn: r.ssn, name: r.name, years: data.years, keys: data.keys, loading: false, error: null })
      if (preselectedYear && data.years.some(y => y.year === preselectedYear)) {
        setYear(preselectedYear)
      }
      setTimeout(() => setVsFlash(true), 200)
    } catch (e: unknown) {
      set({ ...EMPTY, ssn: r.ssn, name: r.name, error: String(e) })
    }
  }, [])

  // Auto-load companies from URL on first render
  useEffect(() => {
    const { ssn1, ssn2, year1: y1, year2: y2 } = initialParams.current
    if (ssn1) loadCompany({ ssn: ssn1, name: ssn1, deregistered: '', deregisteredDate: null }, setC1, setYear1, y1)
    if (ssn2) loadCompany({ ssn: ssn2, name: ssn2, deregistered: '', deregisteredDate: null }, setC2, setYear2, y2)
  }, [loadCompany])

  const handleShare = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [])

  const bothLoaded = c1.years.length > 0 && c2.years.length > 0
  const y1 = pickYear(c1.years, year1)
  const y2 = pickYear(c2.years, year2)
  const [s1, s2] = calcScore(y1, y2)
  const keys = { ...c1.keys, ...c2.keys }

  const allYears1 = c1.years.map(y => y.year)
  const allYears2 = c2.years.map(y => y.year)

  return (
    <div style={{ maxWidth: 1060, margin: '0 auto', padding: '0 16px 80px' }}>

      {/* ── Header ── */}
      <header style={{ textAlign: 'center', padding: '28px 0 20px' }}>
        <h1 style={{
          fontFamily: 'Orbitron', fontWeight: 900, fontSize: 'clamp(24px, 5vw, 40px)',
          letterSpacing: 6, lineHeight: 1,
          background: 'linear-gradient(90deg, var(--p1), var(--gold), var(--p2))',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>FYRIRTÆKI VS</h1>
        <p style={{ fontFamily: 'Share Tech Mono', fontSize: 10, color: '#555', letterSpacing: 3, marginTop: 4 }}>
          KELDAN.IS · ÍSLENSKUR FJÁRHAGSSAMANBURÐUR · ULTIMATE SHOWDOWN
        </p>
      </header>

      {/* ── Search row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 56px 1fr', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <CompanySearch player={1} onSelect={r => loadCompany(r, setC1, setYear1, null)} />
        <div style={{
          textAlign: 'center', fontFamily: 'Orbitron', fontSize: 24, fontWeight: 900,
          color: 'var(--gold)', textShadow: '0 0 16px var(--gold)', letterSpacing: 3,
        }}>VS</div>
        <CompanySearch player={2} onSelect={r => loadCompany(r, setC2, setYear2, null)} />
      </div>

      {/* ── Company cards ── */}
      {(c1.ssn || c2.ssn) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 56px 1fr', gap: 12, marginBottom: 16 }}>
          {/* P1 card */}
          <div style={{
            background: 'var(--bg-card)', border: '2px solid var(--p1)', borderRadius: 8,
            padding: '16px 20px', boxShadow: '0 0 16px #00d4ff22',
            animation: c1.ssn ? 'slide-in-left 0.4s ease-out' : 'none',
          }}>
            <div style={{ fontFamily: 'Orbitron', fontSize: 9, color: 'var(--p1)', letterSpacing: 3, marginBottom: 4 }}>PLAYER 1</div>
            <div style={{ fontSize: 17, fontWeight: 'bold', lineHeight: 1.3 }}>
              {c1.name || <span style={{ color: '#444' }}>—</span>}
            </div>
            {c1.ssn && <div style={{ fontFamily: 'Share Tech Mono', fontSize: 10, color: '#555', marginTop: 2 }}>
              KT {c1.ssn.slice(0,6)}-{c1.ssn.slice(6)}
            </div>}
            {c1.loading && <div style={{ color: 'var(--p1)', fontSize: 10, marginTop: 6, animation: 'blink 1s infinite' }}>HLEÐUR GÖGN...</div>}
            {c1.error && <div style={{ color: '#ff6666', fontSize: 10, marginTop: 6 }}>{c1.error}</div>}
            {y1 && (
              <div style={{ marginTop: 8 }}>
                <YearPicker years={allYears1} selected={year1 ?? y1.year} player={1} onChange={setYear1} />
                <div style={{ fontFamily: 'Share Tech Mono', fontSize: 9, color: '#555', marginTop: 4 }}>
                  {y1.currency} · ×{y1.numbersIn.toLocaleString()}
                </div>
              </div>
            )}
          </div>

          {/* Score center */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {vsFlash && bothLoaded && (
              <>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{
                    fontFamily: 'Orbitron', fontWeight: 900, fontSize: 30,
                    color: s1 > s2 ? 'var(--gold)' : 'var(--p1)',
                    textShadow: `0 0 12px ${s1 > s2 ? 'var(--gold)' : 'var(--p1)'}`,
                  }}>{s1}</span>
                  <span style={{ color: '#333', fontSize: 18 }}>:</span>
                  <span style={{
                    fontFamily: 'Orbitron', fontWeight: 900, fontSize: 30,
                    color: s2 > s1 ? 'var(--gold)' : 'var(--p2)',
                    textShadow: `0 0 12px ${s2 > s1 ? 'var(--gold)' : 'var(--p2)'}`,
                  }}>{s2}</span>
                </div>
                <div style={{ fontFamily: 'Orbitron', fontSize: 8, letterSpacing: 1 }}>
                  {s1 > s2 ? <span style={{ color: 'var(--p1)' }}>P1 SIGRAR</span>
                  : s2 > s1 ? <span style={{ color: 'var(--p2)' }}>P2 SIGRAR</span>
                  : <span style={{ color: 'var(--gold)' }}>JAFNTEFLI</span>}
                </div>
              </>
            )}
          </div>

          {/* P2 card */}
          <div style={{
            background: 'var(--bg-card)', border: '2px solid var(--p2)', borderRadius: 8,
            padding: '16px 20px', boxShadow: '0 0 16px #ff446622',
            animation: c2.ssn ? 'slide-in-right 0.4s ease-out' : 'none',
          }}>
            <div style={{ fontFamily: 'Orbitron', fontSize: 9, color: 'var(--p2)', letterSpacing: 3, marginBottom: 4 }}>PLAYER 2</div>
            <div style={{ fontSize: 17, fontWeight: 'bold', lineHeight: 1.3 }}>
              {c2.name || <span style={{ color: '#444' }}>—</span>}
            </div>
            {c2.ssn && <div style={{ fontFamily: 'Share Tech Mono', fontSize: 10, color: '#555', marginTop: 2 }}>
              KT {c2.ssn.slice(0,6)}-{c2.ssn.slice(6)}
            </div>}
            {c2.loading && <div style={{ color: 'var(--p2)', fontSize: 10, marginTop: 6, animation: 'blink 1s infinite' }}>HLEÐUR GÖGN...</div>}
            {c2.error && <div style={{ color: '#ff6666', fontSize: 10, marginTop: 6 }}>{c2.error}</div>}
            {y2 && (
              <div style={{ marginTop: 8 }}>
                <YearPicker years={allYears2} selected={year2 ?? y2.year} player={2} onChange={setYear2} />
                <div style={{ fontFamily: 'Share Tech Mono', fontSize: 9, color: '#555', marginTop: 4 }}>
                  {y2.currency} · ×{y2.numbersIn.toLocaleString()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Stats panel ── */}
      {bothLoaded && y1 && y2 && (
        <div style={{
          background: 'var(--bg-panel)', border: '1px solid #1a1a33', borderRadius: 8,
          animation: 'flash-in 0.4s ease-out',
        }}>
          {/* Tabs + Share button */}
          <div style={{ display: 'flex', borderBottom: '1px solid #1a1a33', alignItems: 'center' }}>
            {([
              ['income',   'REKSTRARREIKNINGUR'],
              ['balance',  'EFNAHAGUR'],
              ['cashflow', 'SJÓÐSTREYMI'],
              ['trends',   'ÞRÓUN'],
            ] as [Tab, string][]).map(([t, lbl]) => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '10px 16px', fontFamily: 'Orbitron', fontSize: 8, letterSpacing: 1.5,
                background: 'transparent', border: 'none', cursor: 'pointer',
                borderBottom: tab === t ? '2px solid var(--gold)' : '2px solid transparent',
                color: tab === t ? 'var(--gold)' : '#555',
                textShadow: tab === t ? '0 0 8px var(--gold)' : 'none',
                transition: 'all 0.15s',
              }}>{lbl}</button>
            ))}
            <div style={{ flex: 1 }} />
            <button
              onClick={handleShare}
              style={{
                marginRight: 12,
                padding: '5px 14px',
                fontFamily: 'Orbitron',
                fontSize: 8,
                letterSpacing: 2,
                background: copied ? '#00ff8822' : 'transparent',
                border: `1px solid ${copied ? 'var(--green)' : '#2a2a4a'}`,
                color: copied ? 'var(--green)' : '#666',
                borderRadius: 4,
                cursor: 'pointer',
                transition: 'all 0.2s',
                textShadow: copied ? '0 0 8px var(--green)' : 'none',
              }}
            >
              {copied ? '✓ COPIED' : '⇪ DEILA'}
            </button>
          </div>

          {/* Name header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 1fr', gap: 6, padding: '10px 20px 6px' }}>
            <div style={{ textAlign: 'right', fontFamily: 'Orbitron', fontSize: 10, color: 'var(--p1)', textShadow: '0 0 6px var(--p1)', letterSpacing: 1 }}>
              {c1.name.toUpperCase().slice(0, 22)} <span style={{ color: '#555', fontSize: 8 }}>({y1.year})</span>
            </div>
            <div />
            <div style={{ fontFamily: 'Orbitron', fontSize: 10, color: 'var(--p2)', textShadow: '0 0 6px var(--p2)', letterSpacing: 1 }}>
              <span style={{ color: '#555', fontSize: 8 }}>({y2.year})</span> {c2.name.toUpperCase().slice(0, 22)}
            </div>
          </div>

          <div style={{ padding: '4px 20px 20px' }}>
            {tab === 'income' && INCOME_KEYS.map(([k, inv]) => {
              const m = keys[k]
              if (!m) return null
              return <StatBar key={k}
                label={m.is} labelEn={m.en}
                value1={y1[k] as number | undefined} value2={y2[k] as number | undefined}
                currency1={y1.currency} currency2={y2.currency}
                numbersIn1={y1.numbersIn} numbersIn2={y2.numbersIn}
                invert={inv} />
            })}

            {tab === 'balance' && BALANCE_KEYS.map(([k, inv]) => {
              const m = keys[k]
              if (!m) return null
              return <StatBar key={k}
                label={m.is} labelEn={m.en}
                value1={y1[k] as number | undefined} value2={y2[k] as number | undefined}
                currency1={y1.currency} currency2={y2.currency}
                numbersIn1={y1.numbersIn} numbersIn2={y2.numbersIn}
                invert={inv} />
            })}

            {tab === 'cashflow' && CASHFLOW_KEYS.map(([k, inv]) => {
              const m = keys[k]
              if (!m) return null
              return <StatBar key={k}
                label={m.is} labelEn={m.en}
                value1={y1[k] as number | undefined} value2={y2[k] as number | undefined}
                currency1={y1.currency} currency2={y2.currency}
                numbersIn1={y1.numbersIn} numbersIn2={y2.numbersIn}
                invert={inv} />
            })}

            {tab === 'trends' && (
              <div>
                {[
                  [110000, 'Rekstrartekjur / Revenue'],
                  [910700, 'Hagnaður / Net Profit'],
                  [910400, 'EBITDA'],
                  [200000, 'Eignir / Total Assets'],
                ] .map(([k, lbl]) => (
                  <TrendChart key={k}
                    data1={c1.years} data2={c2.years}
                    name1={c1.name} name2={c2.name}
                    keyId={k as number} label={lbl as string}
                    currency1={c1.years[0]?.currency ?? ''} currency2={c2.years[0]?.currency ?? ''}
                    numbersIn1={c1.years[0]?.numbersIn ?? 1} numbersIn2={c2.years[0]?.numbersIn ?? 1}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Keldan links ── */}
      {(c1.ssn || c2.ssn) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 56px 1fr', gap: 12, marginTop: 10 }}>
          {c1.ssn
            ? <a href={`https://keldan.is/Fyrirtaeki/Yfirlit/${c1.ssn}`} target="_blank" rel="noreferrer"
                style={{ textAlign: 'center', padding: '7px', fontFamily: 'Orbitron', fontSize: 8, letterSpacing: 2,
                  color: 'var(--p1)', border: '1px solid #0d3040', borderRadius: 4, textDecoration: 'none', opacity: 0.6 }}>
                ↗ P1 Á KELDAN.IS
              </a>
            : <div />}
          <div />
          {c2.ssn
            ? <a href={`https://keldan.is/Fyrirtaeki/Yfirlit/${c2.ssn}`} target="_blank" rel="noreferrer"
                style={{ textAlign: 'center', padding: '7px', fontFamily: 'Orbitron', fontSize: 8, letterSpacing: 2,
                  color: 'var(--p2)', border: '1px solid #400d1a', borderRadius: 4, textDecoration: 'none', opacity: 0.6 }}>
                ↗ P2 Á KELDAN.IS
              </a>
            : <div />}
        </div>
      )}

      {/* ── Idle screen ── */}
      {!c1.ssn && !c2.ssn && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#444' }}>
          <div style={{ fontFamily: 'Orbitron', fontSize: 13, letterSpacing: 4, animation: 'blink 2s ease-in-out infinite', marginBottom: 16 }}>
            INSERT COIN TO CONTINUE
          </div>
          <div style={{ fontFamily: 'Share Tech Mono', fontSize: 11, lineHeight: 2, color: '#555' }}>
            Leitaðu að tveimur íslenskum fyrirtækjum hér að ofan<br/>
            Kennitala eða nafn · Gögn frá Keldan.is
          </div>
          <div style={{ marginTop: 28, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            {['Eimskip', 'Samherji', 'Marel', 'Íslandspóstur', 'Síminn', 'Norvik'].map(n => (
              <span key={n} style={{ padding: '4px 12px', border: '1px solid #1a1a33', borderRadius: 4, fontSize: 11, fontFamily: 'Share Tech Mono', color: '#444' }}>{n}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Year picker inline component ──────────────────────────
function YearPicker({ years, selected, player, onChange }: {
  years: number[], selected: number, player: 1 | 2, onChange: (y: number) => void
}) {
  const color = player === 1 ? 'var(--p1)' : 'var(--p2)'
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {years.slice(0, 7).map(y => (
        <button key={y} onClick={() => onChange(y)} style={{
          padding: '2px 8px', fontFamily: 'Orbitron', fontSize: 9, letterSpacing: 0.5,
          background: selected === y ? `${color}22` : 'transparent',
          border: `1px solid ${selected === y ? color : '#2a2a4a'}`,
          color: selected === y ? color : '#555',
          borderRadius: 3, cursor: 'pointer', transition: 'all 0.15s',
          textShadow: selected === y ? `0 0 6px ${color}` : 'none',
        }}>{y}</button>
      ))}
    </div>
  )
}
