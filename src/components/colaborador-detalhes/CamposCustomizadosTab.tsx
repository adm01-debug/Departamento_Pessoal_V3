import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { cardVariants } from '@/components/dashboard/MetricCard';
import { FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useEmpresas } from '@/hooks/useEmpresas';
import {
  useCamposCustomizados, useValoresCamposCustomizados, useSalvarValorCampoCustomizado,
} from '@/hooks/useColaboradorDetalhes';

const MotionCard = motion.create(Card);

interface CampoCustomizado {
  id: string;
  nome: string;
  tipo: 'texto' | 'numero' | 'data' | 'selecao' | 'checkbox' | 'textarea';
  secao?: string | null;
  obrigatorio?: boolean | null;
  opcoes?: string[] | null;
  ordem?: number | null;
}

// Mesma lista de tipos usada na tela administrativa (src/components/settings/CamposCustomizadosTab.tsx)
// — este componente só renderiza/edita os VALORES por colaborador, não as definições dos campos.
export function CamposCustomizadosTab({ colaboradorId, index = 0 }: { colaboradorId: string; index?: number }) {
  const { empresaAtual } = useEmpresas();
  const empresaId = empresaAtual?.id;

  const { data: campos = [], isLoading: isLoadingCampos } = useCamposCustomizados(empresaId) as { data: CampoCustomizado[]; isLoading: boolean };
  const { data: valores = [], isLoading: isLoadingValores } = useValoresCamposCustomizados(colaboradorId) as { data: { campo_customizado_id: string; valor: string }[]; isLoading: boolean };
  const salvar = useSalvarValorCampoCustomizado(colaboradorId);

  // `edicoes` só guarda campos que o usuário efetivamente tocou nesta sessão —
  // o valor exibido é sempre `edicoes[id] ?? valorSalvo[id] ?? ''`. Isso evita
  // sincronizar estado local a partir de uma query via useEffect.
  const [edicoes, setEdicoes] = useState<Record<string, string>>({});

  const valorSalvo = useMemo(() => {
    const map: Record<string, string> = {};
    for (const v of valores) map[v.campo_customizado_id] = v.valor ?? '';
    return map;
  }, [valores]);

  const valorAtual = (campoId: string) => edicoes[campoId] ?? valorSalvo[campoId] ?? '';

  const isLoading = isLoadingCampos || isLoadingValores;
  const dirty = Object.keys(edicoes).filter(campoId => edicoes[campoId] !== (valorSalvo[campoId] ?? ''));

  const handleSalvarTudo = async () => {
    try {
      await Promise.all(
        dirty.map(campoId => salvar.mutateAsync({ campoId, valor: edicoes[campoId] }))
      );
      toast.success('Campos customizados salvos');
    } catch {
      toast.error('Erro ao salvar campos customizados');
    }
  };

  return (
    <MotionCard variant="elevated" custom={index} initial="hidden" animate="visible" variants={cardVariants} className="w-full h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pt-4 px-5 pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-4.5 w-4.5 text-primary" /> Campos Customizados
        </CardTitle>
        <Button size="sm" className="h-7 px-3 text-[11px]" onClick={handleSalvarTudo} disabled={dirty.length === 0 || salvar.isPending}>
          {salvar.isPending ? 'Salvando...' : 'Salvar'}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col justify-start px-5 pb-5">
        {isLoading ? (
          <Spinner />
        ) : campos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum campo customizado ativo para esta empresa.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {campos.map(campo => (
              <div key={campo.id} className={`space-y-1 ${campo.tipo === 'textarea' ? 'sm:col-span-2' : ''}`}>
                <Label>{campo.nome}{campo.obrigatorio && <span className="text-destructive"> *</span>}</Label>
                {campo.tipo === 'textarea' && (
                  <Textarea
                    value={valorAtual(campo.id)}
                    onChange={e => setEdicoes(f => ({ ...f, [campo.id]: e.target.value }))}
                  />
                )}
                {campo.tipo === 'numero' && (
                  <Input
                    type="number"
                    value={valorAtual(campo.id)}
                    onChange={e => setEdicoes(f => ({ ...f, [campo.id]: e.target.value }))}
                  />
                )}
                {campo.tipo === 'data' && (
                  <Input
                    type="date"
                    value={valorAtual(campo.id)}
                    onChange={e => setEdicoes(f => ({ ...f, [campo.id]: e.target.value }))}
                  />
                )}
                {campo.tipo === 'checkbox' && (
                  <div className="flex items-center h-9">
                    <Checkbox
                      checked={valorAtual(campo.id) === 'true'}
                      onCheckedChange={v => setEdicoes(f => ({ ...f, [campo.id]: v ? 'true' : 'false' }))}
                    />
                  </div>
                )}
                {campo.tipo === 'selecao' && (
                  <Select
                    value={valorAtual(campo.id)}
                    onValueChange={v => setEdicoes(f => ({ ...f, [campo.id]: v }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {(campo.opcoes || []).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                {(campo.tipo === 'texto' || !campo.tipo) && (
                  <Input
                    value={valorAtual(campo.id)}
                    onChange={e => setEdicoes(f => ({ ...f, [campo.id]: e.target.value }))}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </MotionCard>
  );
}
