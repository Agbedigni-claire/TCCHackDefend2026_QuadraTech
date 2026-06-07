TrustLand — Registre Foncier Numérique (QuadraTech)
Plateforme de gestion et de traçabilité des droits fonciers pour la République du Togo.
TrustLand numérise l'enregistrement des terrains, la chaîne des transactions, la détection de fraude et la certification PDF avec QR code — le tout sécurisé par une blockchain locale et un chiffrement des données sensibles.
Architecture : Backend Django + Frontend React/Vite + Mobile Expo (React Native)

Table des matières
Vue d'ensemble de l'architecture
Prérequis système
Étape 1 — Configuration du Backend (Django)
Étape 2 — Configuration du Frontend (React/Vite)
Étape 3 — Configuration du Mobile (Expo)
Ordre de démarrage
Variables d'environnement — référence complète
Architecture des API — Endpoints
Rôles et permissions
Sécurité
Blockchain locale
Détection de fraude
Notifications push (mobile)
Problèmes connus et corrections apportées
Commandes utiles
Tests et vérifications
Production — checklist de sécurité
Contexte académique
1. Vue d'ensemble de l'architecture
Structure du projet
text
TCCHackDefend2026_QuadraTech-main/
│
├── backend/                          Django REST Framework + PostgreSQL
│   ├── api/                          Modèles, vues, serializers, blockchain, fraude
│   │   ├── models.py                 Proprietaire, Terrain, Transaction, Litige,
│   │   │                             Alerte, Document, Bloc, JournalAudit, PushToken
│   │   ├── views.py                  ViewSets + vues spéciales (PDF, stats, blockchain)
│   │   ├── serializers.py            Sérialisation + validation (magic bytes)
│   │   ├── permissions.py            IsAdmin, IsAdminOrAgent, …
│   │   ├── authentication.py         CookieJWTAuthentication (cookie + header)
│   │   ├── blockchain.py             ajouter_bloc / verifier_chaine
│   │   ├── fraude.py                 Détection automatique (3 règles)
│   │   ├── middleware.py             AuditLogMiddleware
│   │   ├── push_service.py           Notifications Expo Push
│   │   └── migrations/               0001 → 0007
│   ├── users/                        Modèle utilisateur personnalisé, auth
│   │   ├── models.py                 Utilisateur (AbstractUser + rôle + signal)
│   │   ├── views.py                  Login, Logout, Register, Me, …
│   │   ├── serializers.py            TokenPair, Register, AdminCreate, …
│   │   ├── urls.py
│   │   └── management/commands/
│   │       ├── createadmin.py
│   │       └── deleteadmins.py
│   ├── config/                       Settings, WSGI/ASGI, URLs racine
│   │   ├── settings.py               Configuration centrale
│   │   ├── urls.py                   Routage principal
│   │   └── wsgi.py
│   ├── logs/
│   │   └── security.log              Fichier de logs rotatif (5 Mo × 5)
│   ├── media/                        Fichiers uploadés (QR codes, documents)
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env                          Secrets locaux — NON versionné
│   └── .env.example                  Modèle documenté
│
├── frontend/                         React 19 + Vite + Tailwind CSS
│   └── src/
│       ├── api/client.js             Instance axios (withCredentials, interceptors)
│       ├── context/
│       │   └── AuthContext.jsx       Session, refresh proactif, inactivité
│       ├── components/
│       │   ├── Navbar.jsx
│       │   ├── ProtectedRoute.jsx
│       │   ├── SessionWarning.jsx
│       │   ├── TerrainForm.jsx
│       │   ├── TerrainDocuments.jsx
│       │   ├── TransactionForm.jsx
│       │   └── LitigeForm.jsx
│       ├── pages/
│       │   ├── Dashboard.jsx         Statistiques globales + graphiques
│       │   ├── Carte.jsx             Carte Leaflet des terrains
│       │   ├── Terrains.jsx          Liste + filtres
│       │   ├── TerrainDetail.jsx     4 onglets + timeline chronologique
│       │   ├── Proprietaires.jsx
│       │   ├── Transactions.jsx
│       │   ├── Litiges.jsx
│       │   ├── Blockchain.jsx        Visualisation de la chaîne
│       │   ├── Alertes.jsx           Alertes fraude
│       │   ├── VerifierDocument.jsx  Vérification SHA-256
│       │   ├── ProfilUtilisateur.jsx
│       │   ├── GestionUtilisateurs.jsx  Admin RBAC
│       │   ├── Login.jsx
│       │   └── Register.jsx
│       └── utils.js                  DOMPurify, helpers
│
└── mobile/                           React Native + Expo SDK 56
    ├── app/                          Expo Router (navigation par fichiers)
    └── src/
        ├── api/                      Client Axios avec stockage sécurisé
        ├── constants/config.js       IP du backend à configurer
        └── context/
            └── AuthContext.jsx       SecureStore + Bearer header
