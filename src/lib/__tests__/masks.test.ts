import { describe, it, expect } from 'vitest';
import {
  maskCPF,
  maskCNPJ,
  maskPhone,
  maskCEP,
  maskPIS,
  maskDate,
  maskRG,
  maskCTPS,
  maskCurrency,
  unmask,
  validateCPF,
  validateCNPJ,
  validatePIS,
  validateRG,
  validateTituloEleitor,
  validateCNH,
} from '../masks';

describe('maskCPF', () => {
  it('formats 11 digits as 000.000.000-00', () => {
    expect(maskCPF('11144477735')).toBe('111.444.777-35');
  });

  it('strips non-digits before formatting', () => {
    expect(maskCPF('111.444.777-35')).toBe('111.444.777-35');
  });

  it('slices at 14 characters', () => {
    expect(maskCPF('111444777351234')).toBe('111.444.777-35');
  });

  it('handles partial input', () => {
    expect(maskCPF('111')).toBe('111');
    expect(maskCPF('1114')).toBe('111.4');
  });
});

describe('maskCNPJ', () => {
  it('formats 14 digits as 00.000.000/0000-00', () => {
    expect(maskCNPJ('11222333000181')).toBe('11.222.333/0001-81');
  });

  it('strips non-digits before formatting', () => {
    expect(maskCNPJ('11.222.333/0001-81')).toBe('11.222.333/0001-81');
  });

  it('slices at 18 characters', () => {
    expect(maskCNPJ('112223330001811234')).toBe('11.222.333/0001-81');
  });

  it('handles partial input', () => {
    expect(maskCNPJ('11')).toBe('11');
    expect(maskCNPJ('112')).toBe('11.2');
  });
});

describe('maskPhone', () => {
  it('formats 10-digit number as (xx) xxxx-xxxx', () => {
    expect(maskPhone('1131234567')).toBe('(11) 3123-4567');
  });

  it('formats 11-digit number as (xx) xxxxx-xxxx', () => {
    expect(maskPhone('11991234567')).toBe('(11) 99123-4567');
  });

  it('strips non-digits before formatting', () => {
    expect(maskPhone('(11) 3123-4567')).toBe('(11) 3123-4567');
  });

  it('slices 11-digit result at 15 chars', () => {
    expect(maskPhone('11991234567890')).toBe('(11) 99123-4567');
  });
});

describe('maskCEP', () => {
  it('formats 8 digits as 00000-000', () => {
    expect(maskCEP('01310100')).toBe('01310-100');
  });

  it('strips non-digits', () => {
    expect(maskCEP('01310-100')).toBe('01310-100');
  });

  it('slices at 9 characters', () => {
    expect(maskCEP('013101001234')).toBe('01310-100');
  });
});

describe('maskPIS', () => {
  it('formats 11 digits', () => {
    expect(maskPIS('12345678919')).toBe('12-3.45678.919');
  });

  it('strips non-digits before formatting', () => {
    expect(maskPIS('12345678919')).toBe('12-3.45678.919');
  });

  it('slices at 14 characters', () => {
    const result = maskPIS('123456789191234');
    expect(result.length).toBeLessThanOrEqual(14);
  });
});

describe('maskDate', () => {
  it('formats 8 digits as dd/mm/aaaa', () => {
    expect(maskDate('24072026')).toBe('24/07/2026');
  });

  it('strips non-digits', () => {
    expect(maskDate('24/07/2026')).toBe('24/07/2026');
  });

  it('slices at 10 characters', () => {
    expect(maskDate('240720261234')).toBe('24/07/2026');
  });

  it('handles partial input', () => {
    expect(maskDate('24')).toBe('24');
    expect(maskDate('2407')).toBe('24/07');
  });
});

describe('maskRG', () => {
  it('formats 9 digits as 00.000.000-0', () => {
    expect(maskRG('123456789')).toBe('12.345.678-9');
  });

  it('strips non-digits', () => {
    expect(maskRG('12.345.678-9')).toBe('12.345.678-9');
  });

  it('slices at 12 characters', () => {
    expect(maskRG('12345678912345')).toBe('12.345.678-9');
  });
});

describe('maskCTPS', () => {
  it('formats 10 digits as 0000000/000', () => {
    expect(maskCTPS('1234567890')).toBe('1234567/890');
  });

  it('strips non-digits', () => {
    expect(maskCTPS('1234567/890')).toBe('1234567/890');
  });

  it('slices at 12 characters', () => {
    expect(maskCTPS('12345678901234')).toBe('1234567/8901');
  });
});

