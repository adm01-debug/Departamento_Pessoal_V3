import { useEffect, useMemo, useState } from 'react';
import { sanitizeContractHtml } from '@/utils/sanitizeHtml';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEmpresas } from '@/hooks/useEmpresas';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { CheckCircle2, FileText, Loader2, ShieldCheck } from 'lucide-react';

type DocumentoVigente = {
  id: string;
  titulo: string;
  versao: number;
  conteudo_html: string;
  hash_sha256: string | null;
  publicado_em: string | null;
};

type AssinaturaExistente = {
  documento_id: string;
  assinado_em: string;
  hash_documento: string | null;
};

/**
 * Card de assinatura do Regimento Interno de SST no portal do colaborador.
 * - Sanitiza HTML (DOMPurify) contra XSS de conteúdos injetados por administradores.
 * - Assinatura é idempotente (RPC `sst_regimento_assinar`).
 * - Bloqueia duplo clique via estado `saving`.
 */
export function PortalRegimentoCard() {
  const { user } = useAuth();
  const { empresaAtual } = useEmpresas();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aceite, setAceite] = useState(false);
  const [documento, setDocumento] = useState<DocumentoVigente | null>(null);
  const [assinatura, setAssinatura] = useState<AssinaturaExistente | null>(null);
  const [colaboradorId, setColaboradorId] = useState<string | null>(null);

  const empresaId = empresaAtual?.id;

  const carregar = async () => {
    if (!empresaId || !user?.id) return;
    setLoading(true);
    try {
      const db = supabase as any;

      // Vínculo colaborador ↔ user
      const { data: colab } = await db
        .from('colaboradores')
        .select('id')
        .eq('user_id', user.id)
        .eq('empresa_id', empresaId)
        .maybeSingle();
      const cid: string | null = colab?.id ?? null;
      setColaboradorId(cid);

      // Documento publicado mais recente
      const { data: doc, error: docErr } = await db
        .from('sst_regimento_documentos')
        .select('id, titulo, versao, conteudo_html, hash_sha256, publicado_em')
        .eq('empresa_id', empresaId)
        .eq('status', 'PUBLICADO')
        .order('versao', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (docErr) throw docErr;
      setDocumento(doc ?? null);

      // Assinatura existente
      if (doc && cid) {
        const { data: ass } = await db
          .from('sst_regimento_assinaturas')
          .select('documento_id, assinado_em, hash_documento')
          .eq('documento_id', doc.id)
          .eq('colaborador_id', cid)
          .maybeSingle();
        setAssinatura(ass ?? null);
      } else {
        setAssinatura(null);
      }
    } catch (err: any) {
      toast.error(safeErrorMessage(err, 'Falha ao carregar regimento.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId, user?.id]);

  const conteudoSeguro = useMemo(
    () => (documento ? sanitizeContractHtml(documento.conteudo_html || '') : ''),
    [documento],
  );

  const assinar = async () => {
    if (!documento || !colaboradorId || saving) return;
    if (!aceite) {
      toast.warning('Você precisa confirmar a leitura antes de assinar.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await (supabase as any).rpc('sst_regimento_assinar', {
        p_documento_id: documento.id,
        p_colaborador_id: colaboradorId,
      });
      if (error) throw error;
      toast.success('Regimento assinado com sucesso.');
      await carregar();
    } catch (err: any) {
      toast.error(safeErrorMessage(err, 'Erro ao assinar regimento.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!documento) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            Regimento Interno de SST
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Nenhum regimento publicado no momento. Volte mais tarde.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!colaboradorId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Regimento Interno de SST</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Seu usuário não está vinculado a um colaborador desta empresa. Fale com o RH.
          </p>
        </CardContent>
      </Card>
    );
  }

  const assinado = !!assinatura;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {documento.titulo}
          </CardTitle>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">Versão {documento.versao}</Badge>
            {documento.publicado_em && (
              <span>
                Publicado em{' '}
                {new Date(documento.publicado_em).toLocaleDateString('pt-BR')}
              </span>
            )}
            {documento.hash_sha256 && (
              <span className="font-mono">
                SHA-256: {documento.hash_sha256.slice(0, 12)}…
              </span>
            )}
          </div>
        </div>
        {assinado && (
          <Badge className="gap-1 bg-success text-success-foreground">
            <CheckCircle2 className="h-3.5 w-3.5" /> Assinado
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className="prose prose-sm dark:prose-invert max-h-[420px] max-w-none overflow-y-auto rounded-md border bg-muted/30 p-4"
          // Conteúdo sanitizado via DOMPurify acima
          dangerouslySetInnerHTML={{ __html: conteudoSeguro }}
        />

        {assinado ? (
          <div className="rounded-md border border-success/40 bg-success/10 p-3 text-sm">
            <p className="font-medium text-success-foreground">
              Assinado em{' '}
              {new Date(assinatura!.assinado_em).toLocaleString('pt-BR')}
            </p>
            {assinatura?.hash_documento && (
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                Hash validado: {assinatura.hash_documento.slice(0, 24)}…
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <label className="flex items-start gap-2 text-sm">
              <Checkbox
                checked={aceite}
                onCheckedChange={(v) => setAceite(v === true)}
                disabled={saving}
              />
              <span className="text-muted-foreground">
                Declaro que li e compreendi integralmente o Regimento Interno de
                Segurança e Saúde no Trabalho, comprometendo-me a cumpri-lo.
              </span>
            </label>
            <Button
              onClick={assinar}
              disabled={!aceite || saving}
              className="w-full md:w-auto"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Assinando…
                </>
              ) : (
                <>
                  <ShieldCheck className="mr-2 h-4 w-4" /> Assinar digitalmente
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default PortalRegimentoCard;
