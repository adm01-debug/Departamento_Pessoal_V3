import { useState } from 'react';
import { motion } from 'framer-motion';
import { Paperclip, Plus, Trash2, ExternalLink, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AnimatedCascadeDialog } from '@/components/ui/animated-cascade-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import { useDocumentos } from '@/hooks';
import { useEmpresas } from '@/hooks/useEmpresas';
import { safeHref } from '@/utils/safeUrl';
import { cardVariants } from '@/components/dashboard/MetricCard';
import { FileTypeIcon } from './FileTypeIcon';
import { dataLocalDoEvento } from '../historico/eventDate';

const MotionCard = motion.create(Card);

const TIPOS = [
  'Contrato de Trabalho',
  'Aditivo Contratual',
  'Acordo de Confidencialidade',
  'Vale Transporte',
  'Vale Refeição',
  'Exame Médico (ASO)',
  'EPI',
  'Treinamento',
  'Outros',
];

/** Painel compacto de "Gestão de Documentos Digitais" — mesmos dados/mutations
 * de ColaboradorDocuments (useDocumentos, mesma query key), reconstruído em
 * layout denso pra ficar logo abaixo de "Documentos Pessoais" na coluna
 * esquerda do dashboard de "Documentos & Compliance".
 *
 * O documento é referenciado por `documentos.url`. O envio de arquivo para o
 * bucket privado `documentos` depende de colunas que a tabela ainda não tem
 * em produção (storage_path/nome_arquivo/tamanho/mime_type) — ver a issue de
 * DDL ligada a esta PR; até lá o card não oferece upload, em vez de gravar
 * campos que o banco rejeitaria. */
export function DocumentosDigitaisCard({ colaboradorId }: { colaboradorId: string }) {
  const { documentos, isLoading, criarDocumento, excluirDocumento } = useDocumentos(colaboradorId);
  const { empresaAtualId } = useEmpresas();
  // Meia-noite local: comparar com `new Date()` (agora) marcava como vencido
  // o documento que vence hoje a partir do primeiro minuto do dia.
  const hojeLocal = new Date();
  hojeLocal.setHours(0, 0, 0, 0);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: '', tipo: 'Outros', observacoes: '', data_validade: '', url: '' });

  const resetForm = () => setForm({ nome: '', tipo: 'Outros', observacoes: '', data_validade: '', url: '' });

  const handleSubmit = async () => {
    if (!form.nome) {
      toast.error('Nome do documento é obrigatório');
      return;
    }
    if (!empresaAtualId) {
      toast.error('Empresa não identificada.');
      return;
    }

    try {
      await criarDocumento.mutateAsync({ ...form, colaborador_id: colaboradorId });
      setOpen(false);
      resetForm();
    } catch {
      // criarDocumento já mostra o toast de erro
    }
  };

  const handleAbrir = (doc: { url: string | null }) => {
    if (!doc.url) {
      toast.error('Arquivo não encontrado.');
      return;
    }
    window.open(safeHref(doc.url), '_blank', 'noopener');
  };

  const handleExcluir = async (doc: { id: string }) => {
    if (!confirm('Tem certeza que deseja excluir este documento permanentemente?')) return;
    try {
      await excluirDocumento.mutateAsync(doc.id);
    } catch {
      // excluirDocumento já mostra o toast de erro
    }
  };

  return (
    <MotionCard
      custom={1}
      initial="hidden"
      animate="visible"
      variants={cardVariants}
      className="border border-border/30 rounded-2xl shadow-elevated h-[300px] flex flex-col"
    >
      <CardContent className="p-4 flex-1 flex flex-col min-h-0">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-start gap-2.5">
            <Paperclip className="h-5 w-5 text-info mt-0.5" />
            <div>
              <p className="text-sm font-display font-medium">Gestão de Documentos Digitais</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Repositório central de arquivos e contratos do colaborador
              </p>
            </div>
          </div>
          <Button size="sm" className="h-7 px-3 text-[11px] shrink-0" onClick={() => setOpen(true)}>
            <Plus className="mr-1 h-3 w-3" />
            Novo documento
          </Button>
        </div>

        <AnimatedCascadeDialog
          open={open}
          onOpenChange={setOpen}
          title="Adicionar Novo Documento"
          titleIcon={Paperclip}
          emptyMessage=""
          items={[
            <div key="nome" className="space-y-1">
              <Label>Nome do Documento *</Label>
              <Input
                placeholder="Ex: Contrato de Trabalho 2024"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              />
            </div>,
            <div key="tipo" className="space-y-1">
              <Label>Tipo de Documento</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm((f) => ({ ...f, tipo: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>,
            <div key="validade" className="space-y-1">
              <Label>Data de Validade (opcional)</Label>
              <Input
                type="date"
                value={form.data_validade}
                onChange={(e) => setForm((f) => ({ ...f, data_validade: e.target.value }))}
              />
            </div>,
            <div key="arquivo" className="space-y-1">
              <Label>Link do arquivo (opcional)</Label>
              <Input
                placeholder="https://..."
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              />
            </div>,
            <div key="observacoes" className="space-y-1">
              <Label>Observações</Label>
              <Input
                placeholder="Notas internas..."
                value={form.observacoes}
                onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
              />
            </div>,
            <div key="salvar" className="flex justify-end pt-1">
              <Button size="sm" className="rounded-lg px-4" onClick={handleSubmit} disabled={criarDocumento.isPending}>
                {criarDocumento.isPending ? (
                  <Spinner className="mr-1.5 h-3.5 w-3.5" />
                ) : (
                  <Shield className="h-3.5 w-3.5 mr-1.5" />
                )}
                Salvar Documento com Segurança
              </Button>
            </div>,
          ]}
        />

        {isLoading ? (
          <div className="flex justify-center py-4">
            <Spinner />
          </div>
        ) : !documentos.length ? (
          <p className="text-xs text-muted-foreground py-1">Nenhum documento anexado.</p>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-8 px-2 text-[11px] font-medium">Documento</TableHead>
                  <TableHead className="h-8 px-2 text-[11px] font-medium text-center">Tipo</TableHead>
                  <TableHead className="h-8 px-2 text-[11px] font-medium text-center">Upload em</TableHead>
                  <TableHead className="h-8 px-2 text-[11px] font-medium text-center">Validade</TableHead>
                  <TableHead className="h-8 px-2 text-[11px] font-medium text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documentos.map((doc) => (
                  <TableRow key={doc.id} className="group border-border/20">
                    <TableCell className="px-2 py-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileTypeIcon url={doc.url} tipo={doc.tipo} className="h-5 w-5 shrink-0" />
                        <span className="text-xs font-medium truncate">{doc.nome}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-2 py-2.5 text-center">
                      <Badge variant="outline" size="sm" className="uppercase">
                        {doc.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-2 py-2.5 text-xs text-muted-foreground text-center">
                      {dataLocalDoEvento(doc.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="px-2 py-2.5 text-xs text-center">
                      {doc.data_validade ? (
                        <span
                          className={
                            dataLocalDoEvento(doc.data_validade) < hojeLocal
                              ? 'text-destructive font-medium'
                              : 'text-success font-medium'
                          }
                        >
                          {dataLocalDoEvento(doc.data_validade).toLocaleDateString('pt-BR')}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="px-2 py-2.5 text-right">
                      <div className="flex justify-end gap-0.5">
                        {doc.url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            aria-label="Abrir em nova aba"
                            onClick={() => handleAbrir(doc)}
                          >
                            <ExternalLink className="h-3.5 w-3.5 text-info" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          aria-label="Excluir"
                          onClick={() => handleExcluir(doc)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </MotionCard>
  );
}
