import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ExternalLink, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/database.types';
import { documentosAdmissaoService } from '@/services/tabelas';
import { cn } from '@/lib/utils';

const BUCKET = 'documentos';

/** Rótulos dos tipos gravados pela edge `admissao-publica`. */
const TIPO_LABEL: Record<string, string> = {
  rg: 'RG ou CNH',
  cpf: 'CPF',
  residencia: 'Comprovante de residência',
  foto: 'Foto',
  ctps: 'Carteira de trabalho',
};

function formatarTamanho(bytes: number | null): string | null {
  if (!bytes || bytes <= 0) return null;
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

interface ArquivosAdmissaoListaProps {
  admissaoId: string;
}

/**
 * Anexos que o candidato enviou pelo portal público `/contratacao`.
 *
 * O arquivo vive no bucket privado `documentos`, no caminho
 * `admissao_<admissao_id>/<tipo>_<timestamp>.<ext>`, e é `documentos_admissao.url`
 * que guarda ESSE caminho — não uma URL. Por isso a abertura passa por
 * `createSignedUrl` (5 minutos), nunca por `getPublicUrl`.
 *
 * Esta lista é o elo que faltava: o registro sempre existiu, mas nenhuma tela o
 * consumia, então o RH validava o checklist sem conseguir ver o documento.
 */
export function ArquivosAdmissaoLista({ admissaoId }: ArquivosAdmissaoListaProps) {
  const [abrindoId, setAbrindoId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const { data: arquivos = [], isLoading } = useQuery({
    queryKey: ['documentos-admissao', admissaoId],
    queryFn: () => documentosAdmissaoService.listar(admissaoId),
    enabled: Boolean(admissaoId),
  });

  const abrir = useCallback(async (arquivo: Tables<'documentos_admissao'>) => {
    setErro(null);
    setAbrindoId(arquivo.id);
    try {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(arquivo.url, 300);
      if (error || !data?.signedUrl) throw error ?? new Error('URL assinada indisponível');
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch {
      setErro('Não foi possível abrir o arquivo. Tente novamente.');
    } finally {
      setAbrindoId(null);
    }
  }, []);

  if (isLoading) {
    return (
      <p className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Carregando anexos…
      </p>
    );
  }

  if (arquivos.length === 0) {
    return (
      <p className="px-2 py-1 text-xs italic text-muted-foreground">
        Nenhum arquivo enviado pelo candidato ainda.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      <ul className="divide-y divide-border/60">
        {arquivos.map((arquivo) => {
          const tamanho = formatarTamanho(arquivo.tamanho_bytes);
          return (
            <li key={arquivo.id} className="flex items-center gap-2 px-2 py-1">
              <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-foreground">
                  {TIPO_LABEL[arquivo.tipo] ?? arquivo.tipo}
                  {arquivo.validado && <span className="ml-2 text-success">validado</span>}
                </p>
                <p className="truncate text-[10px] text-muted-foreground">
                  {arquivo.nome_arquivo}
                  {tamanho && ` · ${tamanho}`}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className={cn('h-7 shrink-0 gap-1 rounded-lg px-2 text-[11px]')}
                disabled={abrindoId === arquivo.id}
                onClick={() => void abrir(arquivo)}
              >
                {abrindoId === arquivo.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <ExternalLink className="h-3 w-3" />
                )}
                Abrir
              </Button>
            </li>
          );
        })}
      </ul>
      {erro && (
        <p className="flex items-center gap-1 px-2 text-[10px] text-destructive-vivid">
          <AlertCircle className="h-3 w-3" /> {erro}
        </p>
      )}
    </div>
  );
}