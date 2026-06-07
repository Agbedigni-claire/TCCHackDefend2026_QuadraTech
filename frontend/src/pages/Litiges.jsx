import { useEffect, useState } from 'react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import LitigeForm from '../components/LitigeForm'
import TerrainDocuments from '../components/TerrainDocuments'
import { toRelativeUrl } from '../utils'

export default function Litiges() {
  const { user } = useAuth()
  const isAdmin   = user?.role === 'admin'

  const [items,    setItems]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [loadErr,  setLoadErr]  = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [qrModal,  setQrModal]  = useState(null)
  const [openDocs, setOpenDocs] = useState(null)

  // Résolution
  const [resolving,   setResolving]   = useState(null)   // litige id en cours
  const [resoText,    setResoText]    = useState('')
  const [resoLoading, setResoLoading] = useState(false)
  const [resoError,   setResoError]   = useState(null)

  async function load() {
    setLoadErr(false)
    try {
      const { data } = await api.get('/api/litiges/')
      setItems(data.results ?? data)
    } catch {
      setLoadErr(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleResoudre(id) {
    if (!resoText.trim()) { setResoError('La résolution est obligatoire.'); return }
    setResoLoading(true)
    setResoError(null)
    try {
      await api.patch(`/api/litiges/${id}/resoudre/`, { resolution: resoText })
      setResolving(null)
      setResoText('')
      load()
    } catch (err) {
      const d = err.response?.data
      setResoError(d?.detail || d?.resolution?.[0] || 'Erreur lors de la résolution.')
    } finally {
      setResoLoading(false)
    }
  }

  function openResolve(id) {
    setResolving(id)
    setResoText('')
    setResoError(null)
  }

  const ouverts  = items.filter(l => l.statut === 'ouvert')
  const resolus  = items.filter(l => l.statut === 'resolu')

  function LitigeCard({ l }) {
    const qr    = l.terrain_detail?.qr_code
    const isRes = resolving === l.id

    return (
      <div className={`card litige-card litige-card-${l.statut}`}>
        <div className="card-header">
          <div className="litige-terrain-info">
            {qr && (
              <img
                src={toRelativeUrl(qr)}
                alt="QR"
                className="qr-thumb-xs"
                onClick={() => setQrModal(qr)}
              />
            )}
            <span className="card-title">
              {l.terrain_detail?.adresse ?? `Terrain #${l.terrain}`}
            </span>
          </div>
          <span className={`badge badge-litige-statut badge-${l.statut}`}>
            {l.statut === 'ouvert' ? 'Ouvert' : 'Résolu'}
          </span>
        </div>

        <div className="litige-description">{l.description}</div>

        {l.statut === 'resolu' && l.resolution && (
          <div className="litige-resolution">
            <span className="litige-resolution-label">Résolution :</span>
            {l.resolution}
            {l.date_resolution && (
              <span className="litige-resolution-date">
                {new Date(l.date_resolution).toLocaleDateString('fr-FR')}
              </span>
            )}
          </div>
        )}

        <div className="litige-meta">
          <span>
            Déclarant&nbsp;:{' '}
            {l.declarant_detail
              ? `${l.declarant_detail.prenom} ${l.declarant_detail.nom}`
              : '—'}
          </span>
          <span>{new Date(l.date_declaration).toLocaleDateString('fr-FR')}</span>

          <div style={{ display: 'flex', gap: '.5rem', marginLeft: 'auto', flexWrap: 'wrap' }}>
            {l.statut === 'ouvert' && isAdmin && (
              <button
                className="btn btn-sm btn-success"
                onClick={() => isRes ? setResolving(null) : openResolve(l.id)}
              >
                {isRes ? 'Annuler' : 'Marquer résolu'}
              </button>
            )}
            <button
              className="btn btn-sm btn-outline"
              onClick={() => setOpenDocs(prev => prev === l.id ? null : l.id)}
            >
              {openDocs === l.id ? 'Masquer documents' : 'Documents'}
            </button>
          </div>
        </div>

        {isRes && (
          <div className="litige-resolve-form">
            <textarea
              className="form-control"
              rows={3}
              placeholder="Décrivez la résolution du litige…"
              value={resoText}
              onChange={e => setResoText(e.target.value)}
            />
            {resoError && <p className="form-error">{resoError}</p>}
            <div className="form-actions" style={{ marginTop: '.5rem' }}>
              <button
                className="btn btn-sm btn-success"
                onClick={() => handleResoudre(l.id)}
                disabled={resoLoading}
              >
                {resoLoading ? 'Enregistrement…' : 'Confirmer la résolution'}
              </button>
              <button className="btn btn-sm btn-outline" onClick={() => setResolving(null)}>
                Annuler
              </button>
            </div>
          </div>
        )}

        {openDocs === l.id && <TerrainDocuments terrainId={l.terrain} />}
      </div>
    )
  }

  return (
    <div className="page">
      {qrModal && (
        <div className="qr-overlay" onClick={() => setQrModal(null)}>
          <div className="qr-modal" onClick={e => e.stopPropagation()}>
            <img src={toRelativeUrl(qrModal)} alt="QR Code terrain" />
            <p className="text-muted" style={{ marginTop: '0.75rem' }}>Cliquer en dehors pour fermer</p>
          </div>
        </div>
      )}

      <div className="page-header">
        <h2>Litiges</h2>
        {user && (
          <button className="btn btn-primary" onClick={() => setShowForm(v => !v)}>
            {showForm ? 'Annuler' : '+ Déclarer un litige'}
          </button>
        )}
      </div>

      {showForm && (
        <div className="card form-card">
          <h3>Déclarer un litige</h3>
          <LitigeForm onSuccess={() => { load(); setShowForm(false) }} />
        </div>
      )}

      {loading ? (
        <p className="text-muted">Chargement…</p>
      ) : loadErr ? (
        <p className="text-muted">Impossible de charger les litiges.</p>
      ) : items.length === 0 ? (
        <p className="text-muted">Aucun litige enregistré.</p>
      ) : (
        <>
          {ouverts.length > 0 && (
            <section className="litiges-section">
              <h3 className="litiges-section-title litiges-section-ouvert">
                Litiges ouverts ({ouverts.length})
              </h3>
              <div className="card-list">
                {ouverts.map(l => <LitigeCard key={l.id} l={l} />)}
              </div>
            </section>
          )}

          {resolus.length > 0 && (
            <section className="litiges-section">
              <h3 className="litiges-section-title litiges-section-resolu">
                Litiges résolus ({resolus.length})
              </h3>
              <div className="card-list">
                {resolus.map(l => <LitigeCard key={l.id} l={l} />)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
