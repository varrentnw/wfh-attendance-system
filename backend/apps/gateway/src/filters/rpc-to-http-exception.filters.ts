import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { RpcErrorPayload } from '@app/common';

function isRpcErrorPayload(value: unknown): value is RpcErrorPayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    'statusCode' in value &&
    typeof value.statusCode === 'number' &&
    'message' in value &&
    (typeof value.message === 'string' ||
      (Array.isArray(value.message) &&
        value.message.every((m) => typeof m === 'string')))
  );
}

@Catch()
export class RpcToHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(RpcToHttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      // the gateway's own errors, e.g. validation
      return response
        .status(exception.getStatus())
        .json(exception.getResponse());
    }

    if (isRpcErrorPayload(exception)) {
      // a structured error from a service
      return response.status(exception.statusCode).json(exception);
    }

    this.logger.error(exception); // unknown: log the details on the server...
    return response
      .status(500)
      .json({ statusCode: 500, message: 'Internal server error' }); // ...but don't send them to the client
  }
}
