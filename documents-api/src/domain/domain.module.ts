import { Module } from "@nestjs/common";

/**
 * Module principal du domaine.
 * Contient les entités, interfaces de repositories et events du domaine.
 * Ce module n'exporte pas de providers car les entités et interfaces
 * sont utilisées directement via les imports TypeScript.
 */
@Module({})
export class DomainModule {}
