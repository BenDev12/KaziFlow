import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ConflictError,
  DomainError,
  ForbiddenError,
  NotFoundError,
  TenantContextMissingError,
  UnauthorizedError,
  ValidationError,
} from '../../domain/errors/domain-error';

const STATUS_BY_ERROR = new Map<new (...args: never[]) => DomainError, HttpStatus>([
  [NotFoundError, HttpStatus.NOT_FOUND],
  [ValidationError, HttpStatus.BAD_REQUEST],
  [ConflictError, HttpStatus.CONFLICT],
  [UnauthorizedError, HttpStatus.UNAUTHORIZED],
  [ForbiddenError, HttpStatus.FORBIDDEN],
  [TenantContextMissingError, HttpStatus.INTERNAL_SERVER_ERROR],
]);

/**
 * Single place that turns any thrown error into an HTTP response, so
 * controllers never need try/catch. Nest's own HttpExceptions (thrown by
 * guards, ValidationPipe, etc.) pass through as-is; DomainError subclasses
 * from the application layer map to the right status code; anything else
 * is an unhandled bug and returns an opaque 500.
 */
@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      response.status(exception.getStatus()).json(exception.getResponse());
      return;
    }

    if (exception instanceof DomainError) {
      const errorType = exception.constructor as new (...args: never[]) => DomainError;
      const status = STATUS_BY_ERROR.get(errorType) ?? HttpStatus.BAD_REQUEST;
      response
        .status(status)
        .json({ statusCode: status, code: exception.code, message: exception.message });
      return;
    }

    this.logger.error(exception instanceof Error ? exception.stack : exception);
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    });
  }
}
