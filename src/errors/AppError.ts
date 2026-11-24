// V15-001: Error Classes
import type { ErrorType, ErrorSeverity } from './types';

export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly severity: ErrorSeverity;
  public readonly code?: string;
  public readonly timestamp: Date;

  constructor(message: string, type: ErrorType = 'UNKNOWN_ERROR', severity: ErrorSeverity = 'error', code?: string) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.severity = severity;
    this.code = code;
    this.timestamp = new Date();
  }
}

export class ValidationError extends AppError {
  public readonly field?: string;

  constructor(message: string, field?: string) {
    super(message, 'VALIDATION_ERROR', 'warning');
    this.name = 'ValidationError';
    this.field = field;
  }
}

export class AuthError extends AppError {
  constructor(message = 'Não autorizado') {
    super(message, 'AUTH_ERROR', 'error');
    this.name = 'AuthError';
  }
}

export class NetworkError extends AppError {
  constructor(message = 'Erro de conexão') {
    super(message, 'NETWORK_ERROR', 'error');
    this.name = 'NetworkError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Recurso não encontrado') {
    super(message, 'NOT_FOUND', 'warning');
    this.name = 'NotFoundError';
  }
}

export class PermissionError extends AppError {
  constructor(message = 'Permissão negada') {
    super(message, 'PERMISSION_DENIED', 'error');
    this.name = 'PermissionError';
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) return error.message;
  if (error instanceof Error) return error.message;
  return String(error);
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
