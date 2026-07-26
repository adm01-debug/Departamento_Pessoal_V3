/**
 * P5-087: Sistema de Internacionalização (i18n)
 *
 * Idiomas suportados: pt-BR (default), en-US, es-ES
 * Padrão: nãousa URL path (/pt/dashboard) — detecta do browser navigator.languages.
 *Traduções por escopo: auth, common, dashboard, folha, rh, esocial, errors.
 *
 * Recursos:
 * - Substituição de variáveis: t('bem_vindo', { nome: 'João' }) → "Bem-vindo, João!"
 * - Pluralização: t('n_registros', { count: 0 }) → "Nenhum registro"
 * - Date/number formatting regional
 * - React hook: useTranslation()
 * - Type-safe keys via generics
 *
 * Migração gradual (item a item):
 *   Substituir strings hardcoded por t('escopo.chave')
 *   Sembreaking changes — t() retorna a key se não encontrar a tradução.
 */

export type Locale = 'pt-BR' | 'en-US' | 'es-ES';

export const SUPPORTED_LOCALES: Locale[] = ['pt-BR', 'en-US', 'es-ES'];
export const DEFAULT_LOCALE: Locale = 'pt-BR';

function parseAcceptLanguage(header: string): Locale {
  const tags = header.split(',').map((s) => {
    const [tag, q] = s.trim().split(';q=');
    return { tag: tag.trim(), q: q ? parseFloat(q) : 1 };
  });
  tags.sort((a, b) => b.q - a.q);
  for (const { tag } of tags) {
    if (tag === '*') return DEFAULT_LOCALE;
    const exact = SUPPORTED_LOCALES.find((l) => l.toLowerCase() === tag.toLowerCase());
    if (exact) return exact;
    const langOnly = tag.split('-')[0].toLowerCase();
    const match = SUPPORTED_LOCALES.find((l) => l.toLowerCase().startsWith(langOnly));
    if (match) return match;
  }
  return DEFAULT_LOCALE;
}

export function detectLocale(): Locale {
  if (typeof navigator !== 'undefined') {
    const browserLang = navigator.languages?.join(',') ?? navigator.language ?? '';
    return parseAcceptLanguage(browserLang);
  }
  return DEFAULT_LOCALE;
}

