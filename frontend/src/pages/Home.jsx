import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import logo from '../assets/logo.jpg'

// Icônes SVG inline (Heroicons outline)
const IconMap = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
  </svg>
)
const IconChain = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>
)
const IconDoc = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)
const IconQr = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
  </svg>
)
const IconShield = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
)
const IconScale = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
  </svg>
)

const FEATURES = [
  {
    Icon: IconMap,
    title: 'Registre foncier numérique',
    desc: 'Enregistrement officiel de chaque parcelle avec coordonnées GPS, statut juridique et historique complet des propriétaires successifs.',
  },
  {
    Icon: IconChain,
    title: 'Chaîne de blocs immuable',
    desc: "Chaque transfert de propriété est horodaté et ancré dans une blockchain locale — aucune modification rétroactive n'est possible.",
  },
  {
    Icon: IconDoc,
    title: 'Archivage documentaire',
    desc: 'Titres fonciers, actes notariaux et contrats de vente sont archivés numériquement et associés à chaque dossier parcellaire.',
  },
  {
    Icon: IconQr,
    title: 'Identification par QR Code',
    desc: 'Chaque parcelle est identifiée par un QR Code unique permettant un accès instantané à la fiche officielle depuis le terrain.',
  },
  {
    Icon: IconShield,
    title: 'Détection des irrégularités',
    desc: 'Analyse automatique des transactions : double vente, cession répétée suspecte et vente simultanée sont signalées en temps réel.',
  },
  {
    Icon: IconScale,
    title: 'Suivi des contentieux',
    desc: "Déclaration et instruction des litiges fonciers avec suivi de l'état d'avancement jusqu'à la clôture du dossier.",
  },
]

export default function Home() {
  const [stats, setStats] = useState({ terrains: null, transactions: null })

  useEffect(() => {
    Promise.allSettled([
      api.get('/api/terrains/'),
      api.get('/api/transactions/'),
    ]).then(([tRes, txRes]) => {
      setStats({
        terrains:     tRes.status === 'fulfilled'  ? (tRes.value.data.count  ?? tRes.value.data.length  ?? 0) : 0,
        transactions: txRes.status === 'fulfilled' ? (txRes.value.data.count ?? txRes.value.data.length ?? 0) : 0,
      })
    })
  }, [])

  return (
    <div>
      {/* Hero */}
      <section className="home-hero">
        <div className="home-hero-inner">
          <img src={logo} alt="TrustLand" className="home-hero-logo" />
          <div className="home-hero-badge">Système de gestion foncière</div>
          <h1 className="home-hero-title">TrustLand</h1>
          <p className="home-hero-sub">
            Plateforme officielle d'enregistrement et de gestion du patrimoine foncier.
            Sécurité, traçabilité et transparence garanties par la technologie blockchain.
          </p>
          <div className="home-hero-actions">
            <Link to="/terrains" className="btn btn-primary">
              Consulter le registre
            </Link>
            <Link to="/register" className="btn btn-outline home-btn-light">
              Créer un compte
            </Link>
          </div>
        </div>
      </section>

      {/* Statistiques */}
      <section className="home-stats-bar">
        <div className="home-stats-inner">
          <div className="home-stat">
            <span className="home-stat-value">
              {stats.terrains === null ? '—' : stats.terrains.toLocaleString('fr-FR')}
            </span>
            <span className="home-stat-label">Parcelles enregistrées</span>
          </div>
          <div className="home-stat-divider" />
          <div className="home-stat">
            <span className="home-stat-value">
              {stats.transactions === null ? '—' : stats.transactions.toLocaleString('fr-FR')}
            </span>
            <span className="home-stat-label">Transactions validées</span>
          </div>
          <div className="home-stat-divider" />
          <div className="home-stat">
            <span className="home-stat-value home-stat-active">Actif</span>
            <span className="home-stat-label">Réseau blockchain</span>
          </div>
        </div>
      </section>

      {/* Fonctionnalités */}
      <section className="home-features-section">
        <div className="home-section-inner">
          <h2 className="home-section-title">Fonctionnalités principales</h2>
          <p className="home-section-sub">
            Un système intégré couvrant l'ensemble du cycle de vie d'un dossier foncier.
          </p>
          <div className="home-features-grid">
            {FEATURES.map(f => (
              <div key={f.title} className="home-feature-card">
                <div className="home-feature-icon">
                  <f.Icon />
                </div>
                <h3 className="home-feature-title">{f.title}</h3>
                <p className="home-feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Appel à l'action */}
      <section className="home-cta-section">
        <div className="home-section-inner home-cta-inner">
          <div>
            <h2 className="home-cta-title">Accès réservé aux agents habilités</h2>
            <p className="home-cta-sub">
              Connectez-vous avec vos identifiants institutionnels ou contactez votre administrateur pour obtenir un accès.
            </p>
          </div>
          <div className="home-cta-actions">
            <Link to="/login" className="btn btn-primary">
              Se connecter
            </Link>
            <Link to="/terrains" className="btn btn-outline">
              Parcourir le registre
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
