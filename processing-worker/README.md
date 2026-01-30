# Processing Worker

Worker asynchrone pour le traitement sécurisé des documents uploadés.

## Description

Le service **Processing Worker** est responsable du traitement en arrière-plan des fichiers uploadés via l'API Documents. Il assure :

- L'analyse antivirus de chaque fichier via ClamAV
- L'extraction automatique des métadonnées (dimensions, durée, codec, etc.)
- La compression optionnelle des images, vidéos et fichiers audio
- Le déplacement des fichiers du bucket staging vers production
- La mise en quarantaine des fichiers infectés

Ce service consomme les événements Kafka publiés par l'API Documents et traite les jobs via une file BullMQ pour garantir la fiabilité et le retry automatique.

## Architecture

```
src/
├── commons/
│   ├── services/
│   │   ├── antivirus.service.ts       # Scan ClamAV
│   │   ├── rustfs.service.ts          # Client S3 (RustFS)
│   │   ├── document-metadata.service.ts
│   │   ├── image-processing.service.ts
│   │   ├── image-metadata.service.ts
│   │   ├── video-processing.service.ts
│   │   ├── video-metadata.service.ts
│   │   ├── audio-processing.service.ts
│   │   ├── audio-metadata.service.ts
│   │   ├── document-file-metadata.service.ts
│   │   └── ffmpeg-runner.service.ts
│   ├── messaging/kafka/              # Consumer Kafka
│   └── queue/bullmq/                 # Configuration BullMQ
└── resources/document-processing/
    ├── document-processing.service.ts
    ├── document-processing.controller.ts
    └── queue/
        ├── document-processing.processor.ts   # Worker BullMQ
        └── document-processing.queue.service.ts
```

## Stack Technique

| Technologie | Version | Usage |
|-------------|---------|-------|
| Node.js | 20.x | Runtime |
| NestJS | 11.x | Framework backend |
| Fastify | 5.x | Serveur HTTP |
| Prisma | 7.x | ORM PostgreSQL |
| BullMQ | 5.x | File de jobs avec retry |
| KafkaJS | 2.x | Consommation d'événements |
| ClamAV | - | Scan antivirus |
| Sharp | 0.34.x | Traitement d'images |
| FFmpeg | - | Traitement audio/vidéo |
| music-metadata | 11.x | Métadonnées audio |
| pdf-parse | 2.x | Métadonnées PDF |

## Flux de Traitement

```
┌───────┐     ┌──────────────────┐     ┌─────────┐     ┌─────────┐
│ Kafka │────▶│ Processing Worker│────▶│ ClamAV  │     │ RustFS  │
└───────┘     └────────┬─────────┘     └─────────┘     └────┬────┘
   │                   │                                    │
   │ document.uploaded │                                    │
   │                   ▼                                    │
   │            ┌────────────┐                              │
   │            │  BullMQ    │                              │
   │            │  (Redis)   │                              │
   │            └─────┬──────┘                              │
   │                  │                                     │
   │                  ▼                                     │
   │         ┌────────────────┐                             │
   │         │   Processor    │─────────────────────────────┘
   │         └────────────────┘
   │              │
   │              ├── Scan antivirus
   │              ├── Extraction métadonnées
   │              ├── Compression (optionnelle)
   │              └── Move staging → production
```

### Étapes du Traitement

1. **Réception** : Le consumer Kafka reçoit l'événement `document.uploaded`
2. **Mise en file** : Le job est ajouté à la queue BullMQ avec retry configuré
3. **Téléchargement** : Le fichier est récupéré depuis le bucket staging
4. **Scan antivirus** : ClamAV analyse le contenu du fichier
   - Si infecté → déplacement vers le bucket `quarantine`, statut `IN_QUARANTINE`
   - Si sain → poursuite du traitement
5. **Traitement média** (si options spécifiées) :
   - Images : compression via Sharp
   - Vidéos : compression via FFmpeg
   - Audio : compression via FFmpeg
6. **Extraction métadonnées** : dimensions, durée, codec, pages PDF, etc.
7. **Publication** : Déplacement du fichier vers le bucket `production`
8. **Mise à jour** : Statut `UPLOADED` en base de données

## Fonctionnalités

### Scan Antivirus

Intégration avec ClamAV via le protocole clamd :

```typescript
// Configuration ClamAV
CLAMAV_HOST=clamav
CLAMAV_PORT=3310
CLAMAV_TIMEOUT=60000
```

Le service gère gracieusement l'indisponibilité de ClamAV (mode dégradé).

### Extraction de Métadonnées

| Type de fichier | Métadonnées extraites |
|-----------------|----------------------|
| Images | Dimensions, format, espace colorimétrique |
| Vidéos | Durée, dimensions, codec, framerate, bitrate |
| Audio | Durée, codec, bitrate, sample rate, channels |
| PDF | Nombre de pages, auteur, titre |
| Archives (ZIP) | Liste des fichiers, taille décompressée |

