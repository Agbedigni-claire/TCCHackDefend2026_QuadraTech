import { useEffect, useRef, useState } from 'react'
import api from '../api/client'

const DOC_LABELS = {
  titre_foncier: 'Titre foncier',
  contrat:       'Contrat',
  autre:         'Autre',
}

export default function TerrainDocuments({ terrainId }) {
  const [docs,      setDocs]      = useState([])
  const [loading,   setLoading]   = useState(true)
  const [uploading, setUploading] = useState(false)
  const [err,       setErr]       = useState(null)
  const [type,      setType]      = useState('autre')
  const fileRef = useRef()

  async function loadDocs() {
    const { data } = await api.get(`/api/documents/?terrain=${terrainId}`)
    setDocs(data.results ?? data)
    setLoading(false)
  }

  useEffect(() => { loadDocs() }, [terrainId])

  async function handleUpload(e) {
    e.preventDefault()
    const file = fileRef.current?.files[0]
    if (!file) return
    setErr(null)
    setUploading(true)
    const fd = new FormData()
    fd.append('fichier',       file)
    fd.append('type_document', type)
    fd.append('terrain',       terrainId)
    try {
      await api.post('/api/documents/', fd)
      fileRef.current.value = ''
      setType('autre')
      loadDocs()
    } catch (err) {
      const d = err.response?.data
      setErr(
        d?.fichier?.[0] ?? d?.detail ?? "Erreur lors de l'upload. Vérifiez le format et la taille."
      )
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="terrain-docs">
      {loading ? (
        <p className="text-muted">Chargement…</p>
      ) : (
        <>
          <div className="docs-list">
            {docs.length === 0 && <p className="text-muted">Aucun document.</p>}
            {docs.map(doc => (
              <div key={doc.id} className="doc-item">
                <span className={`badge badge-doc badge-doc-${doc.type_document}`}>
                  {DOC_LABELS[doc.type_document]}
                </span>
                <a
                  href={doc.fichier}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="doc-link"
                >
                  {decodeURIComponent(doc.fichier.split('/').pop())}
                </a>
                <span className="text-muted doc-date">
                  {new Date(doc.date_upload).toLocaleDateString('fr-FR')}
                </span>
              </div>
            ))}
          </div>

          <form onSubmit={handleUpload} className="doc-upload">
            {err && <div className="alert alert-error">{err}</div>}
            <input
              type="file"
              ref={fileRef}
              className="form-control doc-file"
              required
            />
            <select
              className="form-control doc-type"
              value={type}
              onChange={e => setType(e.target.value)}
            >
              <option value="titre_foncier">Titre foncier</option>
              <option value="contrat">Contrat</option>
              <option value="autre">Autre</option>
            </select>
            <button type="submit" className="btn btn-sm btn-primary" disabled={uploading}>
              {uploading ? '…' : 'Ajouter'}
            </button>
          </form>
        </>
      )}
    </div>
  )
}
