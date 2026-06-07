import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import api from '../api/client'
import { STATUT_LABELS } from '../utils'

const LOME = [6.1375, 1.2123]

const STATUT_COLORS = {
  libre:          '#10b981',  /* émeraude logo */
  en_transaction: '#f97316',
  litige:         '#ef4444',
}

function parseGPS(str) {
  if (!str) return null
  const parts = str.split(',').map(s => parseFloat(s.trim()))
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return [parts[0], parts[1]]
  }
  return null
}

export default function Carte() {
  const [terrains, setTerrains] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/terrains/')
      .then(({ data }) => { setTerrains(data.results ?? data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const withGPS    = terrains.filter(t => parseGPS(t.coordonnees_gps))
  const withoutGPS = terrains.filter(t => !parseGPS(t.coordonnees_gps))

  return (
    <div className="page">
      <div className="page-header">
        <h2>Carte des terrains</h2>
        <div className="carte-legend">
          <span className="legend-item">
            <span className="legend-dot" style={{ background: '#10b981' }} />
            Libre
          </span>
          <span className="legend-item">
            <span className="legend-dot" style={{ background: '#f97316' }} />
            En transaction
          </span>
          <span className="legend-item">
            <span className="legend-dot" style={{ background: '#ef4444' }} />
            Litige
          </span>
        </div>
      </div>

      {loading ? (
        <p className="text-muted">Chargement…</p>
      ) : (
        <>
          <div className="carte-wrapper">
            <MapContainer
              center={LOME}
              zoom={12}
              style={{ height: '520px', width: '100%' }}
              scrollWheelZoom
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              {withGPS.map(t => {
                const pos   = parseGPS(t.coordonnees_gps)
                const color = STATUT_COLORS[t.statut] ?? '#94a3b8'
                const prop  = t.proprietaire_actuel_detail
                return (
                  <CircleMarker
                    key={t.id}
                    center={pos}
                    radius={11}
                    fillColor={color}
                    color={color}
                    fillOpacity={0.82}
                    weight={2}
                  >
                    <Popup minWidth={210}>
                      <div className="map-popup">
                        <div className="map-popup-header">
                          <strong>Terrain #{t.id}</strong>
                          <span className={`badge badge-${t.statut}`}>
                            {STATUT_LABELS[t.statut]}
                          </span>
                        </div>
                        <p className="map-popup-address">{t.adresse}</p>
                        <div className="map-popup-meta">
                          <span>{parseFloat(t.superficie).toLocaleString('fr-FR')} m²</span>
                          {prop && (
                            <span>{prop.prenom} {prop.nom}</span>
                          )}
                        </div>
                        <Link
                          to={`/terrains/${t.id}`}
                          className="btn btn-sm btn-primary"
                          style={{ marginTop: '0.5rem', display: 'inline-block' }}
                        >
                          Voir le détail
                        </Link>
                      </div>
                    </Popup>
                  </CircleMarker>
                )
              })}
            </MapContainer>
          </div>

          {withGPS.length === 0 && (
            <p className="text-muted" style={{ marginTop: '1rem' }}>
              Aucun terrain n'a de coordonnées GPS renseignées.
            </p>
          )}

          {withoutGPS.length > 0 && (
            <div className="card" style={{ marginTop: '1.5rem' }}>
              <div className="td-section-title" style={{ padding: '.75rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
                Terrains sans coordonnées GPS ({withoutGPS.length})
              </div>
              <ul className="carte-no-gps-list">
                {withoutGPS.map(t => (
                  <li key={t.id} className="carte-no-gps-item">
                    <Link to={`/terrains/${t.id}`}>{t.adresse}</Link>
                    <span className={`badge badge-${t.statut}`}>{STATUT_LABELS[t.statut]}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}