describe('maskCurrency', () => {
  it('formats a number as BRL currency', () => {
    const result = maskCurrency(1234.56);
    expect(result).toMatch(/1\.234,56/);
    expect(result).toContain('R$');
  });

  it('formats zero as R$ 0,00', () => {
    const result = maskCurrency(0);
    expect(result).toMatch(/0,00/);
  });

  it('accepts a numeric string (value in cents)', () => {
    const result = maskCurrency('12345');
    expect(result).toMatch(/123,45/);
  });
});

describe('unmask', () => {
  it('strips all non-digit characters', () => {
    expect(unmask('111.444.777-35')).toBe('11144477735');
    expect(unmask('(11) 99123-4567')).toBe('11991234567');
    expect(unmask('01310-100')).toBe('01310100');
  });

  it('returns empty string for empty input', () => {
    expect(unmask('')).toBe('');
  });

  it('returns digits unchanged', () => {
    expect(unmask('12345')).toBe('12345');
  });
});

describe('validateCPF', () => {
  it('returns true for a valid CPF', () => {
    expect(validateCPF('11144477735')).toBe(true);
    expect(validateCPF('111.444.777-35')).toBe(true);
  });

  it('returns false for all-same-digit CPF', () => {
    expect(validateCPF('11111111111')).toBe(false);
    expect(validateCPF('00000000000')).toBe(false);
  });

  it('returns false for wrong length', () => {
    expect(validateCPF('1234567890')).toBe(false);
    expect(validateCPF('123456789012')).toBe(false);
  });

  it('returns false for wrong check digit', () => {
    expect(validateCPF('12345678900')).toBe(false);
  });
});

describe('validateCNPJ', () => {
  it('returns true for a valid CNPJ', () => {
    expect(validateCNPJ('11222333000181')).toBe(true);
    expect(validateCNPJ('11.222.333/0001-81')).toBe(true);
  });

  it('returns false for all-same-digit CNPJ', () => {
    expect(validateCNPJ('11111111111111')).toBe(false);
  });

  it('returns false for wrong length', () => {
    expect(validateCNPJ('1122233300018')).toBe(false);
  });

  it('returns false for wrong check digit', () => {
    expect(validateCNPJ('11222333000199')).toBe(false);
  });
});

describe('validatePIS', () => {
  it('returns true for a valid PIS', () => {
    expect(validatePIS('12345678919')).toBe(true);
    expect(validatePIS('123.45678.91-9')).toBe(true);
  });

  it('returns false for wrong length', () => {
    expect(validatePIS('123456789')).toBe(false);
    expect(validatePIS('123456789100')).toBe(false);
  });

  it('returns false for wrong check digit', () => {
    expect(validatePIS('12345678910')).toBe(false);
  });
});

describe('validateRG', () => {
  it('returns true for 5-14 digit RG', () => {
    expect(validateRG('12345')).toBe(true);
    expect(validateRG('123456789')).toBe(true);
    expect(validateRG('12345678901234')).toBe(true);
  });

  it('returns false for too short (< 5 digits)', () => {
    expect(validateRG('1234')).toBe(false);
    expect(validateRG('')).toBe(false);
  });

  it('returns false for too long (> 14 digits)', () => {
    expect(validateRG('123456789012345')).toBe(false);
  });

  it('strips non-digits before checking length', () => {
    expect(validateRG('12.345.678-9')).toBe(true);
  });
});

describe('validateTituloEleitor', () => {
  it('returns true for exactly 12 digits', () => {
    expect(validateTituloEleitor('123456789012')).toBe(true);
  });

  it('strips non-digits before checking', () => {
    expect(validateTituloEleitor('1234 5678 9012')).toBe(true);
  });

  it('returns false for wrong length', () => {
    expect(validateTituloEleitor('12345678901')).toBe(false);
    expect(validateTituloEleitor('1234567890123')).toBe(false);
  });
});

describe('validateCNH', () => {
  it('returns true for exactly 11 digits', () => {
    expect(validateCNH('12345678901')).toBe(true);
  });

  it('strips non-digits before checking', () => {
    expect(validateCNH('123.456.789-01')).toBe(true);
  });

  it('returns false for wrong length', () => {
    expect(validateCNH('1234567890')).toBe(false);
    expect(validateCNH('123456789012')).toBe(false);
  });
});
