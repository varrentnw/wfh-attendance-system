// apps/gateway/src/auth/authenticated-request.ts
import type { Request } from 'express';
import { JwtPayload } from '@app/common';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}
