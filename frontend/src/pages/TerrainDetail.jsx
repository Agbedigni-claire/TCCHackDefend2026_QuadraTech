import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api/client'
import TerrainDocuments from '../components/TerrainDocuments'
import { useAuth } from '../context/AuthContext'
import { toRelativeUrl, STATUT_LABELS } from '../utils'

// ── Icônes SVG pour la timeline ─────────────────────────────────────────────
const IconTransaction = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
  </svg>
)
const IconLitige = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z" />
  </svg>
)
const IconLitigeResolu = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)
const IconAlerte = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
  </svg>
)
const IconDocument = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
)

const TIMELINE_CONFIG = {
  transaction:    { icon: <IconTransaction />,    label: 'Transaction',      color: '#2563eb' },
  litige:         { icon: <IconLitige />,         label: 'Litige déclaré',   color: '#ef4444' },
  litige_resolu:  { icon: <IconLitigeResolu />,   label: 'Litige résolu',    color: '#16a34a' },
  alerte:         { icon: <IconAlerte />,         label: 'Alerte IA',        color: '#f97316' },
  document:       { icon: <IconDocument />,       label: 'Document',         color: '#64748b' },
}

const NIVEAU_COLORS = { faible: '#86efac', moyen: '#fbbf24', critique: '#ef4444' }

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}
function fmtDatetime(iso) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ── Composant Timeline ───────────────────────────────────────────────────────
function Timeline({ events }) {
  if (events.length === 0) {
    return <p className="text-muted" style={{ padding: '1rem' }}>Aucun événement enregistré.</p>
  }
  return (
    <div className="timeline">
      {events.map((ev, i) => {
        const cfg = TIMELINE_CONFIG[ev.type] ?? { icon: null, label: ev.type, color: '#94a3b8' }
        return (
          <div key={i} className="timeline-item">
            <div className="timeline-left">
              <div className="timeline-icon-wrap" style={{ background: cfg.color + '22', borderColor: cfg.color, color: cfg.color }}>
                {cfg.icon}
              </div>
              {i < events.length - 1 && <div className="timeline-line" />}
            </div>
            <div className="timeline-body">
              <div className="timeline-meta">
                <span className="timeline-type" style={{ color: cfg.color }}>{cfg.label}</span>
                <span className="timeline-date">{fmtDatetime(ev.date)}</span>
              </div>
              <TimelineContent ev={ev} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function TimelineContent({ ev }) {
  switch (ev.type) {
    case 'transaction':
      return (
        <div className="tl-detail">
          <p><strong>{ev.vendeur}</strong> &rarr; <strong>{ev.acheteur}</strong></p>
          <p className="text-muted">{parseFloat(ev.montant).toLocaleString('fr-FR')} FCFA</p>
          {ev.bloc_index != null && (
            <p className="text-muted" style={{ fontSize: '.78rem' }}>
              Bloc #{ev.bloc_index} · hash {ev.bloc_hash}
            </p>
          )}
        </div>
      )
    case 'litige':
      return (
        <div className="tl-detail">
          <p>{ev.description}</p>
          <p className="text-muted">Déclarant : {ev.declarant}</p>
        </div>
      )
    case 'litige_resolu':
      return (
        <div className="tl-detail">
          <p>{ev.resolution}</p>
        </div>
      )
    case 'alerte':
      return (
        <div className="tl-detail">
          <p>
            <span
              className="badge"
              style={{ background: NIVEAU_COLORS[ev.niveau] + '33', color: NIVEAU_COLORS[ev.niveau], border: `1px solid ${NIVEAU_COLORS[ev.niveau]}` }}
            >
              {ev.niveau}
            </span>
            {' '}{ev.type_alerte?.replace('_', ' ')}
          </p>
          <p className="text-muted">{ev.description}</p>
        </div>
      )
    case 'document':
      return (
        <div className="tl-detail">
          <p>{ev.type_document}</p>
          <p className="text-muted" style={{ fontSize: '.78rem' }}>{ev.nom_fichier}</p>
        </div>
      )
    default:
      return null
  }
}

// ── Composant Litiges d'un terrain ───────────────────────────────────────────
function TerrainLitiges({ terrainId }) {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [litiges, setLitiges] = useState([])
  const [loading, setLoading] = useState(true)
  const [resolving, setResolving] = useState(null)
  const [resoText, setResoText] = useState('')
  const [resoErr, setResoErr] = useState(null)
  const [resoLoading, setResoLoading] = useState(false)

  async function load() {
    try {
      const { data } = await api.get(`/api/terrains/${terrainId}/litiges/`)
      setLitiges(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [terrainId])

  async function handleResoudre(id) {
    if (!resoText.trim()) { setResoErr('La résolution est obligatoire.'); return }
    setResoLoading(true)
    setResoErr(null)
    try {
      await api.patch(`/api/litiges/${id}/resoudre/`, { resolution: resoText })
      setResolving(null)
      setResoText('')
      load()
    } catch (err) {
      const d = err.response?.data
      setResoErr(d?.detail || d?.resolution?.[0] || 'Erreur.')
    } finally {
      setResoLoading(false)
    }
  }

  if (loading) return <p className="text-muted">Chargement…</p>
  if (litiges.length === 0) return <p className="text-muted">Aucun litige pour ce terrain.</p>

  return (
    <div className="card-list">
      {litiges.map(l => (
        <div key={l.id} className={`card litige-card litige-card-${l.statut}`}>
          <div className="card-header">
            <span className="card-title">{l.description.slice(0, 60)}{l.description.length > 60 ? '…' : ''}</span>
            <span className={`badge badge-${l.statut}`}>{l.statut === 'ouvert' ? 'Ouvert' : 'Résolu'}</span>
          </div>
          <div className="litige-meta">
            <span>Déclarant : {l.declarant_detail ? `${l.declarant_detail.prenom} ${l.declarant_detail.nom}` : '—'}</span>
            <span>{fmtDate(l.date_declaration)}</span>
            {l.statut === 'ouvert' && isAdmin && (
              <button
                className="btn btn-sm btn-success"
                style={{ marginLeft: 'auto' }}
                onClick={() => resolving === l.id ? setResolving(null) : (setResolving(l.id), setResoText(''), setResoErr(null))}
              >
                {resolving === l.id ? 'Annuler' : 'Marquer résolu'}
              </button>
            )}
          </div>
          {l.statut === 'resolu' && l.resolution && (
            <div className="litige-resolution">
              <span className="litige-resolution-label">Résolution :</span>
              {l.resolution}
              {l.date_resolution && (
                <span className="litige-resolution-date">{fmtDate(l.date_resolution)}</span>
              )}
            </div>
          )}
          {resolving === l.id && (
            <div className="litige-resolve-form">
              <textarea
                className="form-control"
                rows={3}
                placeholder="Décrivez la résolution du litige…"
                value={resoText}
                onChange={e => setResoText(e.target.value)}
              />
              {resoErr && <p className="form-error">{resoErr}</p>}
              <div className="form-actions" style={{ marginTop: '.5rem' }}>
                <button className="btn btn-sm btn-success" onClick={() => handleResoudre(l.id)} disabled={resoLoading}>
                  {resoLoading ? 'Enregistrement…' : 'Confirmer'}
                </button>
                <button className="btn btn-sm btn-outline" onClick={() => setResolving(null)}>Annuler</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Page principale ──────────────────────────────────────────────────────────
export default function TerrainDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [terrain,     setTerrain]     = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [qrOpen,      setQrOpen]      = useState(false)
  const [certLoading, setCertLoading] = useState(false)
  const [activeTab,   setActiveTab]   = useState('informations')
  const [historique,  setHistorique]  = useState(null)
  const [histLoading, setHistLoading] = useState(false)
  const [histErr,     setHistErr]     = useState(false)

  useEffect(() => {
    api.get(`/api/terrains/${id}/`)
      .then(({ data }) => { setTerrain(data); setLoading(false) })
      .catch(() => { setError('Terrain introuvable ou accès refusé.'); setLoading(false) })
  }, [id])

  useEffect(() => {
    if (activeTab === 'historique' && historique === null && !histErr) {
      setHistLoading(true)
      api.get(`/api/terrains/${id}/historique/`)
        .then(({ data }) => setHistorique(data))
        .catch(() => setHistErr(true))
        .finally(() => setHistLoading(false))
    }
  }, [activeTab, id, historique, histErr])

  async function downloadCertificat() {
    setCertLoading(true)
    try {
      const { data } = await api.get(`/api/terrains/${id}/certificat/`, { responseType: 'blob' })
      const url  = window.URL.createObjectURL(new Blob([data], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href  = url
      link.download = `certificat-${terrain.id_unique}.pdf`
      link.click()
      window.URL.revokeObjectURL(url)
    } catch { /* silent */ }
    finally { setCertLoading(false) }
  }

  if (loading) return <div className="page"><p className="text-muted">Chargement…</p></div>
  if (error)   return (
    <div className="page">
      <p className="text-muted">{error}</p>
      <button className="btn btn-outline" style={{ marginTop: '.75rem' }} onClick={() => navigate(-1)}>← Retour</button>
    </div>
  )

  const qrUrl = toRelativeUrl(terrain.qr_code)
  const prop  = terrain.proprietaire_actuel_detail

  const TABS = [
    { key: 'informations', label: 'Informations' },
    { key: 'litiges',      label: 'Litiges' },
    { key: 'historique',   label: 'Historique' },
    { key: 'documents',    label: 'Documents' },
  ]

  return (
    <div className="page">
      {qrOpen && (
        <div className="qr-overlay" onClick={() => setQrOpen(false)}>
          <div className="qr-modal" onClick={e => e.stopPropagation()}>
            <img src={qrUrl} alt="QR Code" />
            <p className="text-muted" style={{ marginTop: '.75rem' }}>Cliquer en dehors pour fermer</p>
          </div>
        </div>
      )}

      {/* En-tête */}
      <div className="page-header">
        <div>
          <button className="btn btn-sm btn-outline" style={{ marginBottom: '.5rem' }} onClick={() => navigate(-1)}>
            ← Retour
          </button>
          <h2 style={{ fontSize: '1.25rem' }}>{terrain.adresse}</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', flexWrap: 'wrap' }}>
          <span className={`badge badge-${terrain.statut}`} style={{ fontSize: '.82rem' }}>
            {STATUT_LABELS[terrain.statut]}
          </span>
          {user && (
            <button className="btn btn-sm btn-primary" onClick={downloadCertificat} disabled={certLoading}>
              {certLoading ? 'Génération…' : 'Télécharger certificat PDF'}
            </button>
          )}
        </div>
      </div>

      {/* Onglets */}
      <div className="td-tabs">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`td-tab${activeTab === t.key ? ' td-tab-active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Onglet : Informations */}
      {activeTab === 'informations' && (
        <div className="td-layout">
          <div className="card td-info">
            <div className="td-section-title">Informations</div>
            <dl className="td-grid">
              <dt>Superficie</dt>
              <dd>{parseFloat(terrain.superficie).toLocaleString('fr-FR')} m²</dd>
              <dt>Coordonnées GPS</dt>
              <dd><code>{terrain.coordonnees_gps}</code></dd>
              <dt>Identifiant unique</dt>
              <dd><code style={{ fontSize: '.7rem', wordBreak: 'break-all' }}>{terrain.id_unique}</code></dd>
              <dt>Enregistré le</dt>
              <dd>{new Date(terrain.date_enregistrement).toLocaleDateString('fr-FR')}</dd>
              {prop && (
                <>
                  <dt>Propriétaire</dt>
                  <dd>
                    <strong>{prop.prenom} {prop.nom}</strong>
                    <br />
                    <span style={{ fontSize: '.8rem', color: 'var(--muted)' }}>{prop.email}</span>
                    {prop.telephone && (
                      <> · <span style={{ fontSize: '.8rem', color: 'var(--muted)' }}>{prop.telephone}</span></>
                    )}
                  </dd>
                </>
              )}
            </dl>
          </div>

          <div className="card td-qr">
            <div className="td-section-title">QR Code</div>
            {qrUrl ? (
              <div className="td-qr-wrap">
                <img src={qrUrl} alt="QR Code terrain" className="td-qr-img" title="Cliquer pour agrandir" onClick={() => setQrOpen(true)} />
                <p className="text-muted" style={{ fontSize: '.72rem', marginTop: '.5rem', textAlign: 'center' }}>Cliquer pour agrandir</p>
                <a href={qrUrl} download={`terrain-${terrain.id_unique}.png`} className="btn btn-sm btn-outline" style={{ marginTop: '.75rem' }}>
                  Télécharger
                </a>
              </div>
            ) : (
              <p className="text-muted" style={{ fontSize: '.82rem' }}>Non généré</p>
            )}
          </div>
        </div>
      )}

      {/* Onglet : Litiges */}
      {activeTab === 'litiges' && (
        <div style={{ marginTop: '.5rem' }}>
          <TerrainLitiges terrainId={terrain.id} />
        </div>
      )}

      {/* Onglet : Historique */}
      {activeTab === 'historique' && (
        <div className="card" style={{ marginTop: '.5rem', padding: '1.25rem' }}>
          {histLoading ? (
            <p className="text-muted">Chargement de l'historique…</p>
          ) : histErr ? (
            <p className="text-muted">Connectez-vous pour consulter l'historique de ce terrain.</p>
          ) : (
            <Timeline events={historique ?? []} />
          )}
        </div>
      )}

      {/* Onglet : Documents */}
      {activeTab === 'documents' && (
        <div className="card" style={{ overflow: 'hidden', marginTop: '.5rem' }}>
          <div className="td-section-title" style={{ padding: '.875rem 1.25rem .5rem', borderBottom: '1px solid var(--border)', marginBottom: 0 }}>
            Documents du terrain
          </div>
          {user ? (
            <TerrainDocuments terrainId={terrain.id} />
          ) : (
            <p className="text-muted" style={{ padding: '1rem 1.25rem' }}>
              Connectez-vous pour consulter et ajouter des documents.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