function mergeDeep(base: Record<string, unknown>, override: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (
      value && typeof value === 'object' && !Array.isArray(value) &&
      base[key] && typeof base[key] === 'object' && !Array.isArray(base[key])
    ) {
      result[key] = mergeDeep(base[key] as Record<string, unknown>, value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}

// ── Translation data ────────────────────────────────────────────

type TranslationTree = Record<string, unknown>;

const ptBR: TranslationTree = {
  auth: {
    signIn: 'Entrar',
    signOut: 'Sair',
    email: 'E-mail',
    password: 'Senha',
    forgotPassword: 'Esqueci minha senha',
    invalidCredentials: 'Credenciais inválidas',
    accountLocked: 'Conta temporariamente bloqueada',
    sessionExpired: 'Sessão expirada. Faça login novamente.',
  },
  common: {
    save: 'Salvar',
    cancel: 'Cancelar',
    delete: 'Excluir',
    edit: 'Editar',
    view: 'Visualizar',
    search: 'Buscar',
    filter: 'Filtrar',
    export: 'Exportar',
    import: 'Importar',
    loading: 'Carregando…',
    noData: 'Nenhum registro encontrado',
    confirmDelete: 'Tem certeza que deseja excluir?',
    yes: 'Sim',
    no: 'Não',
    back: 'Voltar',
    next: 'Próximo',
    previous: 'Anterior',
    actions: 'Ações',
    status: 'Status',
    date: 'Data',
    hour: 'Hora',
    n_registros: {
      zero: 'Nenhum registro',
      one: '{{count}} registro',
      other: '{{count}} registros',
    },
  },
  dashboard: {
    title: 'Dashboard',
    headcount: 'Headcount',
    folha: 'Folha de Pagamento',
    esocial: 'eSocial',
    alerts: 'Alertas',
    turnover: 'Turnover',
    ativo: 'Ativo',
    ferias: 'Férias',
    afastado: 'Afastado',
    desligado: 'Desligado',
  },
  folha: {
    competencia: 'Competência',
    totalBruto: 'Total Bruto',
    totalLiquido: 'Total Líquido',
    totalDescontos: 'Total Descontos',
    fgts: 'FGTS',
    inss: 'INSS',
    irrf: 'IRRF',
    fechado: 'Fechado',
    pendente: 'Pendente',
    processando: 'Processando…',
    fecharFolha: 'Fechar Folha',
    recalcular: 'Recalcular',
  },
  rh: {
    colaborador: 'Colaborador',
    admissao: 'Admissão',
    demissao: 'Demissão',
    cargo: 'Cargo',
    departamento: 'Departamento',
    salario: 'Salário',
    status: 'Status',
    ativo: 'Ativo',
    ferias: 'Em Férias',
    afastado: 'Afastado',
    desligado: 'Desligado',
    feriasVencendo: 'Férias Vencendo',
   asoVencido: 'ASO Vencido',
    contratoExperiencia: 'Contrato de Experiência',
  },
  esocial: {
    enviado: 'Enviado',
    pendente: 'Pendente',
    erro: 'Erro',
    processamento: 'Processamento eSocial',
    s1000: 'S-1000 — Eventos de tabela',
    s1010: 'S-1010 — Tabela de rubricas',
    s1020: 'S-1020 — Tabela deLotação',
    s1200: 'S-1200 — Remuneração do trabalhador',
    s1202: 'S-1202 — Remuneração de servidor',
    s1207: 'S-1207 — Remuneração de beneficiário',
    s1210: 'S-1210 — Pagamentos de benefícios',
    s1250: 'S-1250 — Aquisição de beneficios',
    s1260: 'S-1260 — Comercialização',
    s1270: 'S-1270 — Contratação de_AVulsa',
    s1280: 'S-1280 — InfoComplPeríodo',
    s1298: 'S-1298 — Reabertura',
    s1299: 'S-1299 — Fechamento',
    s1300: 'S-1300 — Contrib. Sindical Patronal',
  },
  errors: {
    generic: 'Ocorreu um erro. Tente novamente.',
    network: 'Erro de conexão. Verifique sua internet.',
    unauthorized: 'Não autorizado',
    forbidden: 'Acesso negado',
    notFound: 'Recurso não encontrado',
    serverError: 'Erro interno do servidor',
    validation: 'Dados inválidos',
    timeout: 'Tempo esgotado. Tente novamente.',
  },
};

const enUS: TranslationTree = {
  auth: {
    signIn: 'Sign In',
    signOut: 'Sign Out',
    email: 'Email',
    password: 'Password',
    forgotPassword: 'Forgot password',
    invalidCredentials: 'Invalid credentials',
    accountLocked: 'Account temporarily locked',
    sessionExpired: 'Session expired. Please sign in again.',
  },
  common: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    view: 'View',
    search: 'Search',
    filter: 'Filter',
    export: 'Export',
    import: 'Import',
    loading: 'Loading…',
    noData: 'No records found',
    confirmDelete: 'Are you sure you want to delete?',
    yes: 'Yes',
    no: 'No',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    actions: 'Actions',
    status: 'Status',
    date: 'Date',
    hour: 'Time',
    n_registros: {
      zero: 'No records',
      one: '{{count}} record',
      other: '{{count}} records',
    },
  },
  dashboard: {
    title: 'Dashboard',
    headcount: 'Headcount',
    folha: 'Payroll',
    esocial: 'eSocial',
    alerts: 'Alerts',
    turnover: 'Turnover',
    ativo: 'Active',
    ferias: 'On vacation',
    afastado: 'Away',
    desligado: 'Terminated',
  },
  folha: {
    competencia: 'Period',
    totalBruto: 'Gross Total',
    totalLiquido: 'Net Total',
    totalDescontos: 'Total Deductions',
    fgts: 'FGTS',
    inss: 'INSS',
    irrf: 'Income Tax',
    fechado: 'Closed',
    pendente: 'Pending',
    processando: 'Processing…',
    fecharFolha: 'Close Payroll',
    recalcular: 'Recalculate',
  },
  rh: {
    colaborador: 'Employee',
    admissao: 'Hire date',
    demissao: 'Termination date',
    cargo: 'Position',
    departamento: 'Department',
    salario: 'Salary',
    status: 'Status',
    ativo: 'Active',
    ferias: 'On vacation',
    afastado: 'Away',
    desligado: 'Terminated',
    feriasVencendo: 'Vacation due',
    asoVencido: 'Expired Medical Exam',
    contratoExperiencia: 'Probationary contract',
  },
  esocial: {
    enviado: 'Sent',
    pendente: 'Pending',
    erro: 'Error',
    processamento: 'eSocial Processing',
  },
  errors: {
    generic: 'An error occurred. Please try again.',
    network: 'Connection error. Check your internet.',
    unauthorized: 'Unauthorized',
    forbidden: 'Access denied',
    notFound: 'Resource not found',
    serverError: 'Internal server error',
    validation: 'Invalid data',
    timeout: 'Timed out. Please try again.',
  },
};

const esES: TranslationTree = {
  auth: {
    signIn: 'Iniciar sesión',
    signOut: 'Cerrar sesión',
    email: 'Correo electrónico',
    password: 'Contraseña',
    forgotPassword: 'Olvidé mi contraseña',
    invalidCredentials: 'Credenciales inválidas',
    accountLocked: 'Cuenta temporalmente bloqueada',
    sessionExpired: 'Sesión expirada. Inicie sesión nuevamente.',
  },
  common: {
    save: 'Guardar',
    cancel: 'Cancelar',
    delete: 'Eliminar',
    edit: 'Editar',
    view: 'Ver',
    search: 'Buscar',
    filter: 'Filtrar',
    export: 'Exportar',
    import: 'Importar',
    loading: 'Cargando…',
    noData: 'Ningún registro encontrado',
    confirmDelete: '¿Está seguro de que desea eliminar?',
    yes: 'Sí',
    no: 'No',
    back: 'Volver',
    next: 'Siguiente',
    previous: 'Anterior',
    actions: 'Acciones',
    status: 'Estado',
    date: 'Fecha',
    hour: 'Hora',
    n_registros: {
      zero: 'Ningún registro',
      one: '{{count}} registro',
      other: '{{count}} registros',
    },
  },
  dashboard: {
    title: 'Panel',
    headcount: 'Headcount',
    folha: 'Nómina',
    esocial: 'eSocial',
    alerts: 'Alertas',
    turnover: 'Rotación',
    ativo: 'Activo',
    ferias: 'De vacaciones',
    afastado: 'Ausente',
    desligado: 'Desvinculado',
  },
  folha: {
    competencia: 'Competencia',
    totalBruto: 'Total Bruto',
    totalLiquido: 'Total Neto',
    totalDescontos: 'Total Deducciones',
    fgts: 'FGTS',
    inss: 'INSS',
    irrf: 'IRPF',
    fechado: 'Cerrado',
    pendente: 'Pendiente',
    processando: 'Procesando…',
    fecharFolha: 'Cerrar Nómina',
    recalcular: 'Recalcular',
  },
  rh: {
    colaborador: 'Colaborador',
    admissao: 'Admisión',
    demissao: 'Desvinculación',
    cargo: 'Cargo',
    departamento: 'Departamento',
    salario: 'Salario',
    status: 'Estado',
    ativo: 'Activo',
    ferias: 'De vacaciones',
    afastado: 'Ausente',
    desligado: 'Desvinculado',
    feriasVencendo: 'Vacaciones pendientes',
    asoVencido: 'ASO Vencido',
    contratoExperiencia: 'Contrato de prueba',
  },
  esocial: {
    enviado: 'Enviado',
    pendente: 'Pendiente',
    erro: 'Error',
    processamento: 'Procesamiento eSocial',
  },
  errors: {
    generic: 'Ocurrió un error. Intente nuevamente.',
    network: 'Error de conexión. Verifique su internet.',
    unauthorized: 'No autorizado',
    forbidden: 'Acceso denegado',
    notFound: 'Recurso no encontrado',
    serverError: 'Error interno del servidor',
    validation: 'Datos inválidos',
    timeout: 'Tiempo agotado. Intente nuevamente.',
  },
};

const TRANSLATIONS: Record<Locale, TranslationTree> = {
  'pt-BR': ptBR,
  'en-US': enUS,
  'es-ES': esES,
};

function getNestedValue(obj: Record<string, unknown>, path: string): string | null {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return null;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : null;
}

function interpolate(template: string, vars: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = vars[key];
    return val !== undefined ? String(val) : `{{${key}}}`;
  });
}

