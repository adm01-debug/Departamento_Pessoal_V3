import { describe, it, expect } from 'vitest';
import { gerarXmlESocial } from '../esocialXmlGenerator';

const empresa = {
  cnpj: '12.345.678/0001-90',
  razao_social: 'Empresa Teste LTDA',
  nome_fantasia: 'Empresa Teste',
  telefone: '(11) 9999-9999',
  email: 'contato@empresa.com',
};

describe('gerarXmlESocial', () => {
  it('returns valid XML declaration', () => {
    const xml = gerarXmlESocial({ tipo: 'S-1000', dados: {}, empresa });
    expect(xml).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  });

  it('wraps output in eSocial root element', () => {
    const xml = gerarXmlESocial({ tipo: 'S-1000', dados: {}, empresa });
    expect(xml).toContain('<eSocial xmlns=');
    expect(xml).toContain('</eSocial>');
  });

  it('uses testing environment by default (tpAmb=2)', () => {
    const xml = gerarXmlESocial({ tipo: 'S-1000', dados: {}, empresa });
    expect(xml).toContain('<tpAmb>2</tpAmb>');
  });

  it('uses production environment when explicitly set', () => {
    const xml = gerarXmlESocial({ tipo: 'S-1000', dados: {}, empresa, ambiente: '1' });
    expect(xml).toContain('<tpAmb>1</tpAmb>');
  });

  describe('S-1000 (InfoEmpregador)', () => {
    it('generates S-1000 event type', () => {
      const xml = gerarXmlESocial({ tipo: 'S-1000', dados: {}, empresa });
      expect(xml).toContain('evtInfoEmpregador');
    });

    it('includes CNPJ digits only (no formatting)', () => {
      const xml = gerarXmlESocial({ tipo: 'S-1000', dados: {}, empresa });
      expect(xml).toContain('<nrInsc>12345678000190</nrInsc>');
    });

    it('includes razao_social in nmRazao', () => {
      const xml = gerarXmlESocial({ tipo: 'S-1000', dados: {}, empresa });
      expect(xml).toContain('<nmRazao>Empresa Teste LTDA</nmRazao>');
    });

    it('uses provided iniValid', () => {
      const xml = gerarXmlESocial({
        tipo: 'S-1000',
        dados: { iniValid: '2024-01' },
        empresa,
      });
      expect(xml).toContain('<iniValid>2024-01</iniValid>');
    });

    it('falls back to default iniValid when not provided', () => {
      const xml = gerarXmlESocial({ tipo: 'S-1000', dados: {}, empresa });
      expect(xml).toContain('<iniValid>2023-01</iniValid>');
    });

    it('includes empresa email in contato', () => {
      const xml = gerarXmlESocial({ tipo: 'S-1000', dados: {}, empresa });
      expect(xml).toContain('<email>contato@empresa.com</email>');
    });
  });

  describe('S-2200 (Admissão)', () => {
    const dadosAdmissao = {
      cpfTrab: '529.982.247-25',
      nmTrab: 'João Silva',
      dtNascto: '1990-05-15',
      dtAdm: '2024-01-01',
      codCargo: 'CGO001',
      vrSalFx: '3500.00',
    };

    it('generates S-2200 event type', () => {
      const xml = gerarXmlESocial({ tipo: 'S-2200', dados: dadosAdmissao, empresa });
      expect(xml).toContain('evtAdmissao');
    });

    it('strips CPF formatting', () => {
      const xml = gerarXmlESocial({ tipo: 'S-2200', dados: dadosAdmissao, empresa });
      expect(xml).toContain('<cpfTrab>52998224725</cpfTrab>');
    });

    it('includes worker name', () => {
      const xml = gerarXmlESocial({ tipo: 'S-2200', dados: dadosAdmissao, empresa });
      expect(xml).toContain('<nmTrab>João Silva</nmTrab>');
    });

    it('includes admission date', () => {
      const xml = gerarXmlESocial({ tipo: 'S-2200', dados: dadosAdmissao, empresa });
      expect(xml).toContain('<dtAdm>2024-01-01</dtAdm>');
    });

    it('defaults sexo to M when not provided', () => {
      const xml = gerarXmlESocial({ tipo: 'S-2200', dados: dadosAdmissao, empresa });
      expect(xml).toContain('<sexo>M</sexo>');
    });

    it('uses provided sexo', () => {
      const xml = gerarXmlESocial({
        tipo: 'S-2200',
        dados: { ...dadosAdmissao, sexo: 'F' },
        empresa,
      });
      expect(xml).toContain('<sexo>F</sexo>');
    });
  });

  describe('Generic event type', () => {
    it('generates generic event for unknown types', () => {
      const xml = gerarXmlESocial({ tipo: 'S-9999', dados: { foo: 'bar' }, empresa });
      expect(xml).toContain('<evento Id=');
    });

    it('includes serialized dados in generic event', () => {
      const xml = gerarXmlESocial({ tipo: 'S-9999', dados: { value: 42 }, empresa });
      expect(xml).toContain('"value":42');
    });
  });

  describe('Event ID generation', () => {
    it('ID includes CNPJ digits', () => {
      const xml = gerarXmlESocial({ tipo: 'S-1000', dados: {}, empresa });
      // The ID starts with "ID1" followed by 14-char CNPJ
      expect(xml).toMatch(/Id="ID1\d{14}/);
    });
  });
});
