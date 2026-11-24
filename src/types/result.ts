// Compatibility shim: Result type now passes through values directly.
// Services throw on error; consumers await values directly.
export type Result<T, _E = unknown> = T;

export const Ok = <T>(value: T): T => value;
export const Err = (error: any): never => {
  throw error instanceof Error ? error : new Error(error?.message || 'Erro inesperado');
};

export const toResult = async <T>(promise: Promise<T>): Promise<T> => promise;
