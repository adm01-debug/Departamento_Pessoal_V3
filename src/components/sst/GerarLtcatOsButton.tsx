import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { safeHref } from '@/utils/safeUrl';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresas } from '@/hooks/useEmpresas';

export function GerarLtcatOsButton() {
  const { empresaAtual } = useEmpresas();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tipo, setTipo] = useState<'os' | 'ltcat'>('os');
  const [form, setForm] = useState({
    titulo: '',
    responsavel_nome: '',
    responsavel_registro: '',
    responsavel_tipo: 'engenheiro' as 'engenheiro' | 'medico',
    descricao: '',
    conclusao: '',
  });

  const handleGerar = async () => {
    if (!empresaAtual?.id) {
      toast.error('Selecione uma empresa');
      return;
    }
    if (!form.titulo || !form.responsavel_nome) {
      toast.error('Preencha título e responsável técnico');
      return;
    }

    setLoading(true);
    try {
      const payload = tipo === 'os'
        ? {
            tipo: 'os',
            empresa_id: empresaAtual.id,
            escopo: 'cargo',
            cargo_id: crypto.randomUUID(),
            titulo: form.titulo,
            descricao_atividades: form.descricao,
            riscos: [],
            medidas_controle: [],
            epis_obrigatorios: [],
            responsavel_nome: form.responsavel_nome,
            responsavel_registro: form.responsavel_registro,
          }
        : {
            tipo: 'ltcat',
            empresa_id: empresaAtual.id,
            titulo: form.titulo,
            conclusao: form.conclusao || 'Ambiente laboral avaliado conforme NR-15.',
            responsavel_tecnico_nome: form.responsavel_nome,
            responsavel_tecnico_registro: form.responsavel_registro,
            responsavel_tecnico_tipo: form.responsavel_tipo,
            aposentadoria_especial: { aplicavel: false },
          };

      const { data, error } = await supabase.functions.invoke('gerar-ltcat-os', { body: payload });
      if (error) throw error;
      if (data?.signed_url) {
        window.open(safeHref(data.signed_url), '_blank', 'noopener');
      }
      toast.success(`${tipo === 'os' ? 'Ordem de Serviço' : 'LTCAT'} gerado — v${data?.versao}`);
      setOpen(false);
    } catch (e) {
      toast.error(safeErrorMessage(e, 'Falha ao gerar documento.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-xl">
          <FileText className="mr-2 h-4 w-4" />
          Gerar LTCAT / OS
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Gerar Documento Técnico SST</DialogTitle>
          <DialogDescription>
            Ordem de Serviço (NR-01) ou Laudo Técnico das Condições Ambientais do Trabalho (LTCAT).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Tipo de documento</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as 'os' | 'ltcat')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="os">Ordem de Serviço (NR-01)</SelectItem>
                <SelectItem value="ltcat">LTCAT — Laudo Técnico</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Título</Label>
            <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ex: OS Operador de Empilhadeira" />
          </div>

          {tipo === 'os' ? (
            <div>
              <Label>Descrição das atividades</Label>
              <Textarea rows={4} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
            </div>
          ) : (
            <>
              <div>
                <Label>Conclusão técnica</Label>
                <Textarea rows={4} value={form.conclusao} onChange={(e) => setForm({ ...form, conclusao: e.target.value })} />
              </div>
              <div>
                <Label>Categoria do responsável</Label>
                <Select value={form.responsavel_tipo} onValueChange={(v) => setForm({ ...form, responsavel_tipo: v as 'engenheiro' | 'medico' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="engenheiro">Engenheiro de Segurança do Trabalho</SelectItem>
                    <SelectItem value="medico">Médico do Trabalho</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Responsável técnico</Label>
              <Input value={form.responsavel_nome} onChange={(e) => setForm({ ...form, responsavel_nome: e.target.value })} />
            </div>
            <div>
              <Label>Registro profissional</Label>
              <Input value={form.responsavel_registro} onChange={(e) => setForm({ ...form, responsavel_registro: e.target.value })} placeholder="CREA / CRM" />
            </div>
          </div>

          <Button className="w-full" onClick={handleGerar} disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Gerando PDF...</> : 'Gerar e assinar documento'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
