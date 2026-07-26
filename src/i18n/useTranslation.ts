/**
 * useTranslation — React hook para i18n (P5-087)
 *
 * Uso:
 *   const { t, locale, setLocale, formatDate, formatCurrency } = useTranslation();
 *
 *   // String simples
 *   t('auth.signIn')
 *
 *   // Com variáveis
 *   t('dashboard.bem_vindo', { nome: 'Maria' })
 *
 *   // Pluralização
 *   t('common.n_registros', { count: 5 })
 *
 *   // Formatação
 *   formatCurrency(1250.50)      // "R$ 1.250,50"
 *   formatDate(new Date())      // "25/07/2026"
 *   formatDate(date, { year: 'numeric', month: 'long' }) // "julho de 2026"
 */
import { useState, useCallback, useEffect, useSyncExternalStore } from 'react';
import {
  i18n,
  Locale,
  SUPPORTED_LOCALES,
  setI18nLocale,
  onI18nLocaleChange,
} from './index.ts';

export { type Locale, SUPPORTED_LOCALES };

export function useTranslation() {
  // Sincroniza com store externo (listener pattern)
  const [, forceRender] = useState(0);

  useEffect(() => {
    const unsubscribe = onI18nLocaleChange(() => forceRender((n) => n + 1));
    return unsubscribe;
  }, []);

  const locale = i18n.locale;

  const setLocale = useCallback((newLocale: Locale) => {
    setI18nLocale(newLocale);
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, unknown>) => i18n.t(key, { vars }),
    [],
  );

  const formatDate = useCallback(
    (date: Date | string, options?: Intl.DateTimeFormatOptions) =>
      i18n.formatDate(date, options),
    [],
  );

  const formatNumber = useCallback(
    (value: number, options?: Intl.NumberFormatOptions) =>
      i18n.formatNumber(value, options),
    [],
  );

  const formatCurrency = useCallback(
    (value: number, currency?: string) =>
      i18n.formatCurrency(value, currency),
    [],
  );

  const formatRelativeTime = useCallback(
    (value: number, unit: Intl.RelativeTimeFormatUnit) =>
      i18n.formatRelativeTime(value, unit),
    [],
  );

  return {
    t,
    locale,
    setLocale,
    formatDate,
    formatNumber,
    formatCurrency,
    formatRelativeTime,
    supportedLocales: SUPPORTED_LOCALES,
  };
}