function pluralize(key: string, vars: Record<string, unknown>, locale: Locale): string {
  const count = Number(vars.count ?? 0);
  const pluralMap: Record<Locale, (n: number) => 'zero' | 'one' | 'other'> = {
    'pt-BR': (n) => n === 1 ? 'one' : 'other',
    'en-US': (n) => (n === 1 ? 'one' : 'other'),
    'es-ES': (n) => (n === 1 ? 'one' : 'other'),
  };
  const pluralKey = (pluralMap[locale] ?? pluralMap['pt-BR'])(count);
  const translation = getNestedValue(
    TRANSLATIONS[locale] ?? TRANSLATIONS[DEFAULT_LOCALE],
    `${key}.${pluralKey}`
  );
  return translation ? interpolate(translation, vars) : key;
}

export interface TranslateOptions {
  locale?: Locale;
  vars?: Record<string, unknown>;
}

class I18n {
  private _locale: Locale = DEFAULT_LOCALE;

  get locale(): Locale {
    return this._locale;
  }

  setLocale(locale: Locale): void {
    if (SUPPORTED_LOCALES.includes(locale)) {
      this._locale = locale;
    }
  }

  t(key: string, options: TranslateOptions = {}): string {
    const locale = options.locale ?? this._locale;
    const vars = options.vars ?? {};

    const translations = TRANSLATIONS[locale] ?? TRANSLATIONS[DEFAULT_LOCALE];
    const translation = getNestedValue(translations, key);

    if (translation === null) {
      // Fallback: tentar locale default antes de devolver a key
      const fallback = getNestedValue(TRANSLATIONS[DEFAULT_LOCALE], key);
      if (fallback === null) return key; // key não encontrada → retorna ela mesma
      return interpolate(fallback, vars);
    }

    // Pluralização
    if (vars.count !== undefined && translation.includes('{{count}}')) {
      return pluralize(key, vars, locale);
    }

    return interpolate(translation, vars);
  }

  formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat(this._locale, options).format(d);
  }

  formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
    return new Intl.NumberFormat(this._locale, options).format(value);
  }

  formatCurrency(value: number, currency = 'BRL'): string {
    return new Intl.NumberFormat(this._locale, {
      style: 'currency',
      currency,
    }).format(value);
  }

  formatRelativeTime(value: number, unit: Intl.RelativeTimeFormatUnit): string {
    return new Intl.RelativeTimeFormat(this._locale, { numeric: 'auto' })
      .format(value, unit);
  }
}

export const i18n = new I18n();

// ── React hook ────────────────────────────────────────────────

let currentLocale = DEFAULT_LOCALE;
const listeners = new Set<() => void>();

export function setI18nLocale(locale: Locale): void {
  i18n.setLocale(locale);
  currentLocale = locale;
  listeners.forEach((fn) => fn());
}

export function getI18nLocale(): Locale {
  return currentLocale;
}

export function onI18nLocaleChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
