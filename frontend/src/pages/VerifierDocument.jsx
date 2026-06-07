import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import { STATUT_LABELS } from '../utils'

const IconOk = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="36" height="36">
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const IconKo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="36" height="36">
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
  </svg>
)

export default function VerifierDocument() {
  const [fichier, setFichier] = useState(null)
  const [result,  setResult]  = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!fichier) return
    setLoading(true)
    setResult(null)
    setError(null)

    const form = new FormData()
    form.append('fichier', fichier)

    try {
      const { data } = await api.post('/api/documents/verifier/', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setResult(data)
    } catch {
      setError('Erreur lors de la vérification. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>Vérification d'authenticité</h2>
      </div>

      <div className="card form-card verif-form-card">
        <h3>Vérifier un document</h3>
        <p className="text-muted" style={{ fontSize: '.85rem', marginBottom: '1.25rem' }}>
          Déposez un document (PDF, image) pour vérifier s'il a été enregistré
          dans le registre foncier TrustLand. La vérification se base sur
          l'empreinte cryptographique (SHA-256) du fichier.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Fichier à vérifier</label>
            <input
              type="file"
              className="form-control"
              accept=".pdf,.jpg,.jpeg,.png,.tif,.tiff"
              required
              onChange={e => { setFichier(e.target.files[0]); setResult(null); setError(null) }}
            />
            <span className="form-hint">Formats acceptés : PDF, JPG, PNG, TIFF — max 10 Mo</span>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={loading || !fichier}>
              {loading ? 'Vérification en cours…' : 'Vérifier l\'authenticité'}
            </button>
          </div>
        </form>

        {error && <div className="alert alert-error" style={{ marginTop: '1rem' }}>{error}</div>}

        {result && (
          <div className={`verif-result ${result.authentique ? 'verif-ok' : 'verif-ko'}`}>
            {result.authentique ? (
              <>
                <div className="verif-icon verif-icon-ok"><IconOk /></div>
                <h4>Document authentique</h4>
                <p className="text-muted">
                  Ce document a bien été enregistré dans le registre TrustLand.
                </p>
                {result.type_document && (
                  <p style={{ fontSize: '.85rem' }}>
                    Type : <strong>{result.type_document}</strong>
                  </p>
                )}
                {result.terrain && (
                  <div className="verif-terrain-card">
                    <div className="verif-terrain-row">
                      <span className="verif-terrain-label">Terrain</span>
                      <span>{result.terrain.adresse}</span>
                    </div>
                    <div className="verif-terrain-row">
                      <span className="verif-terrain-label">Superficie</span>
                      <span>{parseFloat(result.terrain.superficie).toLocaleString('fr-FR')} m²</span>
                    </div>
                    <div className="verif-terrain-row">
                      <span className="verif-terrain-label">Statut</span>
                      <span className={`badge badge-${result.terrain.statut}`}>
                        {STATUT_LABELS[result.terrain.statut]}
                      </span>
                    </div>
                    {result.terrain.proprietaire_actuel_detail && (
                      <div className="verif-terrain-row">
                        <span className="verif-terrain-label">Propriétaire</span>
                        <span>
                          {result.terrain.proprietaire_actuel_detail.prenom}{' '}
                          {result.terrain.proprietaire_actuel_detail.nom}
                        </span>
                      </div>
                    )}
                    <Link
                      to={`/terrains/${result.terrain.id}`}
                      className="btn btn-sm btn-primary"
                      style={{ marginTop: '0.875rem', display: 'inline-block' }}
                    >
                      Voir le terrain
                    </Link>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="verif-icon verif-icon-ko"><IconKo /></div>
                <h4>Document non reconnu</h4>
                <p className="text-muted">
                  Aucune correspondance trouvée dans le registre TrustLand.
                  Ce document n'a pas été enregistré ou a été modifié.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
