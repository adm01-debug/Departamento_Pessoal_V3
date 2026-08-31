import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import {
  buildTemplateBuffer,
  buildTemplateWorkbook,
  TEMPLATE_FILENAME,
  TEMPLATE_MIME,
} from '@/utils/importacao/template';
import { TEMPLATE_HEADERS, TEMPLATE_SAMPLE_ROW } from '@/utils/importacao/columnMap';

describe('template do modelo de importação', () => {
  it('gera workbook com aba "Modelo" e cabeçalhos esperados', async () => {
    const wb = await buildTemplateWorkbook();
    const ws = wb.getWorksheet('Modelo');
    expect(ws).toBeTruthy();

    const headerRow = ws!.getRow(1).values as unknown[];
    // ExcelJS 1-indexes row.values → drop the first slot
    expect(headerRow.slice(1) as string[]).toEqual([...TEMPLATE_HEADERS]);

    const sampleRow = (ws!.getRow(2).values as unknown[]).slice(1);
    expect(sampleRow).toEqual([...TEMPLATE_SAMPLE_ROW]);
  });

  it('inclui as 11 colunas obrigatórias na ordem correta', async () => {
    const wb = await buildTemplateWorkbook();
    const ws = wb.getWorksheet('Modelo')!;
    const headers = (ws.getRow(1).values as unknown[]).slice(1) as string[];
    expect(headers).toHaveLength(11);
    expect(headers).toContain('Nome Completo');
    expect(headers).toContain('CPF');
    expect(headers).toContain('PIS');
    expect(headers).toContain('RG');
    expect(headers[0]).toBe('Nome Completo');
  });

  it('buildTemplateBuffer produz um .xlsx re-parseável pelo ExcelJS', async () => {
    const buf = await buildTemplateBuffer();
    expect(buf.byteLength).toBeGreaterThan(0);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    const ws = wb.worksheets[0];
    expect(ws.name).toBe('Modelo');
    expect(ws.rowCount).toBeGreaterThanOrEqual(2);

    const headers = (ws.getRow(1).values as unknown[]).slice(1) as string[];
    expect(headers).toEqual([...TEMPLATE_HEADERS]);
  });

  it('mantém o ExcelJS compatível com o override de uuid em regras x14', async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Compatibilidade');
    ws.addRows([[10], [20], [30]]);
    ws.addConditionalFormatting({
      ref: 'A1:A3',
      rules: [
        {
          type: 'dataBar',
          priority: 1,
          cfvo: [{ type: 'min' }, { type: 'max' }],
          gradient: false,
        },
      ],
    });

    // Regras dataBar sem gradiente passam pelo renderer x14 do ExcelJS, que
    // chama uuid.v4(). Este round-trip protege o override transitivo no runtime.
    const buffer = await wb.xlsx.writeBuffer();
    const parsed = new ExcelJS.Workbook();
    await parsed.xlsx.load(buffer);

    expect(parsed.getWorksheet('Compatibilidade')!.getCell('A3').value).toBe(30);
  });

  it('expõe MIME e filename corretos para download .xlsx', () => {
    expect(TEMPLATE_MIME).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(TEMPLATE_FILENAME).toMatch(/\.xlsx$/);
  });
});
