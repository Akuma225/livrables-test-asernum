import { Injectable } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';
import JSZip from 'jszip';

type MinimalDocumentInfo = {
  original_name?: string | null;
  mime_type?: string | null;
  size?: number | null;
};

@Injectable()
export class DocumentFileMetadataService {
  async extractPdf(document: MinimalDocumentInfo, buffer: Buffer): Promise<Record<string, any>> {
    const parser = new PDFParse({ data: buffer });
    try {
      const info = await parser.getInfo();
      const dates = info.getDateNode?.() ?? {};

      return {
        kind: 'document',
        format: 'pdf',
        mimeType: document.mime_type ?? null,
        originalName: document.original_name ?? null,
        size: document.size ?? null,
        pages: info.total ?? null,
        title: info.info?.Title ?? null,
        author: info.info?.Author ?? null,
        subject: info.info?.Subject ?? null,
        creator: info.info?.Creator ?? null,
        producer: info.info?.Producer ?? null,
        creationDate: dates.CreationDate ? dates.CreationDate.toISOString() : null,
        modificationDate: dates.ModDate ? dates.ModDate.toISOString() : null,
      };
    } finally {
      await parser.destroy().catch(() => undefined);
    }
  }

  async extractDocx(document: MinimalDocumentInfo, buffer: Buffer): Promise<Record<string, any>> {
    const zip = await JSZip.loadAsync(buffer);
    const appXml = await zip.file('docProps/app.xml')?.async('string');
    const coreXml = await zip.file('docProps/core.xml')?.async('string');

    const getNum = (xml: string | undefined, tag: string) => {
      const m = xml?.match(new RegExp(`<${tag}>(\\d+)</${tag}>`));
      return m ? Number(m[1]) : null;
    };
    const getText = (xml: string | undefined, tag: string) => {
      const m = xml?.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
      return m ? m[1].trim() : null;
    };

    return {
      kind: 'document',
      format: 'docx',
      mimeType: document.mime_type ?? null,
      originalName: document.original_name ?? null,
      size: document.size ?? null,
      pages: getNum(appXml, 'Pages'),
      words: getNum(appXml, 'Words'),
      characters: getNum(appXml, 'Characters'),
      paragraphs: getNum(appXml, 'Paragraphs'),
      lines: getNum(appXml, 'Lines'),
      creator: getText(coreXml, 'dc:creator'),
      lastModifiedBy: getText(coreXml, 'cp:lastModifiedBy'),
      createdAt: getText(coreXml, 'dcterms:created'),
      modifiedAt: getText(coreXml, 'dcterms:modified'),
    };
  }

  extractDoc(document: MinimalDocumentInfo): Record<string, any> {
    return {
      kind: 'document',
      format: 'doc',
      mimeType: document.mime_type ?? null,
      originalName: document.original_name ?? null,
      size: document.size ?? null,
      pages: null,
      warning: 'Extraction avancée non supportée pour .doc (binaire).',
    };
  }
}

