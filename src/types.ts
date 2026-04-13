export interface SearchResult {
  ssn: string
  name: string
  deregistered: string
  deregisteredDate: string | null
}

export interface YearData {
  year: number
  currency: string
  numbersIn: number
  // income
  110000?: number  // Rekstrartekjur
  910200?: number  // Rekstrargjöld
  910400?: number  // EBITDA
  910500?: number  // EBIT
  910700?: number  // Hagnaður
  // balance
  200000?: number  // Eignir
  300000?: number  // Eigið fé
  400000?: number  // Skuldir
  920500?: number  // Vaxtaberandi skuldir
  224000?: number  // Handbært fé
  // cashflow
  510000?: number  // Sjóðstreymi frá rekstri
  520000?: number  // Fjárfestingarhreyfingar
  530000?: number  // Fjármögnunarhreyfingar
  [key: number]: number | string | undefined
}

export interface KeyMeta {
  is: string
  en: string
  section: 'income' | 'balance' | 'cashflow'
}

export interface CompanyData {
  ssn: string
  name: string
  years: YearData[]
  keys: Record<string, KeyMeta>
  loading: boolean
  error: string | null
}
