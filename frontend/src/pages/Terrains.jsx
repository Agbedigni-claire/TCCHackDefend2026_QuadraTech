import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import TerrainDocuments from '../components/TerrainDocuments'
import TerrainForm from '../components/TerrainForm'
import { toRelativeUrl, STATUT_LABELS } from '../utils'

export default function Terrains() {
  const { user }  = useAuth()
  const [terrains, setTerrains] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [loadErr,  setLoadErr]  = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [qrModal,  setQrModal]  = useState(null)
  const [openDocs, setOpenDocs] = useState(null)

  async function load() {
    setLoadErr(false)
    try {
      const { data } = await api.get('/api/terrains/')
      setTerrains(data.results ?? data)
    } catch {
      setLoadErr(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function toggleDocs(id) {
    setOpenDocs(prev => (prev === id ? null : id))
  }

  return (
    <div className="page">

      {qrModal && (
        <div className="qr-overlay" onClick={() => setQrModal(null)}>
          <div className="qr-modal" onClick={e => e.stopPropagation()}>
            <img src={toRelativeUrl(qrModal)} alt="QR Code terrain" />
            <p className="text-muted" style={{ marginTop: '0.75rem' }}>
              Cliquer en dehors pour fermer
            </p>
          </div>
        </div>
      )}

      <div className="page-header">
        <h2>Terrains</h2>
        {user && (
          <button className="btn btn-primary" onClick={() => setShowForm(v => !v)}>
            {showForm ? 'Annuler' : '+ Nouveau terrain'}
          </button>
        )}
      </div>

      {showForm && (
        <div className="card form-card">
          <h3>Nouveau terrain</h3>
          <TerrainForm onSuccess={() => { load(); setShowForm(false) }} />
        </div>
      )}

      {loading ? (
        <p className="text-muted">Chargement…</p>
      ) : loadErr ? (
        <p className="text-muted">Impossible de charger les terrains.</p>
      ) : terrains.length === 0 ? (
        <p className="text-muted">Aucun terrain enregistré.</p>
      ) : (
        <div className="card-list">
          {terrains.map(t => (
            <div key={t.id} className="card terrain-card">
              <div className="card-header">
                <span className="card-title">{t.adresse}</span>
                <span className={`badge badge-${t.statut}`}>{STATUT_LABELS[t.statut]}</span>
              </div>

              <div className="card-body">
                <span>{parseFloat(t.superficie).toLocaleString('fr-FR')} m²</span>
                <span>{t.coordonnees_gps}</span>
                {t.proprietaire_actuel_detail && (
                  <span>
                    {t.proprietaire_actuel_detail.prenom} {t.proprietaire_actuel_detail.nom}
                  </span>
                )}
              </div>

              <div className="card-footer">
                {t.qr_code ? (
                  <img
                    src={toRelativeUrl(t.qr_code)}
                    alt="QR Code"
                    className="qr-thumbnail"
                    title="Cliquer pour agrandir"
                    onClick={() => setQrModal(t.qr_code)}
                  />
                ) : (
                  <span className="text-muted" style={{ fontSize: '.75rem' }}>Pas de QR</span>
                )}

                <Link to={`/terrains/${t.id}`} className="btn btn-sm btn-outline">
                  Détails
                </Link>

                {user && (
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={() => toggleDocs(t.id)}
                  >
                    {openDocs === t.id ? 'Masquer documents' : 'Documents'}
                  </button>
                )}
              </div>

              {openDocs === t.id && <TerrainDocuments terrainId={t.id} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
