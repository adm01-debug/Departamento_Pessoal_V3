import { describe, it, expect } from 'vitest';
import { 
  AppError, 
  ValidationError, 
  AuthError, 
  NetworkError, 
  PermissionError,
  getErrorMessage,
  isAppError 
} from '../errors/AppError';

describe('Error Handling Suite', () => {
  it('should correctly identify AppError instances', () => {
    const error = new ValidationError('Invalid field');
    expect(isAppError(error)).toBe(true);
    expect(error.type).toBe('VALIDATION_ERROR');
  });

  it('should create AuthError with correct type', () => {
    const error = new AuthError('Login failed');
    expect(error.type).toBe('AUTH_ERROR');
  });

  it('should create PermissionError with correct type', () => {
    const error = new PermissionError('RLS check failed');
    expect(error.type).toBe('PERMISSION_DENIED');
  });

  it('should return correct message via getErrorMessage', () => {
    const msg = 'Test Error';
    const appError = new AppError(msg, 'TEST_CODE' as any);
    expect(getErrorMessage(appError)).toBe(msg);
    expect(getErrorMessage(new Error('Normal Error'))).toBe('Normal Error');
    expect(getErrorMessage('String error')).toBe('String error');
  });
});

