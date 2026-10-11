import { describe, expect, it, vi } from 'vitest';

vi.mock('../loggerService', () => ({
  loggerService: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { useMetabaseEmbed } from '../metabaseService';

describe('useMetabaseEmbed', () => {
  it('sem VITE_METABASE_SITE_URL devolve placeholder + loading', () => {
    vi.stubEnv('VITE_METABASE_SITE_URL', '');
    const props = useMetabaseEmbed({ dashboardId: 7 });
    expect(props.src).toBe('/metabase-placeholder');
    expect(props.loading).toBe(true);
    expect(props.title).toBe('Dashboard 7');
  });

  it('com siteUrl + secret monta URL do dashboard com filtros', () => {
    vi.stubEnv('VITE_METABASE_SITE_URL', 'https://mb.example.com');
    vi.stubEnv('VITE_METABASE_SECRET_KEY', 'segredo');
    const props = useMetabaseEmbed({
      dashboardId: 12,
      params: { empresa_id: 'e-1', regiao: ['sp', 'rj'] },
      title: 'RH Overview',
      height: '600px',
    });
    expect(props.src).toContain('https://mb.example.com/dashboard/12');
    expect(props.src).toContain('filter_empresa_id=e-1');
    expect(props.src).toContain('filter_regiao=sp');
    expect(props.src).toContain('filter_regiao=rj');
    expect(props.title).toBe('RH Overview');
    expect(props.loading).toBe(false);
    expect(props.style.height).toBe('600px');
  });

  it('sem secret configurado lança erro explicando o modo correto', () => {
    vi.stubEnv('VITE_METABASE_SITE_URL', 'https://mb.example.com');
    vi.stubEnv('VITE_METABASE_SECRET_KEY', '');
    expect(() => useMetabaseEmbed({ dashboardId: 1 })).toThrow(/SECRET_KEY não configurado/);
  });

  it('defaults: title/height/allow quando não informados', () => {
    vi.stubEnv('VITE_METABASE_SITE_URL', 'https://mb.example.com');
    vi.stubEnv('VITE_METABASE_SECRET_KEY', 'segredo');
    const props = useMetabaseEmbed({ dashboardId: 3 });
    expect(props.height).toBe('800px');
    expect(props.allow).toBe('fullscreen');
    expect(props.title).toBe('Dashboard 3');
  });
});
