# Sharing API

API REST pour la gestion des liens de partage de documents et dossiers.

## Description

Le service **Sharing API** permet aux utilisateurs de partager leurs documents et dossiers avec d'autres utilisateurs ou via des liens publics. Il gère :

- La création de liens de partage publics ou privés
- Les invitations avec workflow d'acceptation/refus
- Les niveaux d'accès (lecture, écriture, lecture/écriture)
- L'expiration automatique des liens et invitations
- L'historique complet des changements de statut
- La révocation des partages

## Architecture

```
src/
├── commons/
│   ├── decorators/           # Décorateurs d'authentification
│   ├── enums/                # Énumérations (statuts, modèles)
│   ├── guards/               # Guards d'authentification
│   ├── interceptors/         # Intercepteurs de réponse
│   ├── services/queue/       # Configuration BullMQ
│   ├── shared/
│   │   ├── entities/         # Entités partagées
│   │   └── viewmodels/       # ViewModels de réponse
│   └── strategies/           # Stratégie Passport JWT
├── libs/prisma/              # Client Prisma
└── resources/sharing-link/
    ├── sharing-link.controller.ts
    ├── sharing-link.service.ts
    ├── sharing-link.repository.ts
    ├── dto/                  # DTOs de validation
    ├── entities/             # Entités métier
    └── queue/                # Processors d'expiration
        ├── invitation-expiration.processor.ts
        └── sharing-link-expiration.processor.ts
```

## Stack Technique

| Technologie | Version | Usage |
|-------------|---------|-------|
| Node.js | 20.x | Runtime |
| NestJS | 11.x | Framework backend |
| Fastify | 5.x | Serveur HTTP haute performance |
| Prisma | 7.x | ORM PostgreSQL |
| BullMQ | 5.x | Jobs d'expiration planifiés |
| Passport JWT | 4.x | Authentification |
| Swagger | 11.x | Documentation API |

## Packages GitHub Personnalisés

Ce service utilise des packages npm privés hébergés sur GitHub Packages :

| Package | Description | Lien |
|---------|-------------|------|
| `@akuma225/pagination` | Service de pagination générique pour Prisma | https://github.com/Akuma225/pagination |
| `@akuma225/random` | Génération de tokens aléatoires sécurisés | https://github.com/Akuma225/random |
| `@akuma225/viewmodel` | Utilitaires de transformation ViewModel | https://github.com/Akuma225/viewmodel |

### Configuration NPM pour GitHub Packages

Le fichier `.npmrc` doit être configuré pour accéder aux packages privés :

```ini
@akuma225:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

## Fonctionnalités

### Types de Partage

| Mode | Description |
|------|-------------|
| `PUBLIC` | Accessible via le token sans authentification |
| `PRIVATE` | Nécessite une invitation acceptée par le destinataire |

### Niveaux d'Accès

| Accès | Description |
|-------|-------------|
| `READ` | Lecture seule |
| `WRITE` | Écriture seule |
| `READ_WRITE` | Lecture et écriture |

### Cycle de Vie des Partages

```
                    ┌──────────────┐
                    │   PENDING    │ (Privé uniquement)
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
      ┌───────────┐ ┌───────────┐ ┌─────────────────────┐
      │ ACCEPTED  │ │ REJECTED  │ │ INVITATION_EXPIRED  │
      └─────┬─────┘ └───────────┘ └─────────────────────┘
            │
     ┌──────┴──────┐
     ▼             ▼
┌─────────┐  ┌─────────┐
│ EXPIRED │  │ REVOKED │
└─────────┘  └─────────┘
```

### Endpoints API

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/v1/sharing-links` | POST | Créer un lien de partage |
| `/v1/sharing-links/emitted` | GET | Liens émis par l'utilisateur |
| `/v1/sharing-links/received` | GET | Liens reçus par l'utilisateur |
| `/v1/sharing-links/by-id/:id` | GET | Détails d'un lien (par ID) |
| `/v1/sharing-links/by-token/:token` | GET | Détails d'un lien (par token) |
| `/v1/sharing-links/:id` | PATCH | Modifier un lien |
| `/v1/sharing-links/:id/treat-pending` | PATCH | Accepter/Refuser une invitation |
| `/v1/sharing-links/:id/revoke` | PATCH | Révoquer un lien |

## Workflow de Partage

### Partage Public

