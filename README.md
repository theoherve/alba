# Alba - Gestion de Conciergerie Airbnb

Alba est un SaaS de gestion et d'automatisation de conciergerie Airbnb, permettant aux propriétaires et conciergeries d'automatiser leurs réponses aux voyageurs grâce à l'intelligence artificielle.

## Fonctionnalités

- **Authentification** : Magic link via Supabase Auth
- **Multi-organisations** : Gestion de plusieurs conciergeries
- **Gestion des logements** : CRUD complet avec configuration IA par logement
- **Inbox centralisée** : Vue unifiée de toutes les conversations
- **Réponses automatiques IA** : Génération et envoi automatique basé sur la confiance
- **Escalade intelligente** : Notification quand l'IA n'est pas sûre
- **Connexion Gmail** : Synchronisation des emails Airbnb via OAuth
- **Support FR/EN** : Internationalisation complète

## Stack Technique

### Frontend
- **Next.js 14+** (App Router)
- **TypeScript** (strict)
- **Tailwind CSS v4**
- **shadcn/ui**
- **TanStack React Query**
- **Zustand** (state management)

### Backend
- **Supabase** (Auth, PostgreSQL, Realtime, Edge Functions)
- **OpenAI GPT-4** (génération de réponses)
- **Resend** (emails de notification)
- **Gmail API** (synchronisation)

## Installation

### Prérequis

- Node.js 18+
- pnpm
- Compte Supabase
- Compte OpenAI
- Compte Google Cloud (pour Gmail API)
- Compte Resend (optionnel, pour les emails)

### Configuration

1. **Cloner le projet**

```bash
git clone <repo-url>
cd alba
pnpm install
```

2. **Configurer les variables d'environnement**

```bash
cp .env.local.example .env.local
```

Remplir les valeurs dans `.env.local` :

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Google OAuth (Gmail)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/gmail/callback

# Resend (Email notifications)
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=noreply@yourdomain.com

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

3. **Configurer Supabase**

Exécuter la migration initiale :

```bash
# Via Supabase CLI
supabase db push

# Ou manuellement dans le dashboard Supabase :
# Copier le contenu de supabase/migrations/001_initial_schema.sql
```

4. **Configurer Google Cloud Console**

- Créer un projet
- Activer Gmail API
- Configurer l'écran de consentement OAuth
- Créer des identifiants OAuth 2.0
- Ajouter les URI de redirection autorisés

5. **Lancer le serveur de développement**

```bash
pnpm dev
```

## Structure du Projet

```
alba/
├── app/                    # Routes Next.js App Router
│   ├── (auth)/            # Pages d'authentification
│   ├── (dashboard)/       # Pages protégées
│   └── api/               # API routes
├── components/
│   ├── ui/                # Composants shadcn/ui
│   ├── inbox/             # Composants inbox
│   ├── properties/        # Composants logements
│   ├── dashboard/         # Composants dashboard
│   ├── layout/            # Layout components
│   └── shared/            # Composants partagés
├── lib/
│   ├── supabase/          # Clients Supabase
│   ├── gmail/             # Client Gmail
│   ├── ai/                # Logique IA
│   └── utils.ts           # Utilitaires
├── services/              # Services métier
├── hooks/                 # React hooks
├── types/                 # Types TypeScript
├── supabase/
│   ├── migrations/        # Migrations SQL
│   └── functions/         # Edge Functions
└── i18n/                  # Traductions
```

## Modèle de Données

### Tables principales

- `users` : Profils utilisateurs
- `organizations` : Conciergeries
- `memberships` : Relations users/organizations
- `properties` : Logements
- `conversations` : Conversations avec voyageurs
- `messages` : Messages individuels
- `ai_responses` : Tracking des réponses IA
- `ai_knowledge_base` : Base de connaissances
- `notifications` : Notifications
- `gmail_connections` : Connexions Gmail
- `usage_metrics` : Métriques d'utilisation

## Workflow IA

1. **Réception du message** : Email Airbnb synchronisé via Gmail
2. **Analyse** : Construction du contexte (logement, historique, knowledge base)
3. **Génération** : Appel OpenAI avec prompt structuré
4. **Évaluation** : Calcul du score de confiance
5. **Action** :
   - Confiance ≥ seuil → Envoi automatique
   - Confiance 50-seuil → Suggestion à valider
   - Confiance < 50% → Escalade avec notification

## Déploiement

### Vercel (Frontend)

```bash
# Via Vercel CLI
vercel
```

### Supabase (Backend)

```bash
# Déployer les Edge Functions
supabase functions deploy gmail-sync
supabase functions deploy ai-respond
supabase functions deploy send-notification
```

## Conventions

### Commits

```
feat: add inbox conversation list
fix: resolve gmail token refresh issue
refactor: extract AI prompt builder
docs: update README with setup instructions
chore: update dependencies
```

### Naming

- Components: PascalCase (`ConversationList.tsx`)
- Hooks: camelCase avec prefix `use` (`useConversations.ts`)
- Services: camelCase (`conversations.ts`)
- Types: PascalCase (`Conversation`, `Message`)
- DB columns: snake_case (`created_at`, `organization_id`)

## Licence

Propriétaire - Tous droits réservés
