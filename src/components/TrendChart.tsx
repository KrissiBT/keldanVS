import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid
} from 'recharts'
import type { YearData } from '../types'

interface Props {
  data1: YearData[]
  data2: YearData[]
  name1: string
  name2: string
  keyId: number
  label: string
  currency1: string
  currency2: string
  numbersIn1: number
  numbersIn2: number
}

function scaleVal(v: number, numbersIn: number): number {
  const actual = v * numbersIn
  return Math.round(actual / 1_000_000 * 10) / 10 // in millions, 1 decimal
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#0d0e1f', border: '1px solid #2a2a4a', borderRadius: 4,
      padding: '8px 12px', fontFamily: 'Share Tech Mono', fontSize: 12,
    }}>
      <div style={{ color: '#888', marginBottom: 4 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color }}>
          {p.name}: {p.value}M
        </div>
      ))}
    </div>
  )
}

export default function TrendChart({ data1, data2, name1, name2, keyId, label, currency1, currency2, numbersIn1, numbersIn2 }: Props) {
  // Build merged dataset by year
  const yearMap = new Map<number, { year: number; p1?: number; p2?: number }>()

  for (const d of data1) {
    if (d[keyId] !== undefined) {
      yearMap.set(d.year, { year: d.year, p1: scaleVal(d[keyId] as number, numbersIn1) })
    }
  }
  for (const d of data2) {
    if (d[keyId] !== undefined) {
      const existing = yearMap.get(d.year) ?? { year: d.year }
      yearMap.set(d.year, { ...existing, p2: scaleVal(d[keyId] as number, numbersIn2) })
    }
  }

  const chartData = Array.from(yearMap.values())
    .sort((a, b) => a.year - b.year)
    .slice(-8)

  if (chartData.length === 0) return null

  const shortName = (n: string) => n.length > 18 ? n.slice(0, 16) + '…' : n

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{
        fontFamily: 'Orbitron', fontSize: 10, color: 'var(--gold)',
        letterSpacing: 2, marginBottom: 12, textTransform: 'uppercase',
      }}>
        {label} — {currency1 === currency2 ? `M ${currency1}` : `M`}
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="#1a1a33" />
          <XAxis
            dataKey="year"
            tick={{ fill: '#666', fontFamily: 'Orbitron', fontSize: 9 }}
            axisLine={{ stroke: '#2a2a4a' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#666', fontFamily: 'Share Tech Mono', fontSize: 9 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}M`}
            width={50}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value) => (
              <span style={{ fontFamily: 'Orbitron', fontSize: 9, color: value === 'p1' ? 'var(--p1)' : 'var(--p2)' }}>
                {value === 'p1' ? shortName(name1) : shortName(name2)}
              </span>
            )}
          />
          <Line
            type="monotone"
            dataKey="p1"
            name="p1"
            stroke="var(--p1)"
            strokeWidth={2}
            dot={{ fill: 'var(--p1)', r: 3 }}
            activeDot={{ r: 5, fill: 'var(--p1)', stroke: 'var(--gold)', strokeWidth: 1 }}
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="p2"
            name="p2"
            stroke="var(--p2)"
            strokeWidth={2}
            dot={{ fill: 'var(--p2)', r: 3 }}
            activeDot={{ r: 5, fill: 'var(--p2)', stroke: 'var(--gold)', strokeWidth: 1 }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
