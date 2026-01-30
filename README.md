# Asernum File Management System

Système de gestion de fichiers sécurisé avec partage collaboratif, scan antivirus et traitement multimédia.

## Vue d'ensemble

Cette architecture microservices permet aux utilisateurs de :

- Uploader, organiser et gérer leurs documents dans une arborescence de dossiers
- Bénéficier d'un scan antivirus automatique sur chaque fichier
- Partager des documents/dossiers via des liens publics ou des invitations privées
- Profiter d'un traitement automatique des médias (extraction métadonnées, compression)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                │                                    │
                ▼                                    ▼
┌───────────────────────────┐          ┌───────────────────────────┐
│      Documents API        │          │       Sharing API         │
│       (Port 3001)         │          │       (Port 3002)         │
└─────────────┬─────────────┘          └───────────────────────────┘
              │                                    │
              │ Kafka                              │
              ▼                                    │
┌───────────────────────────┐                      │
│    Processing Worker      │                      │
│       (Port 3003)         │                      │
└─────────────┬─────────────┘                      │
              │                                    │
              ▼                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SERVICES EXTERNES                                 │
├─────────────┬─────────────┬─────────────┬─────────────┬─────────────────────┤
│  PostgreSQL │    Redis    │    Kafka    │   RustFS    │       ClamAV        │
│   (5432)    │   (6379)    │(9092/9093)  │ (9000/9001) │       (3310)        │
└─────────────┴─────────────┴─────────────┴─────────────┴─────────────────────┘
```

---

## Services

### Services Internes (Développés)

| Service | Port | Description |
|---------|------|-------------|
| **documents-api** | 3001 | API principale pour la gestion des documents et dossiers. Gère l'upload, le téléchargement, l'organisation en arborescence et publie les événements vers Kafka. [Voir README](./documents-api/README.md) |
| **processing-worker** | 3003 | Worker asynchrone qui traite les fichiers uploadés : scan antivirus, extraction de métadonnées, compression optionnelle et déplacement vers le stockage de production. [Voir README](./processing-worker/README.md) |
| **sharing-api** | 3002 | API de gestion des liens de partage avec support des modes public/privé, niveaux d'accès configurables et expiration automatique. [Voir README](./sharing-api/README.md) |

### Services Externes (Infrastructure)

| Service | Port(s) | Description |
|---------|---------|-------------|
| **PostgreSQL** | 5432 | Base de données relationnelle partagée entre les 3 services internes |
| **Redis** | 6379 | Backend pour les files de jobs BullMQ (processing-worker, sharing-api) |
| **Kafka** | 9092 (externe), 9093 (interne) | Bus d'événements pour la communication asynchrone entre services |
| **RustFS** | 9000 (S3), 9001 (Console) | Stockage objet S3-compatible avec interface web d'administration |
| **ClamAV** | 3310 | Service antivirus pour le scan des fichiers uploadés |

---

## Installation et Déploiement

### Prérequis

- **Docker Desktop** avec Docker Compose v2
- **Git Bash** (Windows) ou terminal Unix

### Déploiement Initial

Le script `deploy.sh` orchestre le déploiement de toute l'architecture.

```bash
# Rendre le script exécutable (si nécessaire)
chmod +x deploy.sh

# Lancer le script
./deploy.sh
```

Un menu interactif s'affiche :

```
============================
 Déploiement - Menu
============================
  1) Démarrer toute l'architecture (down puis up, ordre imposé)
  2) Démarrer un projet (docker-compose)
  3) Démarrer un service (dans un projet)
  4) Arrêter toute l'architecture (down)
  5) Statut (ps) de tous les projets
  0) Quitter
>
```

**Pour le premier déploiement, choisir l'option `1`.**

Cette option :
1. Arrête tous les conteneurs existants
2. Démarre les services externes dans l'ordre (ClamAV, Kafka, PostgreSQL, Redis, RustFS)
3. Build et démarre les services internes (documents-api, processing-worker, sharing-api)

### Configuration de RustFS (Obligatoire)

Après le déploiement initial, il faut générer des clés d'accès pour le stockage :

1. **Accéder à la console RustFS**
   ```
   http://localhost:9001
   ```

2. **Se connecter avec les identifiants par défaut**
   - **Access Key** : `rustfsadmin`
   - **Secret Key** : `z7i9zkj2iq8baug6`

3. **Générer de nouvelles clés d'accès**
   - Dans le menu latéral, cliquer sur **Access Keys**
   - Cliquer sur **Create access key**
   - Copier les clés générées (Access Key et Secret Key)

4. **Mettre à jour les variables d'environnement**
   
   Modifier les variables `RUSTFS_ACCESS_KEY` et `RUSTFS_SECRET_KEY` dans les fichiers :
   - `documents-api/docker-compose.yml`
   - `processing-worker/docker-compose.yml`

5. **Redéployer les services concernés**
   
   Relancer `./deploy.sh` et choisir l'option `2` (Démarrer un projet) pour redéployer :
   - `documents-api`
   - `processing-worker`

### Vérification du Déploiement

```bash
# Via le script
./deploy.sh
# Choisir option 5 (Statut)

