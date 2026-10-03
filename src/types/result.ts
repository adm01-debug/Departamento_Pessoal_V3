// Compatibility shim: Result type now passes through values directly.
// Services throw on error; consumers await values directly.
export type Result<T, _E = unknown> = T;

export const Ok = <T>(value: T): T => value;
export const Err = (error: unknown): never => {
  throw error instanceof Error
    ? error
    : new Error(
        typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message: unknown }).message)
          : 'Erro inesperado'
      );
};

export const toResult = async <T>(promise: Promise<T>): Promise<T> => promise;
