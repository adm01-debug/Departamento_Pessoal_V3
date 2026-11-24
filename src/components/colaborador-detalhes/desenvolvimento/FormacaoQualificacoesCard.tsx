import { useState } from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, Edit, Plus, Award, Landmark, Calendar, MoreHorizontal } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AnimatedCascadeDialog } from '@/components/ui/animated-cascade-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cardVariants } from '@/components/dashboard/MetricCard';
import { useFormacoes, useCertificadosColaborador, useCriarFormacao } from '@/hooks';
import { toast } from 'sonner';
import { FormacaoTab } from '../FormacaoTab';

const MotionCard = motion.create(Card);

const ESCOLARIDADES = ['Fundamental incompleto', 'Fundamental completo', 'Médio incompleto', 'Médio completo', 'Superior incompleto', 'Superior completo', 'Pós-graduação', 'Mestrado', 'Doutorado'];

/** Dialog de "Adicionar" — só o formulário de nova Formação Acadêmica (sem a
 * lista de registros já cadastrados, que é responsabilidade do dialog de
 * "Editar"). Certificações não entram aqui: são emitidas automaticamente
 * pelo banco quando uma inscrição em curso é concluída (ver TreinamentosCard
 * "Adicionar" → inscrição), não existe insert manual em nenhum lugar do app. */
