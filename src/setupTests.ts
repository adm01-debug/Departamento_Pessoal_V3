import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { createSupabaseMock } from './test/supabaseMock';

/**
 * Mock global do client Supabase.
 *
 * Motivo: os serviços exigem isolamento de tenant e encadeiam múltiplos
 * `.eq()`; mocks ad-hoc por arquivo quebravam a cada nível novo de
 * encadeamento. Este mock é totalmente encadeável e *thenable*.
 * Arquivos de teste que declaram o próprio `vi.mock` continuam prevalecendo.
 */
vi.mock('@/integrations/supabase/client', async () => {
  const mock = createSupabaseMock();
  return { supabase: mock, default: mock };
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = ResizeObserver;

// Mock URL.createObjectURL / revokeObjectURL for jsdom (used by Excel/PDF exports).
// Always override: jsdom's own implementation (present since jsdom 30.1) expects its
// internal Blob shape and throws on Blobs built from ExcelJS/PDF buffers in tests.
(URL as any).createObjectURL = vi.fn(() => 'blob:mock');
(URL as any).revokeObjectURL = vi.fn();