### Compression Optionnelle

Lors de l'upload, le client peut spécifier des options de compression. Ces options sont transmises via l'événement Kafka et traitées par le worker.

#### Structure du DTO de Traitement

```json
{
  "document_id": "550e8400-e29b-41d4-a716-446655440000",
  "image_processing_opts": {
    "compression": {
      "level": 80
    }
  },
  "video_processing_opts": {
    "compression": {
      "level": 60
    }
  },
  "audio_processing_opts": {
    "compression": {
      "level": 70
    }
  },
  "doc_processing_opts": {
    "opts": {}
  }
}
```

#### Options de Compression

| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| `document_id` | UUID | Oui | ID du document à traiter |
| `image_processing_opts` | Object | Non | Options pour les images |
| `video_processing_opts` | Object | Non | Options pour les vidéos |
| `audio_processing_opts` | Object | Non | Options pour les fichiers audio |
| `doc_processing_opts` | Object | Non | Options pour les documents (réservé) |

#### Niveau de Compression

```json
{
  "compression": {
    "level": 80
  }
}
```

| Propriété | Type | Min | Max | Description |
|-----------|------|-----|-----|-------------|
| `level` | Integer | 1 | 99 | 1 = qualité maximale, 99 = compression maximale |

**Recommandations :**
- Images : `level: 80` (bon compromis qualité/taille)
- Vidéos : `level: 60` (préserve la qualité visuelle)
- Audio : `level: 70` (qualité acceptable pour la plupart des usages)

### Gestion des Buckets

| Bucket | Usage |
|--------|-------|
| `asernum-staging` | Fichiers en attente de traitement |
| `asernum-production` | Fichiers traités et validés |
| `asernum-quarantine` | Fichiers infectés isolés |
| `asernum-failed` | Fichiers en échec de traitement |

## Retry et Fiabilité

BullMQ assure la fiabilité du traitement avec :

- **Retry automatique** : 3 tentatives par défaut
- **Backoff exponentiel** : 5 secondes entre chaque retry
- **Idempotence** : Un document en `PROCESSING` peut être retraité
- **Marquage échec** : Après épuisement des retries, statut `FAILED`

```typescript
// Configuration BullMQ
BULLMQ_ATTEMPTS=3
BULLMQ_BACKOFF_MS=5000
BULLMQ_REMOVE_ON_FAIL=1000
BULLMQ_CONCURRENCY=3
```

## Variables d'Environnement

| Variable | Description | Exemple |
|----------|-------------|---------|
| `APP_PORT` | Port d'écoute | `3000` |
| `DATABASE_URL` | URL PostgreSQL | `postgresql://user:pass@host:5432/db` |
| `ACCESS_TOKEN_SECRET` | Secret JWT | `your-secret-key` |
| `REDIS_HOST` | Hôte Redis | `redis` |
| `REDIS_PORT` | Port Redis | `6379` |
| `KAFKA_BROKER_URL` | Broker Kafka | `kafka:9093` |
| `KAFKA_GROUP_ID` | Consumer group | `processing-worker` |
| `KAFKA_CONCURRENCY` | Concurrence Kafka | `1` |
| `CLAMAV_HOST` | Hôte ClamAV | `clamav` |
| `CLAMAV_PORT` | Port ClamAV | `3310` |
| `RUSTFS_ENDPOINT` | Endpoint S3 | `http://rustfs:9000` |
| `RUSTFS_BUCKET` | Bucket staging | `asernum-staging` |
| `RUSTFS_PRODUCTION_BUCKET` | Bucket production | `asernum-production` |
| `RUSTFS_QUARANTINE_BUCKET` | Bucket quarantaine | `asernum-quarantine` |
| `RUSTFS_FAILED_BUCKET` | Bucket échecs | `asernum-failed` |

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

L'image inclut les dépendances système nécessaires (OpenSSL pour Prisma).

```bash
# Build de l'image
docker build -t processing-worker .

# Lancement via docker-compose
docker-compose up -d
```

## Dépendances Externes

Le service nécessite les services suivants :

- **PostgreSQL** : Base de données partagée avec Documents API
- **Redis** : Backend pour BullMQ
- **Kafka** : Bus d'événements
- **ClamAV** : Service antivirus (clamd)
- **RustFS** : Stockage S3-compatible

## Monitoring

Le service expose des logs structurés pour chaque job :

```
[DocumentProcessingProcessor] Début job id=123 document_id=abc attempt=1
[DocumentProcessingProcessor] Fin job OK id=123 document_id=abc
```

En cas d'échec :

```
[DocumentProcessingProcessor] Échec job id=123 document_id=abc attempt=3: Error message
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

## Auteur

Développé dans le cadre du test technique Asernum.