function AdicionarFormacaoDialog({
  open, onOpenChange, colaboradorId,
}: { open: boolean; onOpenChange: (v: boolean) => void; colaboradorId: string }) {
  const criar = useCriarFormacao();
  const [form, setForm] = useState({ tipo_escolaridade: '', curso: '', instituicao: '', ano_conclusao: '' });

  const handleSubmit = async () => {
    if (!form.tipo_escolaridade) { toast.error('Escolaridade é obrigatória'); return; }
    try {
      await criar.mutateAsync({ ...form, ano_conclusao: form.ano_conclusao ? Number(form.ano_conclusao) : null, colaborador_id: colaboradorId });
      toast.success('Formação adicionada');
      setForm({ tipo_escolaridade: '', curso: '', instituicao: '', ano_conclusao: '' });
      onOpenChange(false);
    } catch { toast.error('Erro ao adicionar formação'); }
  };

  return (
    <AnimatedCascadeDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Adicionar Formação"
      titleIcon={Plus}
      emptyMessage=""
      className="max-w-md"
      items={[
        <div key="form" className="space-y-3">
          <div>
            <Label>Escolaridade *</Label>
            <Select value={form.tipo_escolaridade} onValueChange={v => setForm(f => ({ ...f, tipo_escolaridade: v }))}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{ESCOLARIDADES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Curso</Label>
            <Input value={form.curso} onChange={e => setForm(f => ({ ...f, curso: e.target.value }))} />
          </div>
          <div>
            <Label>Instituição</Label>
            <Input value={form.instituicao} onChange={e => setForm(f => ({ ...f, instituicao: e.target.value }))} />
          </div>
          <div>
            <Label>Ano Conclusão</Label>
            <Input type="number" min="1950" max="2030" value={form.ano_conclusao} onChange={e => setForm(f => ({ ...f, ano_conclusao: e.target.value }))} />
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={!form.tipo_escolaridade || criar.isPending}>
            {criar.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>,
      ]}
    />
  );
}

function Registro({
  titulo, subtitulo, instituicao, ano, comAcoes,
}: {
  titulo: string; subtitulo?: string; instituicao?: string; ano?: string | number; comAcoes?: boolean;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_130px_70px_28px] items-center gap-3 rounded-xl border-2 border-border/60 p-3 mb-2 last:mb-0">
      <div className="min-w-0">
        <p className="text-xs font-medium truncate">{titulo}</p>
        {subtitulo && <p className="text-[11px] text-muted-foreground truncate mt-0.5">{subtitulo}</p>}
      </div>
      <span className="flex items-center gap-1 text-[11px] text-muted-foreground min-w-0">
        {instituicao && <><Landmark className="h-3 w-3 shrink-0" /> <span className="truncate">{instituicao}</span></>}
      </span>
      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
        {ano && <><Calendar className="h-3 w-3 shrink-0" /> {ano}</>}
      </span>
      {comAcoes && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-lg justify-self-end" aria-label="Mais ações">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem disabled>Nenhuma ação disponível</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

function Secao({ icon: Icon, titulo, children }: { icon: typeof GraduationCap; titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-2">
        <Icon className="h-3.5 w-3.5" /> {titulo}
      </p>
      {children}
    </div>
  );
}

/** Card "Formação & Qualificações" — reorganiza em rows compactas os dados já
 * exibidos em FormacaoTab (Formação Acadêmica) e no antigo bloco "Certificados"
 * de DesenvolvimentoResumoTab, sem duplicar as queries (mesmas query keys).
 * "Editar" e "Adicionar" abrem dialogs DIFERENTES (antes reaproveitavam o
 * mesmo `FormacaoTab`, o que fazia os dois botões terem a mesma função):
 * "Editar" abre a lista de formações já cadastradas com edição/exclusão
 * inline por linha (FormacaoTab, que agora suporta editar campos via
 * `useAtualizarFormacao`); "Adicionar" abre só o formulário de nova formação.
 * Certificações não têm ação de editar/adicionar/excluir hoje: são emitidas
 * automaticamente pelo banco quando uma inscrição em curso é concluída (ver
 * "Adicionar" do TreinamentosCard) — não existe insert manual em lugar
 * nenhum do app, então o menu "..." aqui fica presente (mesma linguagem
 * visual das outras listas) mas desabilitado. */
export function FormacaoQualificacoesCard({ colaboradorId, matchHeight }: { colaboradorId: string; matchHeight?: number }) {
  const { data: formacoes, isLoading: isLoadingFormacoes } = useFormacoes(colaboradorId);
  const { data: certificados, isLoading: isLoadingCert } = useCertificadosColaborador(colaboradorId);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const isLoading = isLoadingFormacoes || isLoadingCert;

  return (
    <MotionCard
      custom={0}
      initial="hidden"
      animate="visible"
      variants={cardVariants}
      className="border border-border/30 rounded-2xl shadow-elevated flex flex-col"
      style={matchHeight ? { height: matchHeight } : undefined}
    >
      <CardContent className="p-4 flex flex-col flex-1 min-h-0">
        <div className="flex items-start justify-between gap-2 shrink-0">
          <div className="flex items-start gap-2.5">
            <GraduationCap className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-display font-medium">Formação & Qualificações</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Formação acadêmica, certificações e outras qualificações</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-3 text-[11px] rounded-xl border-primary/40 bg-transparent text-primary hover:bg-primary/5 hover:text-primary"
              onClick={() => setEditDialogOpen(true)}
            >
              <Edit className="h-3 w-3 mr-1" /> Editar
            </Button>
            <Button size="sm" className="h-7 px-3 text-[11px]" onClick={() => setAddDialogOpen(true)}>
              <Plus className="mr-1 h-3 w-3" />Adicionar
            </Button>
          </div>
        </div>

        {isLoading ? <div className="flex justify-center py-4"><Spinner /></div> : (
          <div className={matchHeight ? 'flex-1 min-h-0 overflow-y-auto pr-1 -mr-1' : 'max-h-[200px] overflow-y-auto pr-1 -mr-1'}>
            <div className="mt-4">
              <Secao icon={GraduationCap} titulo="Formação Acadêmica">
                {!formacoes?.length ? (
                  <p className="text-xs text-muted-foreground py-1">Nenhuma formação cadastrada.</p>
                ) : (formacoes as any[]).map((f) => (
                  <Registro
                    key={f.id}
                    titulo={f.curso || f.tipo_escolaridade || '—'}
                    subtitulo={f.curso ? f.tipo_escolaridade : undefined}
                    instituicao={f.instituicao}
                    ano={f.ano_conclusao}
                  />
                ))}
              </Secao>
            </div>

            <div className="mt-5">
              <Secao icon={Award} titulo="Certificações">
                {!certificados?.length ? (
                  <p className="text-xs text-muted-foreground py-1">Nenhum certificado cadastrado.</p>
                ) : (certificados as any[]).map((c) => (
                  <Registro
                    key={c.id}
                    titulo={c.curso?.nome ?? 'Curso'}
                    subtitulo={c.curso?.carga_horaria ? `${c.curso.carga_horaria}h` : undefined}
                    instituicao={c.instituicao}
                    ano={c.data_emissao ? String(c.data_emissao).slice(0, 4) : undefined}
                    comAcoes
                  />
                ))}
              </Secao>
            </div>
          </div>
        )}
      </CardContent>

      <AnimatedCascadeDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        title="Editar Formação Acadêmica"
        titleIcon={Edit}
        emptyMessage="Nenhuma formação cadastrada."
        items={[<FormacaoTab key="formacao" colaboradorId={colaboradorId} hideHeader />]}
        className="max-w-[620px]"
      />

      <AdicionarFormacaoDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} colaboradorId={colaboradorId} />
    </MotionCard>
  );
}
