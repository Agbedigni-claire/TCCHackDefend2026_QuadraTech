# TrustLand — Registre Foncier Numérique

Plateforme de gestion et de traçabilité des droits fonciers pour la République du Togo.  
TrustLand numérise l'enregistrement des terrains, la chaîne des transactions, la détection de fraude et la certification PDF avec QR code, le tout sécurisé par une blockchain locale et un chiffrement des données sensibles.

---

## Table des matières

1. [Présentation](#1-présentation)
2. [Architecture](#2-architecture)
3. [Stack technique](#3-stack-technique)
4. [Structure du projet](#4-structure-du-projet)
5. [Prérequis](#5-prérequis)
6. [Installation](#6-installation)
7. [Configuration (.env)](#7-configuration-env)
8. [Démarrage](#8-démarrage)
9. [API — Endpoints](#9-api--endpoints)
10. [Rôles et permissions](#10-rôles-et-permissions)
11. [Sécurité](#11-sécurité)
12. [Blockchain locale](#12-blockchain-locale)
13. [Détection de fraude](#13-détection-de-fraude)
14. [Notifications push (mobile)](#14-notifications-push-mobile)
15. [Commandes de gestion](#15-commandes-de-gestion)
16. [Tests et vérifications](#16-tests-et-vérifications)
17. [Déploiement en production](#17-déploiement-en-production)
18. [Contexte académique](#18-contexte-académique)

---

## 1. Présentation

TrustLand répond au problème de l'insécurité foncière au Togo : registres papier perdus, transactions frauduleuses, litiges non traçables. La plateforme propose :

- **Registre numérique** : chaque terrain possède un identifiant UUID unique et un QR code.
- **Traçabilité complète** : toute transaction est horodatée et liée à un bloc de la chaîne interne.
- **Détection de fraude automatique** : règles métier appliquées à chaque nouvelle transaction.
- **Certification PDF** : certificat de propriété généré à la demande avec signature blockchain.
- **Application mobile** (Expo) : consultation et notifications push pour les agents terrain.

---

## 2. Architecture

```
┌──────────────────────────────────────────────────────┐
│                     Clients                          │
│  Navigateur (React 19)   │   Mobile (Expo)           │
│  Cookie httpOnly JWT      │   Bearer header + SecureStore│
└────────────┬─────────────┴──────────────┬────────────┘
             │ HTTPS / CORS               │ HTTPS
             ▼                            ▼
┌──────────────────────────────────────────────────────┐
│             Django 6 + DRF 3.17                      │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │  App users  │  │   App api    │  │  Middleware  │ │
│  │  JWT auth   │  │  Métier +    │  │  AuditLog   │ │
│  │  RBAC       │  │  Blockchain  │  │  CORS / CSRF│ │
│  └─────────────┘  └──────────────┘  └─────────────┘ │
└───────────────────────────┬──────────────────────────┘
                            │
             ┌──────────────┴──────────────┐
             ▼                             ▼
    ┌────────────────┐           ┌──────────────────┐
    │  PostgreSQL     │           │  Système de       │
    │  trustland_db   │           │  fichiers media/  │
    │  (Fernet enc.) │           │  (QR codes, PDF)  │
    └────────────────┘           └──────────────────┘
```

---

## 3. Stack technique

| Couche | Technologie | Version |
|--------|-------------|---------|
| Backend | Django | 6.0.6 |
| API REST | Django REST Framework | 3.17.1 |
| Authentification | djangorestframework-simplejwt | 5.5.1 |
| Base de données | PostgreSQL | ≥ 14 |
| Cache / rate-limit | LocMemCache (dev) · Redis (prod) | — |
| Chiffrement champs | cryptography (Fernet) | ≥ 42.0 |
| PDF | ReportLab | ≥ 4.0 |
| QR Code | qrcode + Pillow | 8.2 / 12.x |
| Frontend | React + Vite | 19.x / 8.x |
| Routing frontend | react-router-dom | 7.x |
| HTTP client | axios | 1.x |
| Cartes | react-leaflet | 5.x |
| Graphiques | recharts | 3.x |
| Sanitisation HTML | DOMPurify | 3.x |
| Mobile | Expo (React Native) | SDK 56 |
| Stockage token mobile | expo-secure-store | — |

---

## 4. Structure du projet

```
TrustLand/
├── backend/
│   ├── config/
│   │   ├── settings.py        # Configuration centrale
│   │   ├── urls.py            # Routage principal
│   │   └── wsgi.py
│   ├── api/
│   │   ├── models.py          # Proprietaire, Terrain, Transaction, Litige,
│   │   │                      # Alerte, Document, Bloc, JournalAudit, PushToken
│   │   ├── views.py           # ViewSets + vues spéciales (PDF, stats, blockchain)
│   │   ├── serializers.py     # Sérialisation + validation (magic bytes)
│   │   ├── permissions.py     # IsAdmin, IsAdminOrAgent, …
│   │   ├── authentication.py  # CookieJWTAuthentication (cookie + header)
│   │   ├── blockchain.py      # ajouter_bloc / verifier_chaine
│   │   ├── fraude.py          # Détection automatique (3 règles)
│   │   ├── middleware.py      # AuditLogMiddleware
│   │   ├── push_service.py    # Notifications Expo Push
│   │   └── migrations/        # 0001 → 0007
│   ├── users/
│   │   ├── models.py          # Utilisateur (AbstractUser + rôle + signal)
│   │   ├── views.py           # Login, Logout, Register, Me, …
│   │   ├── serializers.py     # TokenPair, Register, AdminCreate, …
│   │   ├── urls.py
│   │   └── management/commands/
│   │       ├── createadmin.py
│   │       └── deleteadmins.py
│   ├── logs/
│   │   └── security.log       # Fichier de logs rotatif (5 Mo × 5)
│   ├── media/                 # Fichiers uploadés (QR codes, documents)
│   ├── .env                   # Secrets locaux — NON versionné
│   ├── .env.example           # Modèle documenté
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── api/client.js      # Instance axios (withCredentials, interceptors)
│       ├── context/
│       │   └── AuthContext.jsx # Session, refresh proactif, inactivité
│       ├── components/
│       │   ├── Navbar.jsx
│       │   ├── ProtectedRoute.jsx
│       │   ├── SessionWarning.jsx
│       │   ├── TerrainForm.jsx
│       │   ├── TerrainDocuments.jsx
│       │   ├── TransactionForm.jsx
│       │   └── LitigeForm.jsx
│       ├── pages/
│       │   ├── Dashboard.jsx   # Statistiques globales + graphiques
│       │   ├── Carte.jsx       # Carte Leaflet des terrains
│       │   ├── Terrains.jsx    # Liste + filtres
│       │   ├── TerrainDetail.jsx # 4 onglets + timeline chronologique
│       │   ├── Proprietaires.jsx
│       │   ├── Transactions.jsx
│       │   ├── Litiges.jsx
│       │   ├── Blockchain.jsx  # Visualisation de la chaîne
│       │   ├── Alertes.jsx     # Alertes fraude
│       │   ├── VerifierDocument.jsx # Vérification SHA-256
│       │   ├── ProfilUtilisateur.jsx
│       │   ├── GestionUtilisateurs.jsx # Admin RBAC
│       │   ├── Login.jsx
│       │   └── Register.jsx
│       └── utils.js            # DOMPurify, helpers
├── mobile/                    # Application Expo (React Native)
│   └── src/context/
│       └── AuthContext.jsx    # SecureStore + Bearer header
├── .gitignore
└── README.md
```

---

## 5. Prérequis

- **Python** 3.12+
- **Node.js** 20+
- **PostgreSQL** 14+
- **Redis** 7+ (optionnel en développement, requis en production)
- **Git**

---

## 6. Installation

### Backend

```bash
# 1. Cloner le dépôt
git clone <url-du-depot>
cd TrustLand

# 2. Créer et activer l'environnement virtuel
python -m venv venv
# Windows :
venv\Scripts\activate
# Linux / macOS :
source venv/bin/activate

# 3. Installer les dépendances
pip install -r backend/requirements.txt

# 4. Configurer les secrets (voir section 7)
cp backend/.env.example backend/.env
# Éditer backend/.env avec les vraies valeurs

# 5. Créer la base de données PostgreSQL
psql -U postgres -c "CREATE DATABASE trustland_db;"
psql -U postgres -c "CREATE USER trustland_user WITH PASSWORD 'votre-mot-de-passe';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE trustland_db TO trustland_user;"

# 6. Appliquer les migrations
cd backend
python manage.py migrate

# 7. Créer le premier compte admin
python manage.py createadmin --password=VotreMotDePasseAdmin
```

### Frontend

```bash
cd frontend
npm install
```

---

## 7. Configuration (.env)

Copier `backend/.env.example` en `backend/.env` et renseigner chaque variable :

```env
# Clé secrète Django — générer avec :
# python -c "import secrets, string; chars=string.ascii_letters+string.digits+'_-+!@%^&*'; print(''.join(secrets.choice(chars) for _ in range(64)))"
SECRET_KEY=REMPLACER

DEBUG=True

ALLOWED_HOSTS=localhost,127.0.0.1

# Origines CORS autorisées (frontend React)
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# Base de données PostgreSQL
DB_NAME=trustland_db
DB_USER=trustland_user
DB_PASSWORD=MOT-DE-PASSE-FORT
DB_HOST=localhost
DB_PORT=5432

# Chiffrement Fernet des champs sensibles (téléphone, numéro d'identité)
# Générer avec :
# python -c "import base64, os; print(base64.urlsafe_b64encode(os.urandom(32)).decode())"
# ATTENTION : changer cette clé invalide les données chiffrées existantes en base.
FIELD_ENCRYPTION_KEY=REMPLACER

# URL publique (intégrée dans les QR codes des terrains)
SITE_URL=https://trustland.tg

# Redis pour le rate-limiting multi-workers (laisser vide en dev → LocMemCache)
# Exemple : redis://localhost:6379/1
REDIS_URL=
```

> **Sécurité** : le fichier `.env` est listé dans `.gitignore` et ne doit jamais être commité.

---

## 8. Démarrage

### Développement

Ouvrir deux terminaux :

```bash
# Terminal 1 — Backend
cd backend
python manage.py runserver
# → http://localhost:8000

# Terminal 2 — Frontend
cd frontend
npm run dev
# → http://localhost:5173
```

### Production (exemple avec Gunicorn + Nginx)

```bash
# Backend
gunicorn config.wsgi:application --workers 4 --bind 0.0.0.0:8000

# Collecter les fichiers statiques
python manage.py collectstatic --noinput
```

Configurer Nginx pour servir le frontend buildé et proxifier `/api/` vers Gunicorn.

```bash
# Frontend — build de production
cd frontend
npm run build
# → dist/ à servir par Nginx
```

---

## 9. API — Endpoints

### Authentification

| Méthode | URL | Description | Accès |
|---------|-----|-------------|-------|
| `POST` | `/api/token/` | Connexion — retourne access + refresh en cookies httpOnly | Public |
| `POST` | `/api/token/refresh/` | Renouvelle le token access (cookie ou body) | Public |
| `POST` | `/api/users/logout/` | Invalide le refresh token + supprime les cookies | Authentifié |
| `POST` | `/api/users/register/` | Inscription (rôle `proprietaire` uniquement) | Public |
| `GET/PATCH` | `/api/users/me/` | Profil de l'utilisateur connecté | Authentifié |
| `POST` | `/api/users/changer-mot-de-passe/` | Changement de mot de passe | Authentifié |

### Gestion des utilisateurs (admin)

| Méthode | URL | Description |
|---------|-----|-------------|
| `GET/POST` | `/api/users/utilisateurs/` | Liste + création (tous rôles) |
| `GET/PATCH/DELETE` | `/api/users/utilisateurs/<id>/` | Détail, modification, suppression |

### Registre foncier

| Méthode | URL | Description | Accès |
|---------|-----|-------------|-------|
| `GET/POST` | `/api/proprietaires/` | Liste + création | Admin, Agent |
| `GET/PUT/PATCH/DELETE` | `/api/proprietaires/<id>/` | Détail | Admin, Agent |
| `GET` | `/api/terrains/` | Liste (filtrée par rôle) | Authentifié |
| `POST` | `/api/terrains/` | Création (QR code auto-généré) | Admin, Agent |
| `GET` | `/api/terrains/<id>/certificat/` | Certificat PDF | Admin, Agent, Propriétaire (son terrain) |
| `GET` | `/api/terrains/<id>/historique/` | Timeline chronologique | Authentifié |
| `GET` | `/api/terrains/<id>/litiges/` | Litiges du terrain | Authentifié |
| `GET/POST` | `/api/documents/` | Documents fonciers | Admin, Agent |
| `DELETE` | `/api/documents/<id>/` | Suppression | Admin uniquement |
| `POST` | `/api/documents/verifier/` | Vérification d'authenticité (SHA-256) | Authentifié |

### Transactions et litiges

| Méthode | URL | Description | Accès |
|---------|-----|-------------|-------|
| `GET/POST` | `/api/transactions/` | Historique + nouvelle transaction | Admin, Agent |
| `GET/POST` | `/api/litiges/` | Litiges (propriétaires peuvent déclarer) | Authentifié |
| `PATCH` | `/api/litiges/<id>/resoudre/` | Résolution officielle | Admin |
| `GET` | `/api/alertes/` | Alertes de fraude | Admin, Agent |

### Blockchain et statistiques

| Méthode | URL | Description | Accès |
|---------|-----|-------------|-------|
| `GET` | `/api/blockchain/` | Liste des blocs | Authentifié |
| `GET` | `/api/blockchain/verifier/` | Vérification de l'intégrité | Admin |
| `GET` | `/api/stats/` | Statistiques globales (dashboard) | Authentifié |

### Mobile

| Méthode | URL | Description |
|---------|-----|-------------|
| `POST` | `/api/push-token/` | Enregistrement du token Expo Push |
| `DELETE` | `/api/push-token/` | Suppression du token |

---

## 10. Rôles et permissions

TrustLand utilise un système RBAC à 3 niveaux, synchronisé avec les flags Django natifs (`is_staff`, `is_superuser`) via un signal `pre_save` automatique.

| Rôle | Valeur | is_staff | is_superuser | Accès |
|------|--------|----------|--------------|-------|
| **Administrateur** | `admin` | ✅ | ✅ | Accès complet, interface Django `/admin/` |
| **Agent** | `agent` | ❌ | ❌ | Lecture + écriture registre, pas de suppression document |
| **Propriétaire** | `proprietaire` | ❌ | ❌ | Ses terrains, ses transactions, déclarer un litige |

### Règles notables

- L'inscription publique (`/api/users/register/`) crée **uniquement** des comptes `proprietaire`.
- Les comptes `agent` et `admin` sont créés par un administrateur via l'interface ou la commande `createadmin`.
- Un admin ne peut pas modifier son propre rôle ni supprimer son propre compte.
- Le champ `role` est interdit en écriture via `PATCH /api/users/me/` (défense en profondeur).

---

## 11. Sécurité

### Authentification JWT par cookies httpOnly

Les tokens JWT ne sont **jamais stockés dans `localStorage`** (vulnérable au XSS).  
Le navigateur web utilise des cookies `httpOnly` posés par le serveur :

| Cookie | Contenu | Attributs |
|--------|---------|-----------|
| `trustland_access` | Token d'accès (60 min) | `httpOnly`, `SameSite=Lax`, `Secure` (prod) |
| `trustland_refresh` | Token de rafraîchissement (1 jour) | `httpOnly`, `SameSite=Lax`, `Secure` (prod) |

L'application mobile (Expo) continue d'utiliser le header `Authorization: Bearer` avec `expo-secure-store`.  
La classe `CookieJWTAuthentication` accepte les deux modes (header prioritaire).

### Refresh silencieux

Le frontend React renouvelle automatiquement le token d'accès **5 minutes avant son expiration** (toutes les 55 minutes). En cas d'inactivité de 30 minutes, un modal d'avertissement apparaît à 25 minutes, puis déconnexion automatique.

### Chiffrement des données sensibles

Les champs `telephone` et `numero_identite` de chaque propriétaire sont chiffrés en base de données avec **Fernet** (AES-128-CBC + HMAC-SHA256) via un `EncryptedField` Django personnalisé.

```bash
# Générer une clé Fernet valide
python -c "import base64, os; print(base64.urlsafe_b64encode(os.urandom(32)).decode())"
```

### Rate limiting

| Scope | Limite | Cible |
|-------|--------|-------|
| `login` | 5 / minute | `POST /api/token/` |
| `transaction` | 30 / heure | `POST /api/transactions/` |
| `anon` | 20 / minute | Toute requête anonyme |
| `user` | 200 / minute | Utilisateur authentifié |

En production, configurer `REDIS_URL` pour un rate-limiting partagé entre workers.

### Validation des fichiers uploadés

Trois niveaux de vérification pour chaque document :

1. **Taille** : maximum 5 Mo.
2. **Extension** : `.pdf`, `.jpg`, `.jpeg`, `.png`, `.tif`, `.tiff`.
3. **Magic bytes** : lecture des 16 premiers octets pour valider que le contenu correspond à l'extension déclarée (protection contre les fichiers déguisés).

### Journal d'audit

Toutes les opérations d'écriture (POST, PUT, PATCH, DELETE) effectuées par des utilisateurs authentifiés sont enregistrées dans :

- **`backend/logs/security.log`** : fichier rotatif (5 Mo × 5 sauvegardes).
- **Table `JournalAudit`** : requêtable depuis l'interface admin Django.

### En-têtes de sécurité (production)

Actifs quand `DEBUG=False` :

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
```

---

## 12. Blockchain locale

TrustLand implémente une **blockchain légère en base de données** (sans réseau, sans token) pour garantir l'immuabilité de l'historique des transactions.

### Principe

```
Bloc #0 (Genesis)          Bloc #1                   Bloc #N
┌─────────────────┐        ┌─────────────────┐        ┌─────────────────┐
│ index: 0        │        │ index: 1        │        │ index: N        │
│ previous: 0x000 │ ──────▶│ previous: H(0)  │ ──────▶│ previous: H(N-1)│
│ data: {...}     │        │ data: {...}     │        │ data: {...}     │
│ hash: H(0)      │        │ hash: H(1)      │        │ hash: H(N)      │
└─────────────────┘        └─────────────────┘        └─────────────────┘
```

- **Hash** : SHA-256 de `{index, timestamp_unix, data, previous_hash}` sérialisés en JSON trié.
- **Atomicité** : chaque création de transaction encapsule la création du bloc dans `transaction.atomic()`.
- **Concurrence** : `select_for_update()` sur le dernier bloc garantit l'unicité des index sous charge.
- **Vérification** : `GET /api/blockchain/verifier/` recalcule tous les hashes et vérifie les liens (admin uniquement).

---

## 13. Détection de fraude

Après chaque nouvelle transaction, trois règles s'exécutent automatiquement et créent des alertes le cas échéant :

| Règle | Condition | Niveau |
|-------|-----------|--------|
| **Transaction répétée** | Même terrain : ≥ 2 autres transactions en 30 jours | Moyen (2) / Critique (≥ 3) |
| **Vendeur suspect** | Même vendeur : ≥ 3 transactions en 7 jours | Critique |
| **Double transaction** | Même terrain : une autre transaction le même jour | Critique |

Les alertes critiques déclenchent une **notification push** vers tous les appareils des admins et agents enregistrés.

---

## 14. Notifications push (mobile)

TrustLand intègre l'[API Expo Push Notifications](https://docs.expo.dev/push-notifications/sending-notifications/).

### Enregistrement d'un appareil

```http
POST /api/push-token/
Authorization: Bearer <token>
Content-Type: application/json

{ "token": "ExponentPushToken[xxxxxx]" }
```

### Désenregistrement

```http
DELETE /api/push-token/
Content-Type: application/json

{ "token": "ExponentPushToken[xxxxxx]" }
```

Les notifications sont envoyées automatiquement aux admins et agents lors de la création d'une alerte de fraude.

---

## 15. Commandes de gestion

### Créer un administrateur

```bash
python manage.py createadmin --username=admin --email=admin@trustland.tg --password=MotDePasseFort
```

Si l'utilisateur existe déjà, la commande met à jour son rôle et son mot de passe.

### Supprimer tous les admins (usage dev uniquement)

```bash
python manage.py deleteadmins
```

### Migrations

```bash
# Appliquer toutes les migrations
python manage.py migrate

# Voir l'état des migrations
python manage.py showmigrations
```

---

## 16. Tests et vérifications

### Vérifier l'intégrité de la blockchain

```bash
# Via l'API (admin uniquement)
curl -X GET http://localhost:8000/api/blockchain/verifier/ \
  -H "Authorization: Bearer <token>"
# → {"valide": true}
```

### Vérifier l'authenticité d'un document

```bash
curl -X POST http://localhost:8000/api/documents/verifier/ \
  -H "Authorization: Bearer <token>" \
  -F "fichier=@mon_document.pdf"
# → {"authentique": true, "document_id": 3, ...}
```

### Contrôle syntaxique du backend

```bash
cd backend
python -m py_compile config/settings.py api/views.py api/models.py users/models.py
```

---

## 17. Déploiement en production

### Variables d'environnement obligatoires

```env
DEBUG=False
SECRET_KEY=<64 caractères aléatoires>
ALLOWED_HOSTS=trustland.tg,www.trustland.tg
CORS_ALLOWED_ORIGINS=https://trustland.tg
DB_PASSWORD=<mot de passe fort>
FIELD_ENCRYPTION_KEY=<clé Fernet 44 chars base64url>
SITE_URL=https://trustland.tg
REDIS_URL=redis://localhost:6379/1
```

### Checklist déploiement

- [ ] `DEBUG=False` dans `.env`
- [ ] `SECRET_KEY` régénérée (jamais la clé de développement)
- [ ] `FIELD_ENCRYPTION_KEY` sauvegardée en lieu sûr (perte = données illisibles)
- [ ] PostgreSQL accessible et sécurisé
- [ ] Redis configuré pour le rate-limiting multi-workers
- [ ] HTTPS activé (certificat Let's Encrypt recommandé)
- [ ] Nginx configuré pour les fichiers statiques et media
- [ ] `python manage.py collectstatic --noinput` exécuté
- [ ] Sauvegarde automatique de la base de données planifiée
- [ ] Rotation des logs `security.log` vérifiée

### Note sur la clé de chiffrement Fernet

La `FIELD_ENCRYPTION_KEY` doit être **sauvegardée séparément** de la base de données. En cas de perte, les champs `telephone` et `numero_identite` de tous les propriétaires deviennent irrécupérables. Stocker cette clé dans un gestionnaire de secrets (HashiCorp Vault, AWS Secrets Manager, etc.).

---

## 18. Contexte académique

| Champ | Valeur |
|-------|--------|
| **Projet** | Projet Professionnel (PP) — Travail de Conception et de Conception 2 (TCC2) |
| **Semestre** | 4 — Année académique 2025-2026 |
| **Établissement** | *(confidentiel)* |
| **Domaine** | Génie Logiciel · Sécurité informatique · Gestion foncière |

---

## Licence

Usage académique — tous droits réservés.
