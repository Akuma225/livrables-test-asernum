declare module 'clamscan' {
  interface ClamScanOptions {
    removeInfected?: boolean;
    quarantineInfected?: boolean;
    scanLog?: string | null;
    debugMode?: boolean;
    fileList?: string | null;
    scanRecursively?: boolean;
    clamdscan?: {
      socket?: string | null;
      host?: string;
      port?: number;
      timeout?: number;
      localFallback?: boolean;
      path?: string;
      configFile?: string | null;
      multiscan?: boolean;
      reloadDb?: boolean;
      active?: boolean;
      bypassTest?: boolean;
    };
    clamscan?: {
      path?: string;
      db?: string | null;
      scanArchives?: boolean;
      active?: boolean;
    };
    preference?: 'clamdscan' | 'clamscan';
  }

  interface ScanStreamResult {
    isInfected: boolean | null;
    viruses: string[];
  }

  interface ScanFileResult {
    isInfected: boolean | null;
    file: string;
    viruses: string[];
  }

  interface ScanDirResult {
    isInfected: boolean | null;
    badFiles: string[];
    goodFiles: string[];
    viruses: string[];
  }

  class NodeClam {
    constructor();
    init(options?: ClamScanOptions): Promise<NodeClam>;
    scanStream(stream: NodeJS.ReadableStream): Promise<ScanStreamResult>;
    scanFile(filePath: string): Promise<ScanFileResult>;
    scanDir(dirPath: string): Promise<ScanDirResult>;
    scanFiles(files: string[]): Promise<ScanFileResult[]>;
    getVersion(): Promise<string>;
    isInfected(filePath: string): Promise<boolean | null>;
    passthrough(): NodeJS.Transform;
  }

  export = NodeClam;
}
