# Documents API

API REST pour la gestion de documents et de dossiers dans le système de stockage Asernum.

## Description

Le service **Documents API** constitue le point d'entrée principal pour la gestion des fichiers utilisateurs. Il implémente une architecture CQRS (Command Query Responsibility Segregation) et expose une API RESTful permettant :

- L'upload de fichiers vers un stockage S3-compatible (RustFS)
- L'organisation des documents en dossiers hiérarchiques
- Le téléchargement et la prévisualisation des fichiers
- La gestion du cycle de vie des documents (corbeille, restauration, suppression définitive)
- La recherche de documents et dossiers
- Le suivi des quotas utilisateurs

## Architecture

```
src/
├── application/           # Couche application (CQRS)
│   ├── commands/          # Commandes (upload, delete, move, restore...)
│   ├── queries/           # Requêtes (find, download, quota...)
│   ├── controllers/       # Contrôleurs REST
│   ├── dto/               # Data Transfer Objects
│   └── security/          # Gestion des droits et autorisations
├── auth/                  # Module d'authentification
│   ├── guards/            # Guards d'authentification
│   └── strategies/        # Stratégies Passport JWT
├── domain/                # Couche domaine
│   ├── entities/          # Entités métier
│   └── ports/             # Interfaces des repositories
├── infrastructure/        # Couche infrastructure
│   ├── messaging/kafka/   # Publication vers Kafka
│   ├── persistence/       # Repositories Prisma
│   └── services/storage/  # Service RustFS (S3)
└── common/                # Utilitaires partagés
    ├── decorators/        # Décorateurs personnalisés
    ├── interceptors/      # Intercepteurs de réponse
    └── authorization/     # Système de droits granulaires
```

## Stack Technique

| Technologie | Version | Usage |
|-------------|---------|-------|
| Node.js | 20.x | Runtime |
| NestJS | 11.x | Framework backend |
| Fastify | 5.x | Serveur HTTP haute performance |
| Prisma | 7.x | ORM PostgreSQL |
| KafkaJS | 2.x | Publication d'événements |
| AWS SDK v3 | 3.x | Client S3 (RustFS) |
| Passport JWT | 4.x | Authentification |
| Swagger | 11.x | Documentation API |

## Fonctionnalités Principales

### Gestion des Documents

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/v1/documents/upload` | POST | Upload d'un fichier (multipart/form-data) |
| `/v1/documents/:id` | GET | Récupérer les métadonnées d'un document |
| `/v1/documents/:id/download` | GET | Télécharger un document |
| `/v1/documents/:id/move` | PATCH | Déplacer un document |
| `/v1/documents/:id` | DELETE | Supprimer un document |
| `/v1/documents/:id/restore` | POST | Restaurer depuis la corbeille |
| `/v1/documents/quota` | GET | Quota et espace consommé |

### Gestion des Dossiers

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/v1/folders` | POST | Créer un dossier |
| `/v1/folders` | GET | Lister les dossiers |
| `/v1/folders/:id` | GET | Détails d'un dossier |
| `/v1/folders/:id` | PATCH | Modifier un dossier |
| `/v1/folders/:id` | DELETE | Supprimer un dossier |

### Recherche

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/v1/search` | GET | Recherche globale (documents + dossiers) |

## Flux d'Upload

```
┌─────────┐     ┌──────────────┐     ┌─────────┐     ┌───────┐
│ Client  │────▶│ Documents API │────▶│ RustFS  │     │ Kafka │
└─────────┘     └──────────────┘     │(staging)│     └───┬───┘
                       │              └─────────┘         │
                       │                                  │
                       └──────────────────────────────────┘
                         Publie "document.uploaded"
```

1. Le client envoie le fichier via `multipart/form-data`
2. L'API stocke le fichier dans le bucket **staging** de RustFS
3. Les métadonnées sont enregistrées en base avec le statut `STAGING`
4. Un événement Kafka `document.uploaded` est publié
5. Le **Processing Worker** traite ensuite le document de manière asynchrone

## Système d'Autorisation

L'API implémente un système de droits granulaires basé sur les ressources :

```typescript
@Authorize([
  { action: RightAction.READ, resource: RightResource.DOCUMENT }
])
```

**Actions disponibles** : `READ`, `WRITE`, `DELETE`, `MOVE`, `DOWNLOAD`, `RESTORE`

**Ressources** : `DOCUMENT`, `FOLDER`

## Variables d'Environnement

| Variable | Description | Exemple |
|----------|-------------|---------|
| `APP_PORT` | Port d'écoute | `3000` |
| `DATABASE_URL` | URL PostgreSQL | `postgresql://user:pass@host:5432/db` |
| `ACCESS_TOKEN_SECRET` | Secret JWT | `your-secret-key` |
| `KAFKA_BROKER_URL` | Broker Kafka | `kafka:9093` |
| `RUSTFS_ENDPOINT` | Endpoint S3 RustFS | `http://rustfs:9000` |
| `RUSTFS_ACCESS_KEY` | Clé d'accès RustFS | `rustfsadmin` |
| `RUSTFS_SECRET_KEY` | Clé secrète RustFS | `your-secret` |
| `RUSTFS_BUCKET` | Bucket staging | `asernum-staging` |
| `USER_QUOTA_LIMIT` | Quota par utilisateur (Mo) | `100` |

## Installation

```bash
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

```bash
# Build de l'image
docker build -t documents-api .

# Lancement via docker-compose
docker-compose up -d
```

## Documentation API

Une fois le service lancé, la documentation Swagger est accessible à :

```
http://localhost:3000/api/docs
```

## Tests

```bash
# Tests unitaires
pnpm test

# Tests e2e
pnpm test:e2e

# Couverture de code
pnpm test:cov
```

## Modèle de Données

### Document

```prisma
model documents {
  id            String       @id @default(uuid())
  folder_id     String
  original_name String
  stored_name   String
  path          String
  mime_type     String
  size          Int
  upload_status UploadStatus @default(STAGING)
  hash          String
  metadata      Json?
}
```

### Statuts d'Upload

| Statut | Description |
|--------|-------------|
| `STAGING` | En attente de traitement |
| `PROCESSING` | Traitement en cours |
| `UPLOADED` | Traitement terminé, disponible |
| `FAILED` | Échec du traitement |
| `IN_QUARANTINE` | Fichier infecté isolé |

## Auteur

Développé dans le cadre du test technique Asernum.
