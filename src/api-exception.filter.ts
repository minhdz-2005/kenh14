import type { Response } from 'express';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
  HttpStatus,
  UnprocessableEntityException,
  ValidationError,
} from '@nestjs/common';

type ErrorEnvelope = Record<string, string[]>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function collectValidationMessages(
  error: ValidationError,
  envelope: ErrorEnvelope,
): void {
  if (error.constraints) {
    const messages = envelope[error.property] ?? [];
    envelope[error.property] = [
      ...messages,
      ...Object.values(error.constraints),
    ];
  }
  for (const child of error.children ?? []) {
    collectValidationMessages(child, envelope);
  }
}

export function createValidationException(errors: ValidationError[]): UnprocessableEntityException {
  const envelope: ErrorEnvelope = {};
  for (const error of errors) {
    collectValidationMessages(error, envelope);
  }
  return new UnprocessableEntityException({ errors: envelope });
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (!(exception instanceof HttpException)) {
      this.logger.error(
        exception instanceof Error ? exception.message : String(exception),
        exception instanceof Error ? exception.stack : undefined,
      );
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        errors: { message: ['Internal server error'] },
      });
      return;
    }

    const status = exception.getStatus();
    const body = exception.getResponse();
    let errors: ErrorEnvelope;

    if (typeof body === 'string') {
      errors = { message: [body] };
    } else if (isRecord(body) && isRecord(body.errors)) {
      errors = body.errors as ErrorEnvelope;
    } else if (isRecord(body) && 'message' in body) {
      errors = {
        message: Array.isArray(body.message)
          ? body.message.map(String)
          : [String(body.message)],
      };
    } else {
      errors = { message: ['Unexpected error'] };
    }

    response.status(status).json({ errors });
  }
}
