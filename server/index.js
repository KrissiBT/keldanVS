import express from 'express'

const app = express()
app.use(express.json())

const KELDAN_BASE = 'https://keldan.is'
const LMD_BASE = 'https://api.livemarketdata.com'

// Token cache — refreshes every 23h (token lasts 24h)
let lmdToken = null
let tokenFetchedAt = 0
const TOKEN_TTL_MS = 23 * 60 * 60 * 1000

async function getLmdToken() {
  const now = Date.now()
  if (lmdToken && (now - tokenFetchedAt) < TOKEN_TTL_MS) return lmdToken
  const res = await fetch(`${KELDAN_BASE}/Home/GetLiveMarketDataToken`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36' }
  })
  const data = await res.json()
  lmdToken = data.accessToken
  tokenFetchedAt = now
  console.log('Refreshed LMD token')
  return lmdToken
}

async function lmdFetch(path) {
  const token = await getLmdToken()
  const res = await fetch(`${LMD_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  return res
}

// Warm the token on startup
getLmdToken().catch(console.error)

// ── Search ────────────────────────────────────────────────
app.get('/api/search', async (req, res) => {
  const { q } = req.query
  if (!q) return res.status(400).json({ error: 'Missing query' })
  try {
    const r = await fetch(
      `${KELDAN_BASE}/Company/SearchRskConnector?searchTerm=${encodeURIComponent(q)}`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    )
    const data = await r.json()
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
})

// ── Company meta (name, ticker, industry) ─────────────────
app.get('/api/company/:id/meta', async (req, res) => {
  try {
    const r = await lmdFetch(
      `/v1/market_data/v1/company_reports/company_info_by_ssn?ssn=${req.params.id}`
    )
    const data = await r.json()
    res.json(Array.isArray(data) && data.length > 0 ? data[0] : null)
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
})

// ── All financial data (all years) ────────────────────────
app.get('/api/company/:id/data', async (req, res) => {
  try {
    const r = await lmdFetch(
      `/v1/market_data/v1/company_reports/company_multiple_reports?company_id=${req.params.id}`
    )
    if (!r.ok) return res.status(r.status).json({ error: 'upstream error' })
    const rows = await r.json()

    // Key financial metrics we care about
    const KEYS = {
      110000: { is: 'Rekstrartekjur',          en: 'Revenue',            section: 'income' },
      910200: { is: 'Rekstrargjöld',            en: 'Operating expenses', section: 'income' },
      910400: { is: 'EBITDA',                   en: 'EBITDA',             section: 'income' },
      910500: { is: 'EBIT',                     en: 'EBIT',               section: 'income' },
      910700: { is: 'Hagnaður',                 en: 'Net profit',         section: 'income' },
      200000: { is: 'Eignir',                   en: 'Total assets',       section: 'balance' },
      300000: { is: 'Eigið fé',                 en: 'Equity',             section: 'balance' },
      400000: { is: 'Skuldir',                  en: 'Liabilities',        section: 'balance' },
      920500: { is: 'Vaxtaberandi skuldir',      en: 'Interest-bearing debt', section: 'balance' },
      224000: { is: 'Handbært fé',              en: 'Cash',               section: 'balance' },
      510000: { is: 'Sjóðstreymi frá rekstri',  en: 'Cash from operations', section: 'cashflow' },
      520000: { is: 'Fjárfestingarhreyfingar',  en: 'Investing activities', section: 'cashflow' },
      530000: { is: 'Fjármögnunarhreyfingar',   en: 'Financing activities', section: 'cashflow' },
    }

    // Group by year, pick the values for our key metrics
    const byYear = {}
    for (const row of rows) {
      if (!KEYS[row.KeyId]) continue
      const yr = row.FiscalYear
      if (!byYear[yr]) {
        byYear[yr] = {
          year: yr,
          currency: row.Currency,
          numbersIn: row.NumbersIn,
        }
      }
      byYear[yr][row.KeyId] = row.KeyValue
    }

    const years = Object.values(byYear).sort((a, b) => b.year - a.year)
    res.json({ years, keys: KEYS })
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
})

const PORT = 3001
app.listen(PORT, () => console.log(`Keldan VS server → http://localhost:${PORT}`))
