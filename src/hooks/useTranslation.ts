/**
 * P5-087: i18n — Configuração e hook de tradução
 *
 * Implementação leve (sem i18next ainda):
 *   - Carrega JSON de locale sob demanda
 *   - Persiste seleção em localStorage
 *   - Fallback: pt-BR se locale não existe
 *   - Pluralização nativa via Intl.PluralRules
 *   - DateFormat com Intl.DateTimeFormat
 *   - Currency/Number via Intl.NumberFormat
 *
 * Quando i18next for instalado:
 *   npm install i18next react-i18next i18next-browser-languagedetector
 *   Substituir este arquivo pelo setup completo com:
 *     - Detection automática de idioma do browser
 *     - Lazy loading de namespaces
 *     - Interpolação avançada
 *     - Pluralização madura
 */

import { useState, useEffect, useCallback } from 'react';

export type Locale = 'pt-BR' | 'en-US' | 'es-ES';

const LOCALE_CONFIG: Record<Locale, {
  label: string;
  flag: string;
  dateFormat: Intl.DateTimeFormatOptions;
  pluralRules: Intl.PluralRulesOptions;
}> = {
  'pt-BR': {
    label: 'Português (Brasil)',
    flag: '🇧🇷',
    dateFormat: { day: '2-digit', month: '2-digit', year: 'numeric' },
    pluralRules: { type: 'cardinal' },
  },
  'en-US': {
    label: 'English (US)',
    flag: '🇺🇸',
    dateFormat: { month: 'short', day: '2-digit', year: 'numeric' },
    pluralRules: { type: 'cardinal' },
  },
  'es-ES': {
    label: 'Español',
    flag: '🇪🇸',
    dateFormat: { day: '2-digit', month: 'short', year: 'numeric' },
    pluralRules: { type: 'cardinal' },
  },
};

const STORAGE_KEY = 'dp_locale';
const SUPPORTED: Locale[] = ['pt-BR', 'en-US', 'es-ES'];

// ── Cache de traduções carregadas ──────────────────────────────
const translationCache = new Map<Locale, Record<string, unknown>>();

function getStoredLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (stored && SUPPORTED.includes(stored)) return stored;
  } catch {
    // localStorage indisponível (SSR)
  }
  return 'pt-BR';
}

// ── Loader sob demanda (lazy) ────────────────────────────────
async function loadLocale(locale: Locale): Promise<Record<string, unknown>> {
  if (translationCache.has(locale)) {
    return translationCache.get(locale)!;
  }
  try {
    const translations = await import(`../locales/${locale}.json`);
    translationCache.set(locale, translations.default);
    return translations.default;
  } catch {
    // Se falhar, usa pt-BR como fallback
    if (locale !== 'pt-BR') {
      return loadLocale('pt-BR');
    }
    return {};
  }
}

// ── Getter aninhado de chave "a.b.c" ─────────────────────────
function getNestedValue(obj: unknown, path: string): string {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || current === undefined) return path;
    if (typeof current !== 'object') return path;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === 'string' ? current : path;
}

// ── Plural resolver ──────────────────────────────────────────
function resolvePlural(count: number, locale: Locale): string {
  const rules = new Intl.PluralRules(locale, LOCALE_CONFIG[locale].pluralRules);
  return rules.select(count); // 'one' | 'other' | ...
}

// ── Hook principal ───────────────────────────────────────────
export function useTranslation() {
  const [locale, setLocaleState] = useState<Locale>(getStoredLocale);
  const [translations, setTranslations] = useState<Record<string, unknown>>({});
  const [loaded, setLoaded] = useState(false);

  // Carrega locale armazenado ao montar
  useEffect(() => {
    loadLocale(getStoredLocale()).then(t => {
      setTranslations(t);
      setLoaded(true);
    });
  }, []);

  // Quando locale muda, recarrega traduções
  useEffect(() => {
    setLoaded(false);
    loadLocale(locale).then(t => {
      setTranslations(t);
      setLoaded(true);
    });
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // ignore
    }
  }, [locale]);

  const setLocale = useCallback((newLocale: Locale) => {
    if (SUPPORTED.includes(newLocale)) {
      setLocaleState(newLocale);
    }
  }, []);

  /** Ex: t('nav.dashboard') */
  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    let text = getNestedValue(translations, key);

    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replaceAll(`{{${k}}}`, String(v));
      }
    }
    return text;
  }, [translations]);

  /** Pluralização: tPlural('colaboradores', count) */
  const tPlural = useCallback((
    key: string,
    count: number,
    params?: Record<string, string | number>
  ): string => {
    const rule = resolvePlural(count, locale);
    const pluralKey = `${key}_${rule}`;
    let text = getNestedValue(translations, pluralKey);

    if (text === pluralKey) {
      // Fallback: tenta só a key singular
      text = getNestedValue(translations, key);
    }
    if (text === key) {
      return String(count);
    }

    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replaceAll(`{{${k}}}`, String(v));
      }
    }
    // Sempre substitui {{count}}
    return text.replaceAll('{{count}}', String(count));
  }, [translations, locale]);

  /** Formatar data: formatDate(new Date(), 'short') */
  const formatDate = useCallback((
    date: Date | string | number,
    options?: Intl.DateTimeFormatOptions
  ): string => {
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    const opts = options ?? LOCALE_CONFIG[locale].dateFormat;
    return new Intl.DateTimeFormat(locale, opts).format(d);
  }, [locale]);

  /** Formatar currency: formatCurrency(1234.56, 'BRL') */
  const formatCurrency = useCallback((
    amount: number,
    currency = 'BRL'
  ): string => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).format(amount);
  }, [locale]);

  /** Formatar número: formatNumber(1234.567, { maximumFractionDigits: 2 }) */
  const formatNumber = useCallback((
    value: number,
    options?: Intl.NumberFormatOptions
  ): string => {
    return new Intl.NumberFormat(locale, options).format(value);
  }, [locale]);

  return {
    locale,
    setLocale,
    supportedLocales: SUPPORTED,
    localeConfig: LOCALE_CONFIG,
    t,
    tPlural,
    formatDate,
    formatCurrency,
    formatNumber,
    isLoaded: loaded,
  };
}