# Ou directement
docker ps
```

Tous les conteneurs doivent être en état `Up`.

### URLs des Services

| Service | URL |
|---------|-----|
| Documents API (Swagger) | http://localhost:3001/api/docs |
| Processing Worker (Swagger) | http://localhost:3003/api/docs |
| Sharing API (Swagger) | http://localhost:3002/api/docs |
| RustFS Console | http://localhost:9001 |

---

## Défis Rencontrés

### 1. Gestion du Multi-Bucket avec RustFS

La mise en place d'une stratégie de buckets séparés (staging, production, quarantine, failed) a nécessité une réflexion approfondie sur les flux de données. Le défi principal était de garantir l'atomicité des opérations de déplacement entre buckets tout en gérant les cas d'erreur.

### 2. Intégration ClamAV dans un Environnement Conteneurisé

L'intégration de ClamAV a posé plusieurs défis :
- La communication via le protocole clamd nécessite une configuration réseau spécifique
- La gestion du mode dégradé quand ClamAV n'est pas disponible
- Le temps de chargement des signatures virales au démarrage du conteneur

### 3. Architecture Event-Driven avec Kafka + BullMQ

Combiner Kafka (pour la communication inter-services) et BullMQ (pour les jobs avec retry) a demandé une réflexion sur la séparation des responsabilités :
- Kafka pour les événements "fire and forget" entre services
- BullMQ pour les jobs qui nécessitent retry, backoff et traçabilité

### 4. Gestion des Statuts de Partage avec Expiration

Implémenter un système d'expiration fiable pour les invitations et les liens de partage a été complexe :
- Planification de jobs différés via BullMQ
- Gestion des cas limites (annulation avant expiration, redémarrage du service)
- Maintien de la cohérence entre le statut en base et les jobs planifiés

### 5. Traitement Multimédia avec FFmpeg

L'intégration de FFmpeg pour le traitement audio/vidéo a présenté des défis :
- Gestion des différents codecs et formats
- Optimisation de la compression selon le type de média
- Gestion de la mémoire pour les fichiers volumineux

---

## Axes d'Amélioration

### Court Terme

- [ ] **Tests unitaires et d'intégration** : Augmenter la couverture de tests pour les services critiques
- [ ] **Validation des types MIME** : Renforcer la validation des types de fichiers acceptés
- [ ] **Rate limiting** : Implémenter une limitation du nombre de requêtes par utilisateur
- [ ] **Logging centralisé** : Mettre en place une stack de logging (ELK ou Loki)

### Moyen Terme

- [ ] **Notifications temps réel** : WebSocket ou SSE pour notifier les utilisateurs (traitement terminé, nouvelle invitation)
- [ ] **Prévisualisation des documents** : Génération de thumbnails pour images/vidéos/PDF
- [ ] **Recherche full-text** : Intégration d'Elasticsearch pour la recherche dans le contenu des documents
- [ ] **Gestion des versions** : Historique des versions pour chaque document

### Long Terme

- [ ] **Chiffrement côté client** : Chiffrement E2E des documents sensibles
- [ ] **Multi-tenancy** : Support de plusieurs organisations avec isolation des données
- [ ] **API Gateway** : Centralisation des points d'entrée avec Kong ou Traefik
- [ ] **Kubernetes** : Migration vers K8s pour une meilleure scalabilité

### Optimisations Techniques

- [ ] **Gestion des permissions PBAC** : Améliorer le système d'autorisations pour être conforme au modèle Policy-Based Access Control (politiques centralisées, conditions dynamiques, audit des accès)
- [ ] **Streaming upload** : Upload direct vers RustFS sans buffer en mémoire
- [ ] **Compression à la volée** : Compression pendant le transfert pour réduire la bande passante
- [ ] **Cache Redis** : Mise en cache des métadonnées fréquemment accédées
- [ ] **Health checks** : Endpoints de santé pour chaque service avec métriques

---

## Structure du Projet

```
livrables-test-asernum/
├── deploy.sh                 # Script de déploiement interactif
├── README.md                 # Ce fichier
│
├── documents-api/            # API de gestion des documents
│   ├── src/
│   ├── prisma/
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── README.md
│
├── processing-worker/        # Worker de traitement asynchrone
│   ├── src/
│   ├── prisma/
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── README.md
│
├── sharing-api/              # API de partage
│   ├── src/
│   ├── prisma/
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── README.md
│
├── postgres/                 # Configuration PostgreSQL
│   └── docker-compose.yml
│
├── redis/                    # Configuration Redis
│   └── docker-compose.yml
│
├── kafka/                    # Configuration Kafka
│   └── docker-compose.yml
│
├── rustfs/                   # Configuration RustFS (S3)
│   ├── docker-compose.yml
│   └── init.sh
│
└── clamav/                   # Configuration ClamAV
    └── docker-compose.yml
```

---

## Auteur

Développé dans le cadre du test technique Asernum.
