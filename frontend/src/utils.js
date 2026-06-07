import DOMPurify from 'dompurify'

export const toRelativeUrl = url => {
  if (!url) return null
  try { return new URL(url).pathname }
  catch { return url }
}

export const shortHash = (hash, start = 12, end = 4) =>
  hash ? `${hash.slice(0, start)}…${hash.slice(-end)}` : '—'

export const STATUT_LABELS = {
  libre:          'Libre',
  litige:         'En litige',
  en_transaction: 'En transaction',
}

// Retire tout HTML — retourne du texte brut (protection XSS)
export const sanitize = str =>
  str ? DOMPurify.sanitize(str, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }) : ''
