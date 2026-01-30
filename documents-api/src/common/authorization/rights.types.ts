export enum RightAction {
  READ = 'read',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  MOVE = 'move',
  DOWNLOAD = 'download',
  RESTORE = 'restore',
  UPLOAD = 'upload',
}

export enum RightResource {
  DOCUMENT = 'document',
  FOLDER = 'folder',
}

export type RightIdSource = 'params' | 'body' | 'query';

export interface RightRule {
  action: RightAction;
  resource: RightResource;
  /**
   * Nom du champ contenant l'ID de la ressource.
   * - par défaut: "id"
   */
  idParam?: string;
  /**
   * Où lire l'ID (params/body/query).
   * - par défaut: "params"
   */
  idSource?: RightIdSource;
  /**
   * Si true et que l'ID est absent, on ne bloque pas.
   * Utile pour des champs optionnels (ex: parent_id).
   */
  optional?: boolean;
  /**
   * Si true, autorise la ressource même si deleted_at != null.
   */
  includeDeleted?: boolean;
}

export const RIGHTS_RULES_METADATA_KEY = 'authorization:rights_rules';

