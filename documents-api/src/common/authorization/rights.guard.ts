import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RIGHTS_RULES_METADATA_KEY, RightRule } from './rights.types';
import { RightsService } from 'src/application/security/rights.service';

type AnyRecord = Record<string, any>;

@Injectable()
export class RightsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rightsService: RightsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rules = this.reflector.getAllAndOverride<RightRule[] | undefined>(
      RIGHTS_RULES_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!rules || rules.length === 0) {
      return true;
    }

    const req = context.switchToHttp().getRequest<AnyRecord>();
    const userId = req?.user?.sub as string | undefined;
    if (!userId) {
      throw new UnauthorizedException("Vous n'êtes pas autorisé à accéder à cette ressource");
    }

    const sharingToken = this.extractSharingToken(req);

    for (const rule of rules) {
      const id = this.extractResourceId(req, rule);
      if (!id) {
        if (rule.optional) continue;
        throw new BadRequestException(
          `Impossible de déterminer l'identifiant de la ressource (${rule.idSource ?? 'params'}.${rule.idParam ?? 'id'})`,
        );
      }

      const allowed = await this.rightsService.isAllowed(userId, rule, id, sharingToken);
      if (!allowed) {
        // Aligné avec les handlers existants (ForbiddenException)
        throw new ForbiddenException("Vous n'avez pas les droits pour effectuer cette action");
      }
    }

    return true;
  }

  private extractResourceId(req: AnyRecord, rule: RightRule): string | undefined {
    const source = rule.idSource ?? 'params';
    const key = rule.idParam ?? 'id';

    if (source === 'params') return this.readMaybeString(req?.params?.[key]);
    if (source === 'query') return this.readMaybeString(req?.query?.[key]);
    if (source === 'body') return this.readMaybeString(req?.body?.[key]);

    return undefined;
  }

  private readMaybeString(value: unknown): string | undefined {
    if (typeof value === 'string' && value.trim().length > 0) return value;
    return undefined;
  }

  private extractSharingToken(req: AnyRecord): string | undefined {
    const fromHeader =
      this.readMaybeString(req?.headers?.['x-sharing-token']) ??
      this.readMaybeString(req?.headers?.['x-share-token']) ??
      this.readMaybeString(req?.headers?.['sharing-token']) ??
      this.readMaybeString(req?.headers?.['share-token']);

    if (fromHeader) return fromHeader;

    const fromQuery =
      this.readMaybeString(req?.query?.['sharing_token']) ??
      this.readMaybeString(req?.query?.['share_token']) ??
      this.readMaybeString(req?.query?.['token']);

    return fromQuery;
  }
}

