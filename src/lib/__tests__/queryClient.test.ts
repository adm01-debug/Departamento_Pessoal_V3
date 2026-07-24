import { describe, it, expect, beforeEach } from 'vitest';
import { queryClient, invalidateQueries, prefetchQuery, setQueryData, getQueryData } from '../queryClient';

describe('queryClient', () => {
  it('is a QueryClient instance', () => {
    expect(typeof queryClient.invalidateQueries).toBe('function');
    expect(typeof queryClient.prefetchQuery).toBe('function');
  });

  it('has staleTime of 5 minutes', () => {
    const defaults = queryClient.getDefaultOptions();
    expect(defaults.queries?.staleTime).toBe(1000 * 60 * 5);
  });

  it('has gcTime of 30 minutes', () => {
    const defaults = queryClient.getDefaultOptions();
    expect(defaults.queries?.gcTime).toBe(1000 * 60 * 30);
  });

  it('has retry=1 for queries', () => {
    const defaults = queryClient.getDefaultOptions();
    expect(defaults.queries?.retry).toBe(1);
  });

  it('has retry=0 for mutations', () => {
    const defaults = queryClient.getDefaultOptions();
    expect(defaults.mutations?.retry).toBe(0);
  });
});

describe('setQueryData and getQueryData', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('sets and retrieves data by string key', () => {
    setQueryData('test-key', { value: 42 });
    const data = getQueryData<{ value: number }>('test-key');
    expect(data?.value).toBe(42);
  });

  it('sets and retrieves data by array key', () => {
    setQueryData(['users', 'list'], [{ id: 1 }]);
    const data = getQueryData<Array<{ id: number }>>(['users', 'list']);
    expect(data).toHaveLength(1);
    expect(data?.[0].id).toBe(1);
  });

  it('returns undefined for nonexistent key', () => {
    const data = getQueryData('nonexistent-key-xyz');
    expect(data).toBeUndefined();
  });
});

describe('invalidateQueries', () => {
  it('accepts a string key without throwing', () => {
    expect(() => invalidateQueries('test-invalidate')).not.toThrow();
  });

  it('accepts an array key without throwing', () => {
    expect(() => invalidateQueries(['test', 'nested'])).not.toThrow();
  });
});

describe('prefetchQuery', () => {
  it('calls the queryFn when not in cache', async () => {
    let called = false;
    await prefetchQuery('prefetch-test', async () => {
      called = true;
      return { data: 'ok' };
    });
    expect(called).toBe(true);
  });
});
