import type { documents, Prisma } from '../../../../generated/prisma/client';

export const DOCUMENTS_REPOSITORY = Symbol('DOCUMENTS_REPOSITORY');

export interface DocumentsRepository {
  findById(id: string): Promise<documents | null>;
  updateById(id: string, data: Prisma.documentsUpdateInput): Promise<documents>;
}

