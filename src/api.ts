import type { SearchResult, YearData, KeyMeta } from './types'

const BASE = '/api'

export async function searchCompanies(q: string): Promise<SearchResult[]> {
  const res = await fetch(`${BASE}/search?q=${encodeURIComponent(q)}`)
  const data = await res.json()
  return data.results || []
}

export interface CompanyFinancials {
  years: YearData[]
  keys: Record<string, KeyMeta>
}

export async function getCompanyData(ssn: string): Promise<CompanyFinancials | null> {
  const res = await fetch(`${BASE}/company/${ssn}/data`)
  if (!res.ok) return null
  return res.json()
}

export async function getCompanyMeta(ssn: string): Promise<{ Name: string; Ticker?: string; IsatDescription?: string } | null> {
  const res = await fetch(`${BASE}/company/${ssn}/meta`)
  if (!res.ok) return null
  return res.json()
}
