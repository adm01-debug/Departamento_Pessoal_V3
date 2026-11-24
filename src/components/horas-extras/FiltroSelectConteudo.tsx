/**
 * ============================================================================
 * CONTEÚDO DOS `Select` DE FILTRO — ícone + rótulo do filtro + valor atual.
 *
 * Vive em arquivo próprio porque os TRÊS selects da barra de filtros do
 * histórico usam exatamente o mesmo trigger (departamento, status e ordenação).
 * Duplicar a marcação faria os três divergirem na primeira alteração de medida.
 *
 * ESTRUTURA (a mesma dos outros filtros do sistema, na ordem pedida):
 *
 *   [ícone]  DEPARTAMENTO        ← legenda 9 → 11,25 px, caixa-alta, apagada
 *            Todos              ← valor 11 → 13,75 px, cor de texto cheia
 *                                              ...        [seta] ← do trigger
 *
 * MEDIDAS (px de classe × 1,25 = px renderizados pela base rem de 20 px):
 *   ícone 14 → 17,5 · rótulo 9 → 11,25 · valor 11 → 13,75 · respiro 9 → 11,25
 *   respiro rótulo→valor 4 → 5 · respiro bloco→seta 10 → 12,5 (no trigger)
 *
 * O `truncate` do valor é REDE DE SEGURANÇA, não o comportamento padrão: quem
 * decide a largura é o conteúdo do trigger (`sm:w-auto` em
 * `CLASSE_CONTROLE_FILTRO`) + o piso de cada filtro (`MEDIDA_FILTRO_*`), então
 * só há reticências quando o texto não cabe nem com o controle ocupando a
 * linha inteira — daí o `title` com o valor completo.
 *
 * O `min-w-0` no bloco de texto é o que permite o texto ENCOLHER (e chegar ao
 * ellipsis) em vez de empurrar a seta para fora do controle; o ícone tem
 * `shrink-0` para nunca ser esmagado.
 *
 * O `SelectItem` de cada menu continua com o texto COMPLETO da opção — este
 * conteúdo é só o que o trigger mostra — e cada trigger recebe `aria-label`
 * com o nome do filtro, então a leitura acessível não muda.
 * ============================================================================
 */
import type { LucideIcon } from 'lucide-react';

export function ConteudoFiltro({ icone: Icone, rotulo, valor }: { icone: LucideIcon; rotulo: string; valor: string }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-[9px]">
      <Icone className="h-[14px] w-[14px] shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0 text-left">
        <p className="text-[9px] font-medium uppercase leading-none tracking-wide text-muted-foreground">{rotulo}</p>
        <p className="mt-[4px] truncate text-[11px] font-medium leading-none text-foreground" title={valor}>
          {valor}
        </p>
      </div>
    </div>
  );
}
