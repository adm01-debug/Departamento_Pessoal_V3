import { describe, it, expect } from 'vitest';
import { reducer } from '../useToast';

// useToast exports a pure `reducer` function — test it without React rendering.

type State = { toasts: Array<{ id: string; open?: boolean; title?: string }> };

describe('useToast reducer', () => {
  describe('ADD_TOAST', () => {
    it('adds a toast to an empty state', () => {
      const state: State = { toasts: [] };
      const next = reducer(state as any, {
        type: 'ADD_TOAST',
        toast: { id: '1', title: 'Hello', open: true },
      } as any);
      expect(next.toasts).toHaveLength(1);
      expect(next.toasts[0].id).toBe('1');
      expect(next.toasts[0].title).toBe('Hello');
    });

    it('prepends the newest toast (newest first)', () => {
      const state: State = { toasts: [{ id: '1', open: true }] };
      const next = reducer(state as any, {
        type: 'ADD_TOAST',
        toast: { id: '2', title: 'Second', open: true },
      } as any);
      expect(next.toasts[0].id).toBe('2');
    });

    it('respects TOAST_LIMIT = 1 (oldest toast is dropped)', () => {
      const state: State = { toasts: [{ id: '1', open: true }] };
      const next = reducer(state as any, {
        type: 'ADD_TOAST',
        toast: { id: '2', title: 'Second', open: true },
      } as any);
      expect(next.toasts).toHaveLength(1);
      expect(next.toasts[0].id).toBe('2');
    });
  });

  describe('UPDATE_TOAST', () => {
    it('updates matching toast by id', () => {
      const state: State = { toasts: [{ id: '1', title: 'Old', open: true }] };
      const next = reducer(state as any, {
        type: 'UPDATE_TOAST',
        toast: { id: '1', title: 'New' },
      } as any);
      expect(next.toasts[0].title).toBe('New');
    });

    it('does not affect non-matching toasts', () => {
      const state: State = { toasts: [{ id: '1', title: 'Keep', open: true }] };
      const next = reducer(state as any, {
        type: 'UPDATE_TOAST',
        toast: { id: '99', title: 'Changed' },
      } as any);
      expect(next.toasts[0].title).toBe('Keep');
    });
  });

  describe('DISMISS_TOAST', () => {
    it('sets open=false for the specified toast', () => {
      const state: State = { toasts: [{ id: '1', open: true }] };
      const next = reducer(state as any, {
        type: 'DISMISS_TOAST',
        toastId: '1',
      } as any);
      expect(next.toasts[0].open).toBe(false);
    });

    it('dismisses all toasts when toastId is undefined', () => {
      const state: State = {
        toasts: [
          { id: '1', open: true },
          { id: '2', open: true },
        ],
      };
      const next = reducer(state as any, { type: 'DISMISS_TOAST' } as any);
      expect(next.toasts.every((t: any) => !t.open)).toBe(true);
    });

    it('leaves other toasts open when dismissing by id', () => {
      const state: State = {
        toasts: [
          { id: '1', open: true },
          { id: '2', open: true },
        ],
      };
      const next = reducer(state as any, {
        type: 'DISMISS_TOAST',
        toastId: '1',
      } as any);
      const t1 = next.toasts.find((t: any) => t.id === '1');
      const t2 = next.toasts.find((t: any) => t.id === '2');
      expect(t1?.open).toBe(false);
      expect(t2?.open).toBe(true);
    });
  });

  describe('REMOVE_TOAST', () => {
    it('removes the specified toast', () => {
      const state: State = {
        toasts: [
          { id: '1', open: false },
          { id: '2', open: false },
        ],
      };
      const next = reducer(state as any, {
        type: 'REMOVE_TOAST',
        toastId: '1',
      } as any);
      expect(next.toasts).toHaveLength(1);
      expect(next.toasts[0].id).toBe('2');
    });

    it('clears all toasts when toastId is undefined', () => {
      const state: State = { toasts: [{ id: '1', open: false }] };
      const next = reducer(state as any, { type: 'REMOVE_TOAST' } as any);
      expect(next.toasts).toHaveLength(0);
    });

    it('keeps toasts when id not found', () => {
      const state: State = { toasts: [{ id: '1', open: false }] };
      const next = reducer(state as any, {
        type: 'REMOVE_TOAST',
        toastId: '99',
      } as any);
      expect(next.toasts).toHaveLength(1);
      expect(next.toasts[0].id).toBe('1');
    });
  });
});
