import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { useEmpresas } from '@/hooks/useEmpresas';
import {
  useCamposCustomizados,
  useValoresCamposCustomizados,
  useSalvarValorCampoCustomizado,
} from '@/hooks/useColaboradorDetalhes';
import type { Tables } from '@/integrations/supabase/types';
import { FalhaConsulta } from './FalhaConsulta';

type CampoCustomizado = Tables<'campos_customizados'>;

/**
 * `campos_customizados.opcoes` é `Json` no banco — pode ser qualquer coisa.
 * Só aproveitamos strings não vazias de um array; o resto é descartado em vez
 * de virar uma opção quebrada no Select.
 */
function lerOpcoes(opcoes: CampoCustomizado['opcoes']): string[] {
  if (!Array.isArray(opcoes)) return [];
  return opcoes.filter((o): o is string => typeof o === 'string' && o.length > 0);
}

/**
 * Valores dos campos customizados de UM colaborador.
 *
 * As DEFINIÇÕES dos campos são criadas em src/components/settings/CamposCustomizadosTab.tsx;
 * aqui só se lê e grava o valor por colaborador (`valores_campos_customizados`),
 * que até agora não tinha nenhuma entrada de UI.
 */
export function CamposCustomizadosTab({ colaboradorId }: { colaboradorId: string }) {
  const { empresaAtual } = useEmpresas();
  const empresaId = empresaAtual?.id;

  const { data: campos = [], isLoading: carregandoCampos, isError: erroCampos } = useCamposCustomizados(empresaId);
  const {
    data: valores = [],
    isLoading: carregandoValores,
    isError: erroValores,
  } = useValoresCamposCustomizados(colaboradorId);
  const salvar = useSalvarValorCampoCustomizado(colaboradorId);

  // `edicoes` guarda só os campos que o usuário tocou nesta sessão — o valor
  // exibido é sempre `edicoes[id] ?? valorSalvo[id] ?? ''`. Evita sincronizar
  // estado local a partir da query via useEffect.
  //
  // O id do colaborador viaja JUNTO com as edições: navegar para outro
  // colaborador (paleta de comandos, por exemplo) não desmonta esta aba, só
  // troca a prop. Sem este par, o valor digitado para uma pessoa continuaria
  // na tela e seria gravado no cadastro da OUTRA — aqui o duplo escopo que
  // protege as abas de emergência e formação (`id` + `colaborador_id`) não
  // vale, porque `campoId` é da empresa e existe para as duas.
  const [edicoesPorColaborador, setEdicoes] = useState<{
    colaboradorId: string;
    valores: Record<string, string>;
  }>({ colaboradorId, valores: {} });
  const edicoes = edicoesPorColaborador.colaboradorId === colaboradorId ? edicoesPorColaborador.valores : {};
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);

  const valorSalvo = useMemo(() => {
    const mapa: Record<string, string> = {};
    for (const v of valores) mapa[v.campo_customizado_id] = v.valor ?? '';
    return mapa;
  }, [valores]);

  const valorAtual = (campoId: string) => edicoes[campoId] ?? valorSalvo[campoId] ?? '';
  const editar = (campoId: string, valor: string) =>
    setEdicoes((e) => ({
      colaboradorId,
      valores: { ...(e.colaboradorId === colaboradorId ? e.valores : {}), [campoId]: valor },
    }));

  const carregando = carregandoCampos || carregandoValores;
  const falhou = erroCampos || erroValores;
  const pendentes = Object.keys(edicoes).filter((id) => edicoes[id] !== (valorSalvo[id] ?? ''));
  // O `*` de `obrigatorio` não pode ser enfeite: apagar um campo obrigatório e
  // gravar vazio em cima do valor anterior, com toast de sucesso, é perda
  // silenciosa de dado. Só valida o que o usuário mexeu — campo obrigatório
  // ainda nunca preenchido não bloqueia salvar os outros.
  const obrigatoriosVazios = pendentes.filter(
    (id) => campos.find((c) => c.id === id)?.obrigatorio && edicoes[id].trim() === ''
  );

  const handleSalvar = async () => {
    setErroSalvar(null);
    if (obrigatoriosVazios.length > 0) {
      const nomes = obrigatoriosVazios.map((id) => campos.find((c) => c.id === id)?.nome ?? id).join(', ');
      const mensagem = `Preencha os campos obrigatórios: ${nomes}`;
      setErroSalvar(mensagem);
      toast.error(mensagem);
      return;
    }
    try {
      await Promise.all(pendentes.map((campoId) => salvar.mutateAsync({ campoId, valor: edicoes[campoId] })));
      toast.success('Campos customizados salvos');
    } catch (e) {
      const mensagem = safeErrorMessage(e, 'Erro ao salvar campos customizados');
      setErroSalvar(mensagem);
      toast.error(mensagem);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Campos Customizados</CardTitle>
        <Button size="sm" onClick={handleSalvar} disabled={pendentes.length === 0 || salvar.isPending}>
          {salvar.isPending ? 'Salvando...' : 'Salvar'}
        </Button>
      </CardHeader>
      <CardContent>
        {erroSalvar && (
          <p className="mb-3 text-sm text-destructive" role="alert">
            {erroSalvar}
          </p>
        )}
        {carregando ? (
          <Spinner />
        ) : falhou ? (
          <FalhaConsulta o="os campos customizados" />
        ) : !empresaId ? (
          <p className="text-sm text-muted-foreground">Selecione uma empresa para ver os campos customizados.</p>
        ) : campos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum campo customizado ativo para esta empresa.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {campos.map((campo) => (
              <div key={campo.id} className={`space-y-1 ${campo.tipo === 'textarea' ? 'sm:col-span-2' : ''}`}>
                <Label htmlFor={`campo-${campo.id}`}>
                  {campo.nome}
                  {campo.obrigatorio && <span className="text-destructive"> *</span>}
                </Label>
                {campo.tipo === 'textarea' ? (
                  <Textarea
                    id={`campo-${campo.id}`}
                    value={valorAtual(campo.id)}
                    onChange={(e) => editar(campo.id, e.target.value)}
                  />
                ) : campo.tipo === 'numero' ? (
                  <Input
                    id={`campo-${campo.id}`}
                    type="number"
                    value={valorAtual(campo.id)}
                    onChange={(e) => editar(campo.id, e.target.value)}
                  />
                ) : campo.tipo === 'data' ? (
                  <DatePicker
                    id={`campo-${campo.id}`}
                    value={valorAtual(campo.id)}
                    onChange={(v) => editar(campo.id, v)}
                  />
                ) : campo.tipo === 'checkbox' ? (
                  <div className="flex h-9 items-center">
                    <Checkbox
                      id={`campo-${campo.id}`}
                      checked={valorAtual(campo.id) === 'true'}
                      onCheckedChange={(v) => editar(campo.id, v ? 'true' : 'false')}
                    />
                  </div>
                ) : campo.tipo === 'selecao' ? (
                  <Select value={valorAtual(campo.id)} onValueChange={(v) => editar(campo.id, v)}>
                    <SelectTrigger id={`campo-${campo.id}`}>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {lerOpcoes(campo.opcoes).map((o) => (
                        <SelectItem key={o} value={o}>
                          {o}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id={`campo-${campo.id}`}
                    value={valorAtual(campo.id)}
                    onChange={(e) => editar(campo.id, e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
