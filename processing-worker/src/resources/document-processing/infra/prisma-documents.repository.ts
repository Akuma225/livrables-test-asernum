import type { Prisma } from '../../../../generated/prisma/client';
import { prisma } from 'src/libs/prisma/prisma';
import type { DocumentsRepository } from '../ports/documents-repository.port';

export class PrismaDocumentsRepository implements DocumentsRepository {
  findById(id: string) {
    return prisma.documents.findUnique({ where: { id } });
  }

  updateById(id: string, data: Prisma.documentsUpdateInput) {
    return prisma.documents.update({ where: { id }, data });
  }
}

