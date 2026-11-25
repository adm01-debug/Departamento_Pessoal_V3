import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * ============================================================================
 * PESQUISAS DE CLIMA & eNPS — JANELAS COM A MESMA ANIMAÇÃO DE "PENDÊNCIAS".
 *
 * O popup de Pendências (`PendenciasDialog` → `AnimatedCascadeDialog`) entra
 * pela moldura `CascadeDialogFrame`, alimentada por `ui/cascade-motion.ts`
 * (véu em fade, caixa que nasce pequena/estica, conteúdo em cascata).
 *
 * As duas janelas deste módulo (criação/edição e Acompanhamento) vivem inline
 * na página — não são componentes separáveis sem mexer no JSX aprovado — então
 * a paridade é travada na FONTE: este teste lê `PesquisasClimaPage.tsx` e
 * falha se alguém voltar a usar um `Dialog`/`DialogContent` estático, apontar
 * para outra coreografia ou tirar algum bloco da cascata.
 *
 * Os números/durações em si NÃO são repetidos aqui: eles continuam morando em
 * `ui/cascade-motion.ts` e são cobertos pelos testes de paridade de
 * `CascadeDialogFrame` (ex.: `AuditoriaEventoDialog`, `NineBoxQuadranteDialog`).
 * ============================================================================
 */

const PAGINA = readFileSync(path.resolve(process.cwd(), 'src/pages/PesquisasClimaPage.tsx'), 'utf8');

/** Página sem comentários: a documentação pode citar o nome antigo, o código não. */
const CODIGO = PAGINA.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

const ocorrencias = (padrao: RegExp) => CODIGO.match(padrao) ?? [];

describe('PesquisasClimaPage — mesmas janelas animadas do popup "Pendências"', () => {
  it('usa a moldura compartilhada e a coreografia única do sistema', () => {
    // Moldura: a MESMA que o `AnimatedCascadeDialog` de Pendências utiliza.
    expect(CODIGO).toMatch(/import\s*\{\s*CascadeDialogFrame\s*\}\s*from\s*'@\/components\/ui\/cascade-dialog'/);
    expect(CODIGO).toMatch(/import\s*\{\s*cascadeItemVariants\s*\}\s*from\s*'@\/components\/ui\/cascade-motion'/);
    // `motion` (para os blocos da cascata) e `MotionConfig` (modo reduzido).
    expect(CODIGO).toMatch(/import\s*\{\s*MotionConfig,\s*motion\s*\}\s*from\s*'framer-motion'/);
  });

  it('não sobrou nenhuma janela estática (Dialog/DialogContent) nem coreografia paralela', () => {
    expect(CODIGO).not.toMatch(/<DialogContent\b/);
    expect(CODIGO).not.toMatch(/<Dialog\b/);
    // A "entrada de card" (fade + 14 px) foi a tentativa anterior: não volta.
    expect(CODIGO).not.toMatch(/dialog-entrada/);
    expect(CODIGO).not.toMatch(/DialogEntrada/);
    // Nem `initial`/`animate` locais inventando outra animação na caixa.
    expect(CODIGO).not.toMatch(/\binitial=\{?['"]closed['"]/);
  });

  it('monta as DUAS janelas na moldura clonada, com cabeçalho, corpo e rodapé cascateando', () => {
    const janelas = ocorrencias(/<CascadeDialogFrame\b/g);
    expect(janelas).toHaveLength(2);

    // Contagem de blocos declarada uma vez, como na janela de Detalhes da Admissão.
    expect(CODIGO).toMatch(/const BLOCOS_CASCATA_JANELA = 3;/);
    expect(ocorrencias(/blocks=\{BLOCOS_CASCATA_JANELA\}/g)).toHaveLength(2);

    // 3 blocos por janela (cabeçalho + corpo + rodapé) = 6 wrappers animados.
    expect(ocorrencias(/variants=\{cascadeItemVariants\}/g)).toHaveLength(6);
  });

  it('preserva as larguras, os textos e as ações de cada janela', () => {
    expect(CODIGO).toMatch(/className="max-w-lg"/);
    expect(CODIGO).toMatch(/className="max-w-md"/);

    for (const rotulo of [
      'Acompanhamento',
      'Encerrar pesquisa',
      'Fechar',
      // Janela de criação/edição (mesmo `open`, duas ações).
      'Nova Pesquisa',
      'Editar rascunho',
      'Cancelar',
      'Criar pesquisa',
      'Salvar rascunho',
    ]) {
      expect(PAGINA).toContain(rotulo);
    }
  });

  it('mantém as regras de fechamento de cada janela (Radix + estado do módulo)', () => {
    // Criação/edição: abrir liga o diálogo, fechar passa pelo `fecharDialogo`.
    expect(CODIGO).toMatch(/if \(aberto\) setDialogoAberto\(true\);\s*else fecharDialogo\(\);/);
    // Acompanhamento: o `open` é derivado do resultado e fechar limpa o estado.
    expect(CODIGO).toMatch(/open=\{resultados !== null\}/);
    expect(CODIGO).toMatch(/if \(!aberto\) setResultados\(null\);/);
    // "Encerrar pesquisa" continua encerrando a pesquisa (não é só fechar).
    expect(CODIGO).toMatch(/setResultados\(null\);\s*encerrar\(pesquisa\);/);
  });
});