```
┌────────────┐     ┌─────────────┐     ┌──────────────┐
│ Propriétaire│────▶│ Sharing API │────▶│ Token généré │
└────────────┘     └─────────────┘     └──────┬───────┘
                                              │
                          Statut: ACCEPTED    │
                                              ▼
                                    ┌──────────────────┐
                                    │ Accès via token  │
                                    │ (sans auth)      │
                                    └──────────────────┘
```

### Partage Privé (Invitation)

```
┌────────────┐     ┌─────────────┐     ┌──────────────┐
│ Propriétaire│────▶│ Sharing API │────▶│   PENDING    │
└────────────┘     └─────────────┘     └──────┬───────┘
                                              │
                         Délai: 48h           │
                                              ▼
┌──────────────┐                    ┌──────────────────┐
│ Destinataire │◀───────────────────│   Notification   │
└──────┬───────┘                    └──────────────────┘
       │
       │ Accept/Reject
       ▼
┌──────────────┐
│ ACCEPTED ou  │
│ REJECTED     │
└──────────────┘
```

## Expiration Automatique

Le service utilise BullMQ pour planifier les expirations :

### Expiration d'Invitation (Partage Privé)

- Délai configurable via `INVITATION_EXPIRATION_HOURS` (défaut: 48h)
- Si non traitée → statut `INVITATION_EXPIRED`

### Expiration de Lien

- Date d'expiration optionnelle (`expires_at`)
- À échéance → statut `EXPIRED`

```typescript
// Planification d'expiration
await sharingLinkQueuesService.scheduleSharingLinkExpiration(id, expiresAt);
await sharingLinkQueuesService.scheduleInvitationExpiration(id, delayMs);
```

## Modèle de Données

### Lien de Partage

```prisma
model sharing_links {
  id            String        @id @default(uuid())
  token         String        @unique
  owner_id      String
  recipient_id  String?       // Null si PUBLIC
  expires_at    DateTime?
  mode          SharingMode   @default(PUBLIC)
  access        SharingAccess @default(READ)
  status        SharingStatus @default(PENDING)
  status_reason String?
}
```

### Éléments Partagés

```prisma
model sharing_items {
  id              String  @id @default(uuid())
  sharing_link_id String
  document_id     String? // XOR avec folder_id
  folder_id       String? // XOR avec document_id
}
```

### Historique des Statuts

```prisma
model sharing_link_histories {
  id              String        @id @default(uuid())
  sharing_link_id String
  previous_status SharingStatus
  new_status      SharingStatus
  reason          String?
}
```

## Variables d'Environnement

| Variable | Description | Exemple |
|----------|-------------|---------|
| `APP_PORT` | Port d'écoute | `3000` |
| `DATABASE_URL` | URL PostgreSQL | `postgresql://user:pass@host:5432/db` |
| `ACCESS_TOKEN_SECRET` | Secret JWT | `your-secret-key` |
| `REDIS_HOST` | Hôte Redis | `redis` |
| `REDIS_PORT` | Port Redis | `6379` |
| `INVITATION_EXPIRATION_HOURS` | Délai expiration invitation | `48` |

## Installation

```bash
# Configuration GitHub Packages (requis pour les packages privés)
export GITHUB_TOKEN=your_github_token

# Installation des dépendances
pnpm install

# Génération du client Prisma
pnpm prisma generate

# Lancement en développement
pnpm start:dev

# Build production
pnpm build

# Lancement en production
pnpm start:prod
```

## Docker

L'image Docker nécessite le token GitHub pour accéder aux packages privés :

```bash
# Build avec le token GitHub
docker build \
  --build-arg GITHUB_TOKEN=$GITHUB_TOKEN \
  -t sharing-api .

# Lancement via docker-compose
docker-compose up -d
```

Le `.npmrc` est supprimé après l'installation pour ne pas exposer le token.

## Documentation API

Une fois le service lancé, la documentation Swagger est accessible à :

```
http://localhost:3000/api/docs
```

## Sécurité

### Validations

- Un item de partage doit contenir soit un `document_id`, soit un `folder_id` (jamais les deux)
- Seuls les documents avec le statut `UPLOADED` peuvent être partagés
- L'utilisateur doit être propriétaire des documents/dossiers partagés

### Contrôles d'Accès

- Seul le propriétaire peut modifier ou révoquer un lien
- Seul le destinataire peut accepter/refuser une invitation privée
- Les liens révoqués ou expirés retournent une erreur explicite

## Tests

```bash
# Tests unitaires
pnpm test

# Tests e2e
pnpm test:e2e

# Couverture de code
pnpm test:cov
```

## Auteur

Développé dans le cadre du test technique Asernum.