Flux de communication
text
┌──────────────────────────────────────────────────────┐
│                       Clients                         │
│   Navigateur (React 19)    │   Mobile (Expo SDK 56)   │
│   Cookie httpOnly JWT       │   Bearer + SecureStore   │
└────────────┬───────────────┴──────────────┬───────────┘
             │ HTTPS / CORS                 │ HTTPS
             ▼                              ▼
┌──────────────────────────────────────────────────────┐
│              Django 6 + DRF 3.17   [:8000]            │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │  App users  │  │   App api    │  │  Middleware  │  │
│  │  JWT auth   │  │  Métier +    │  │  AuditLog   │  │
│  │  RBAC       │  │  Blockchain  │  │  CORS / CSRF│  │
│  └─────────────┘  └──────────────┘  └─────────────┘  │
└───────────────────────────┬──────────────────────────┘
                            │
             ┌──────────────┴──────────────┐
             ▼                             ▼
    ┌────────────────┐           ┌──────────────────┐
    │  PostgreSQL    │           │  Système de       │
    │  trustland_db  │           │  fichiers media/  │
    │  (Fernet enc.) │           │  (QR codes, PDF)  │
    └────────────────┘           └──────────────────┘
Le frontend proxifie les requêtes /api/* et /media/* vers le backend via Vite en développement.
Le mobile contacte directement le backend via son IP réseau locale (voir section 5.2).

2. Prérequis système
Logiciels requis
Outil	Version minimale	Vérification
Python	3.12+	python --version
pip	23+	pip --version
Node.js	20 LTS+	node --version
npm	9+	npm --version
PostgreSQL	14+	psql --version
Redis	7+ (prod)	redis-cli --version
Git	2.x	git --version
Redis est optionnel en développement (LocMemCache utilisé par défaut) mais requis en production pour le rate-limiting multi-workers.

Pour le mobile uniquement
Outil	Usage
Expo CLI	npm install -g expo-cli
Android Studio	Émulateur Android
Xcode (macOS)	Émulateur iOS
Expo Go (app)	Test sur appareil physique
3. Étape 1 — Configuration du Backend (Django)
3.1 Cloner le dépôt
bash
git clone <url-du-depot>
cd TCCHackDefend2026_QuadraTech-main
3.2 Créer et activer un environnement virtuel Python
bash
cd backend

# Windows
python -m venv venv
venv\Scripts\activate

# Linux / macOS
python -m venv venv
source venv/bin/activate
Le prompt doit afficher (venv) pour confirmer l'activation.

3.3 Installer les dépendances Python
bash
pip install -r requirements.txt
Dépendances installées :

Package	Version	Rôle
Django	6.0.6	Framework web
djangorestframework	3.17.1	API REST
djangorestframework-simplejwt	5.5.1	Authentification JWT
django-cors-headers	4.9.0	CORS pour frontend/mobile
django-ratelimit	4.1.0	Limitation de débit
psycopg2-binary	2.9.12	Connecteur PostgreSQL
cryptography	≥ 42.0.0	Chiffrement des champs sensibles
python-decouple	3.8	Variables d'environnement
Pillow	12.2.0	Traitement d'images / QR codes
qrcode	8.2	Génération QR codes
reportlab	≥ 4.0	Génération de certificats PDF
PyJWT	2.13.0	JSON Web Tokens
3.4 Configurer la base de données PostgreSQL
sql
-- Se connecter à PostgreSQL
psql -U postgres

-- Créer la base de données
CREATE DATABASE trustland_db;

-- Créer l'utilisateur
CREATE USER trustland_user WITH PASSWORD 'mot-de-passe-fort';

-- Accorder les permissions
GRANT ALL PRIVILEGES ON DATABASE trustland_db TO trustland_user;

-- Quitter
\q
3.5 Créer le fichier .env
bash
cp .env.example .env
Éditer .env avec les valeurs réelles :

# Générer avec :
# python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
SECRET_KEY=votre-cle-secrete-generee

# True pour le développement, False en production
DEBUG=True

# En développement
ALLOWED_HOSTS=localhost,127.0.0.1

# Origines autorisées pour CORS (frontend React)
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# Base de données PostgreSQL
DB_NAME=trustland_db
DB_USER=trustland_user
DB_PASSWORD=mot-de-passe-fort
DB_HOST=localhost
DB_PORT=5432

# Clé de chiffrement des champs sensibles (téléphone, numéro d'identité)
# Générer avec : python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
# ATTENTION : changer cette clé invalide toutes les données chiffrées existantes en base.
FIELD_ENCRYPTION_KEY=votre-cle-fernet-generee

# URL publique (intégrée dans les QR codes des terrains)
SITE_URL=https://trustland.tg

# Redis pour le rate-limiting multi-workers (laisser vide en dev → LocMemCache)
# Exemple : redis://localhost:6379/1
REDIS_URL=
Important : FIELD_ENCRYPTION_KEY est obligatoire. Sans elle, le démarrage du serveur échoue.
Une fois des données chiffrées en base, ne jamais changer cette clé (les données deviendraient irrécupérables).
Le fichier .env est listé dans .gitignore et ne doit jamais être commité.

3.6 Appliquer les migrations
bash
python manage.py migrate
Cela crée toutes les tables nécessaires :

users_utilisateur (utilisateurs avec rôles)
api_proprietaire, api_terrain, api_document
api_transaction, api_litige, api_alerte
api_bloc (blockchain), api_pushtoken, api_journalaudit
Tables JWT (token_blacklist)
3.7 Créer un compte administrateur
bash
# Commande personnalisée (recommandée)
python manage.py createadmin --username=admin --email=admin@trustland.tg --password=MotDePasseFort

# Ou commande standard Django
python manage.py createsuperuser
Si l'utilisateur existe déjà, la commande met à jour son rôle et son mot de passe.

3.8 Démarrer le serveur de développement
bash
# Accessible uniquement en local
python manage.py runserver

# Accessible sur le réseau local (nécessaire pour tester le mobile)
python manage.py runserver 0.0.0.0:8000
Le backend est disponible sur : http://localhost:8000
Interface d'administration Django : http://localhost:8000/admin/

4. Étape 2 — Configuration du Frontend (React/Vite)
4.1 Installer les dépendances Node.js
bash
cd frontend
npm install
Dépendances principales :

Package	Version	Rôle
react	^19.2.6	Framework UI
react-router-dom	^7.17.0	Navigation
axios	^1.17.0	Requêtes HTTP
leaflet + react-leaflet	^1.9.4 / ^5.0.0	Cartes interactives
recharts	^3.8.1	Graphiques / tableau de bord
dompurify	^3.4.8	Protection XSS
tailwindcss	^3.4.19	Styles CSS
vite	^8.0.12	Serveur de dev + bundler
4.2 Vérifier la configuration du proxy Vite
Le fichier vite.config.js proxifie automatiquement les requêtes vers le backend :

javascript
server: {
  proxy: {
    '/api':   { target: 'http://localhost:8000', changeOrigin: true },
    '/media': { target: 'http://localhost:8000', changeOrigin: true },
  },
}
Si le backend tourne sur un autre port, modifier target en conséquence.

4.3 Démarrer le serveur de développement
bash
npm run dev
Le frontend est disponible sur : http://localhost:5173

4.4 Build de production
bash
npm run build
# Les fichiers sont générés dans frontend/dist/ — à servir par Nginx
4.5 Pages disponibles
Route	Description	Accès
/login	Connexion	Public
/register	Inscription	Public
/	Accueil (redirige vers dashboard si connecté)	Public
/terrains	Liste des terrains	Public
/terrains/:id	Détail d'un terrain	Public
/dashboard	Tableau de bord (stats + graphiques)	Authentifié
/carte	Carte Leaflet interactive	Authentifié
/proprietaires	Gestion des propriétaires	Authentifié
/transactions	Historique des transactions	Authentifié
/litiges	Litiges fonciers	Authentifié
/blockchain	Visualisation de la chaîne de blocs	Authentifié
/alertes	Alertes de fraude	Authentifié
/verifier-document	Vérification SHA-256 de documents	Authentifié
/profil	Profil utilisateur	Authentifié
/gestion-utilisateurs	Administration des comptes	Admin seulement
5. Étape 3 — Configuration du Mobile (Expo)
5.1 Installer les dépendances
bash
cd mobile
npm install
Dépendances principales :

Package	Version	Rôle
expo	~56.0.9	SDK Expo
expo-router	~56.2.9	Navigation par fichiers
expo-local-authentication	~56.0.4	Face ID / empreinte
expo-secure-store	~56.0.4	Stockage sécurisé des tokens
expo-camera	^56.0.7	Caméra + scanner QR code
expo-location	~56.0.16	GPS
expo-notifications	^56.0.16	Notifications push
react-native-maps	^1.27.2	Cartes
victory-native	^41.25.0	Graphiques
5.2 Configurer l'URL du backend
Éditer mobile/src/constants/config.js :

javascript
// Remplacer par l'IP de la machine exécutant le backend
// Trouver son IP : ipconfig (Windows) ou ifconfig (Linux/macOS)
export const API_BASE_URL = 'http://192.168.X.X:8000';
Important : Ne jamais utiliser localhost depuis un appareil physique ou un émulateur Android.

Contexte	URL à utiliser
Émulateur Android	http://10.0.2.2:8000
Émulateur iOS	http://localhost:8000
Appareil physique	http://192.168.X.X:8000 (IP LAN)
Expo Go (réseau local)	http://192.168.X.X:8000 (IP LAN)
5.3 Démarrer Expo
bash
# Serveur Expo avec QR code
npx expo start

# Android
npx expo run:android

# iOS (macOS uniquement)
npx expo run:ios

# Avec tunnel (réseau restreint)
npx expo start --tunnel

# Nettoyer le cache
npx expo start --clear
5.4 Navigation mobile (Expo Router)
text
(auth)/login            Écran de connexion
(tabs)/
  index                 Accueil
  dashboard             Tableau de bord
  terrains              Liste terrains
  carte                 Carte GPS
  scanner               Scanner QR code
  verifier              Vérification document
  profil                Profil utilisateur
terrain/[id]            Détail terrain
terrain/nouveau         Nouveau terrain
litige/nouveau          Nouveau litige
transaction/nouvelle    Nouvelle transaction
L'application mobile utilise expo-secure-store pour stocker les tokens et le header Authorization: Bearer pour s'authentifier auprès du backend.

6. Ordre de démarrage
Toujours démarrer les services dans cet ordre :

text
1. PostgreSQL (service système)
       │
       ▼
2. Backend Django (port 8000)
       │
       ▼
3. Frontend React (port 5173)  ET/OU  Mobile Expo (port 8081)
Script de démarrage rapide (développement)
Terminal 1 — Backend :

bash
cd backend
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/macOS
python manage.py runserver 0.0.0.0:8000
Terminal 2 — Frontend :

bash
cd frontend
npm run dev
Terminal 3 — Mobile (optionnel) :

bash
cd mobile
npx expo start
7. Variables d'environnement — référence complète
Backend (backend/.env)
Variable	Obligatoire	Description	Exemple
SECRET_KEY	Oui	Clé secrète Django	Chaîne aléatoire 50+ chars
DEBUG	Oui	Mode debug	True (dev) / False (prod)
ALLOWED_HOSTS	Oui	Hôtes autorisés	localhost,127.0.0.1
CORS_ALLOWED_ORIGINS	Oui	Origines CORS	http://localhost:5173
DB_NAME	Oui	Nom de la BDD	trustland_db
DB_USER	Oui	Utilisateur BDD	trustland_user
DB_PASSWORD	Oui	Mot de passe BDD	Chaîne forte
DB_HOST	Oui	Hôte PostgreSQL	localhost
DB_PORT	Oui	Port PostgreSQL	5432
FIELD_ENCRYPTION_KEY	Oui	Clé Fernet (chiffrement PII)	Générée par Fernet
SITE_URL	Non	URL publique pour les QR codes	https://trustland.tg
REDIS_URL	Prod only	Redis pour rate-limiting partagé	redis://localhost:6379/1
Générer les clés
bash
# SECRET_KEY Django
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

# FIELD_ENCRYPTION_KEY (Fernet — AES-128-CBC + HMAC-SHA256)
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
8. Architecture des API — Endpoints
Authentification
Méthode	URL	Description	Accès
POST	/api/token/	Connexion — retourne access + refresh en cookies httpOnly	Public
POST	/api/token/refresh/	Renouvelle le token access (cookie ou body)	Public
POST	/api/users/logout/	Invalide le refresh token + supprime les cookies	Authentifié
POST	/api/users/register/	Inscription (rôle proprietaire uniquement)	Public
GET/PATCH	/api/users/me/	Profil de l'utilisateur connecté	Authentifié
POST	/api/users/changer-mot-de-passe/	Changement de mot de passe	Authentifié
Gestion des utilisateurs (admin)
Méthode	URL	Description
GET/POST	/api/users/utilisateurs/	Liste + création (tous rôles)
GET/PATCH/DELETE	/api/users/utilisateurs/<id>/	Détail, modification, suppression
Registre foncier
Méthode	URL	Description	Accès
GET/POST	/api/proprietaires/	Liste + création	Admin, Agent
GET/PUT/PATCH/DELETE	/api/proprietaires/<id>/	Détail	Admin, Agent
GET	/api/terrains/	Liste (filtrée par rôle)	Authentifié
POST	/api/terrains/	Création (QR code auto-généré)	Admin, Agent
GET	/api/terrains/<id>/certificat/	Certificat PDF	Admin, Agent, Propriétaire (son terrain)
GET	/api/terrains/<id>/historique/	Timeline chronologique	Authentifié
GET	/api/terrains/<id>/litiges/	Litiges du terrain	Authentifié
GET/POST	/api/documents/	Documents fonciers	Admin, Agent
DELETE	/api/documents/<id>/	Suppression	Admin uniquement
POST	/api/documents/verifier/	Vérification d'authenticité (SHA-256)	Authentifié
Transactions et litiges
Méthode	URL	Description	Accès
GET/POST	/api/transactions/	Historique + nouvelle transaction	Admin, Agent
GET/POST	/api/litiges/	Litiges (propriétaires peuvent en déclarer)	Authentifié
PATCH	/api/litiges/<id>/resoudre/	Résolution officielle	Admin
GET	/api/alertes/	Alertes de fraude	Admin, Agent
Blockchain et statistiques
Méthode	URL	Description	Accès
GET	/api/blockchain/	Liste des blocs	Authentifié
GET	/api/blockchain/verifier/	Vérification de l'intégrité	Admin
GET	/api/stats/	Statistiques globales (dashboard)	Authentifié
Mobile — Push tokens
Méthode	URL	Description
POST	/api/push-token/	Enregistrement du token Expo Push
DELETE	/api/push-token/	Suppression du token
Authentification des requêtes
Toutes les requêtes protégées doivent inclure un token valide :

text
# Navigateur web : cookie httpOnly posé automatiquement par le serveur
# Mobile / API : header Authorization
Authorization: Bearer <access_token>
Durée de vie des tokens :

Token	Durée	Stockage (web)
Access token	60 min	Cookie trustland_access (httpOnly, Lax)
Refresh token	24 h	Cookie trustland_refresh (httpOnly, Lax)
Le frontend React renouvelle automatiquement le token 5 minutes avant son expiration. En cas d'inactivité de 30 minutes, un modal d'avertissement s'affiche à 25 minutes, puis déconnexion automatique.

9. Rôles et permissions
TrustLand implémente un système RBAC à 3 niveaux, synchronisé avec les flags Django natifs (is_staff, is_superuser) via un signal pre_save automatique.

Rôle	Valeur	is_staff	is_superuser	Accès
Administrateur	admin	✅	✅	Accès complet, interface Django /admin/
Agent	agent	❌	❌	Lecture + écriture registre, pas de suppression doc
Propriétaire	proprietaire	❌	❌	Ses terrains, ses transactions, déclarer un litige
Matrice de permissions
Action	Admin	Agent	Propriétaire	Anonyme
Lire terrains	Oui	Oui	Oui	Oui
Créer terrain	Oui	Oui	Non	Non
Modifier terrain	Oui	Oui	Non	Non
Supprimer terrain	Oui	Non	Non	Non
Créer transaction	Oui	Oui	Non	Non
Voir alertes fraude	Oui	Oui	Non	Non
Gestion utilisateurs	Oui	Non	Non	Non
Règles notables
L'inscription publique (/api/users/register/) crée uniquement des comptes proprietaire.
Les comptes agent et admin sont créés par un administrateur via l'interface ou la commande createadmin.
Un admin ne peut pas modifier son propre rôle ni supprimer son propre compte.
Le champ role est interdit en écriture via PATCH /api/users/me/ (défense en profondeur).
10. Sécurité
JWT par cookies httpOnly
Les tokens JWT ne sont jamais stockés dans localStorage (vulnérable au XSS). Le navigateur utilise des cookies httpOnly posés par le serveur. La classe CookieJWTAuthentication accepte les deux modes (cookie prioritaire sur le navigateur, header Bearer pour le mobile).

Chiffrement des données sensibles
Les champs telephone et numero_identite de chaque propriétaire sont chiffrés en base de données avec Fernet (AES-128-CBC + HMAC-SHA256) via un EncryptedField Django personnalisé.

Rate limiting
Scope	Limite	Cible
login	5 / minute	POST /api/token/
transaction	30 / heure	POST /api/transactions/
anon	20 / minute	Toute requête anonyme
user	200 / minute	Utilisateur authentifié
En production, configurer REDIS_URL pour un rate-limiting partagé entre workers.

Validation des fichiers uploadés
Trois niveaux de vérification pour chaque document :

Taille : maximum 5 Mo.
Extension : .pdf, .jpg, .jpeg, .png, .tif, .tiff.
Magic bytes : lecture des 16 premiers octets pour valider que le contenu correspond à l'extension déclarée (protection contre les fichiers déguisés).
Journal d'audit
Toutes les opérations d'écriture (POST, PUT, PATCH, DELETE) effectuées par des utilisateurs authentifiés sont enregistrées dans :

backend/logs/security.log : fichier rotatif (5 Mo × 5 sauvegardes).
Table JournalAudit : requêtable depuis l'interface admin Django.
En-têtes de sécurité (production)
Actifs quand DEBUG=False :

text
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
11. Blockchain locale
TrustLand implémente une blockchain légère en base de données (sans réseau, sans token) pour garantir l'immuabilité de l'historique des transactions.

Principe de fonctionnement
text
Bloc #0 (Genesis)          Bloc #1                   Bloc #N
┌─────────────────┐        ┌─────────────────┐        ┌─────────────────┐
│ index: 0        │        │ index: 1        │        │ index: N        │
│ previous: 0x000 │ ──────▶│ previous: H(0)  │ ──────▶│ previous: H(N-1)│
│ data: {...}     │        │ data: {...}     │        │ data: {...}     │
│ hash: H(0)      │        │ hash: H(1)      │        │ hash: H(N)      │
└─────────────────┘        └─────────────────┘        └─────────────────┘
Hash : SHA-256 de {index, timestamp_unix, data, previous_hash} sérialisés en JSON trié.
Atomicité : chaque création de transaction encapsule la création du bloc dans transaction.atomic().
Concurrence : select_for_update() sur le dernier bloc garantit l'unicité des index sous charge.
Vérification : GET /api/blockchain/verifier/ recalcule tous les hashes et vérifie les liens (admin uniquement).
12. Détection de fraude
Après chaque nouvelle transaction, trois règles s'exécutent automatiquement et créent des alertes le cas échéant :

Règle	Condition	Niveau
Transaction répétée	Même terrain : ≥ 2 autres transactions en 30 jours	Moyen (2) / Critique (≥ 3)
Vendeur suspect	Même vendeur : ≥ 3 transactions en 7 jours	Critique
Double transaction	Même terrain : une autre transaction le même jour	Critique
Les alertes critiques déclenchent une notification push vers tous les appareils des admins et agents enregistrés.

13. Notifications push (mobile)
TrustLand intègre l'API Expo Push Notifications pour alerter les agents et administrateurs en temps réel.

Enregistrement d'un appareil
http
POST /api/push-token/
Authorization: Bearer <token>
Content-Type: application/json

{ "token": "ExponentPushToken[xxxxxx]" }
Désenregistrement
http
DELETE /api/push-token/
Content-Type: application/json

{ "token": "ExponentPushToken[xxxxxx]" }
Les notifications sont envoyées automatiquement aux admins et agents lors de la création d'une alerte de fraude critique.

14. Problèmes connus et corrections apportées
Correction 1 — FIELD_ENCRYPTION_KEY manquante dans .env.example
Problème : Le fichier backend/.env.example ne mentionnait pas FIELD_ENCRYPTION_KEY, pourtant cette variable est obligatoire dans config/settings.py. Sans elle, toute lecture/écriture sur les champs telephone et numero_identite échoue au démarrage.

Correction apportée : Variable ajoutée dans .env.example avec instructions de génération.

Action requise :

bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
# Copier le résultat dans .env sous FIELD_ENCRYPTION_KEY=
Correction 2 — IP codée en dur dans le mobile
Problème : mobile/src/constants/config.js contient http://192.168.1.70:8000, une IP spécifique à une machine. Ce fichier doit être modifié par chaque développeur.

Action requise : Modifier mobile/src/constants/config.js avec l'IP de votre machine.

bash
# Windows — trouver votre IP
ipconfig | findstr "IPv4"

# Linux/macOS
ip addr show | grep "inet "
Problème connu 3 — Pas de Docker ni CI/CD
Le projet ne contient pas de Dockerfile ni de docker-compose.yml. Chaque service (backend, frontend, PostgreSQL) doit être démarré manuellement dans l'ordre indiqué en section 6.

Problème connu 4 — Version Python non spécifiée dans requirements.txt
requirements.txt ne spécifie pas la version Python. Utiliser Python 3.11 ou 3.12. Django 6.0 requiert Python 3.10+ minimum.

Problème connu 5 — Assets Expo manquants
app.json référence des assets (./assets/icon.png, ./assets/splash-icon.png, etc.) qui peuvent être absents du dépôt. Expo utilise des assets par défaut si les fichiers sont manquants, mais des avertissements apparaîtront au démarrage.

15. Commandes utiles
Backend Django
bash
# Vérifier la configuration
python manage.py check

# Créer de nouvelles migrations après modification des modèles
python manage.py makemigrations

# Appliquer les migrations
python manage.py migrate

# Voir l'état des migrations
python manage.py showmigrations

# Lancer les tests
python manage.py test

# Shell Django interactif
python manage.py shell

# Collecte des fichiers statiques (production)
python manage.py collectstatic --noinput

# Créer un administrateur (commande personnalisée)
python manage.py createadmin --username=admin --email=admin@trustland.tg --password=MotDePasseFort

# Supprimer tous les admins (usage dev uniquement)
python manage.py deleteadmins
Frontend React
bash
# Démarrer le serveur de dev
npm run dev

# Vérifier les erreurs ESLint
npm run lint

# Build de production
npm run build

# Prévisualiser le build de production
npm run preview
Mobile Expo
bash
# Démarrer avec menu interactif
npx expo start

# Démarrer avec tunnel (réseau restreint)
npx expo start --tunnel

# Nettoyer le cache
npx expo start --clear

# Vérifier les dépendances Expo
npx expo doctor

# Android
npx expo run:android

# iOS
npx expo run:ios
PostgreSQL
bash
# Se connecter à la BDD
psql -U trustland_user -d trustland_db

# Lister les tables
\dt

# Voir les utilisateurs et leurs rôles
SELECT username, role FROM users_utilisateur;

# Quitter
\q
16. Tests et vérifications
Vérifier l'intégrité de la blockchain
bash
# Via l'API (admin uniquement)
curl -X GET http://localhost:8000/api/blockchain/verifier/ \
  -H "Authorization: Bearer <token>"
# → {"valide": true}
Vérifier l'authenticité d'un document
bash
curl -X POST http://localhost:8000/api/documents/verifier/ \
  -H "Authorization: Bearer <token>" \
  -F "fichier=@mon_document.pdf"
# → {"authentique": true, "document_id": 3, ...}
Contrôle syntaxique du backend
bash
cd backend
python -m py_compile config/settings.py api/views.py api/models.py users/models.py
Vérifier la configuration Django
bash
python manage.py check
17. Production — checklist de sécurité
Avant tout déploiement en production :

 DEBUG=False dans .env
 SECRET_KEY unique et aléatoire (50+ caractères), jamais la clé de développement
 ALLOWED_HOSTS limité aux domaines de production (trustland.tg,www.trustland.tg)
 CORS_ALLOWED_ORIGINS limité aux URL de production (https://trustland.tg)
 Mot de passe PostgreSQL fort et unique
 FIELD_ENCRYPTION_KEY sauvegardée en lieu sûr (perte = données chiffrées irrécupérables)
 HTTPS activé (certificat Let's Encrypt recommandé)
 Backend derrière un proxy inverse (nginx / Caddy)
 Variables d'environnement injectées par le système (pas de fichier .env en prod)
 Redis configuré pour le rate-limiting multi-workers
 JWT token blacklisting actif (déjà configuré)
 python manage.py collectstatic --noinput exécuté
 Logs de sécurité surveillés (backend/logs/security.log)
 Sauvegardes PostgreSQL automatiques planifiées
 Utilisateur PostgreSQL sans privilèges superuser
Variables d'environnement obligatoires en production
DEBUG=False
SECRET_KEY=<64 caractères aléatoires>
ALLOWED_HOSTS=trustland.tg,www.trustland.tg
CORS_ALLOWED_ORIGINS=https://trustland.tg
DB_PASSWORD=<mot de passe fort>
FIELD_ENCRYPTION_KEY=<clé Fernet 44 chars base64url>
SITE_URL=https://trustland.tg
REDIS_URL=redis://localhost:6379/1
Configuration Nginx (exemple minimal)
server {
    listen 443 ssl;
    server_name trustland.tg;

    # Fichiers statiques et media
    location /static/ { alias /chemin/vers/staticfiles/; }
    location /media/  { alias /chemin/vers/media/; }

    # Backend Django (via gunicorn)
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Frontend React (fichiers statiques)
    location / {
        root /chemin/vers/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
}
Démarrage en production (Gunicorn)
bash
cd backend
pip install gunicorn
gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 4
Note sur la clé Fernet : La FIELD_ENCRYPTION_KEY doit être sauvegardée séparément de la base de données. Stocker cette clé dans un gestionnaire de secrets (HashiCorp Vault, AWS Secrets Manager, etc.).

18. Contexte académique
Champ	Valeur
Projet	Projet Professionnel (PP) — Travail de Conception et de Réalisation 2 (TCC)
Équipe	QuadraTech
Compétition	TCCHackDefend 2026
Semestre	4 — Année académique 2025-2026
Domaine	Génie Logiciel · Sécurité informatique · Gestion foncière
Licence
Usage académique — tous droits réservés.

TrustLand / QuadraTech