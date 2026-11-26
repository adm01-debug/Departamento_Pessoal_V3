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

/**
 * O tipo vem de um INSERT do candidato (token público) e não é validado por
 * enum no banco: um valor como "constructor" cairia em Object.prototype e o
 * React abortaria o render. Só rótulos próprios do mapa são usados.
 */
function rotuloTipo(tipo: string | null | undefined): string {
  if (typeof tipo === 'string' && Object.prototype.hasOwnProperty.call(TIPO_LABEL, tipo)) {
    return TIPO_LABEL[tipo];
  }
  return typeof tipo === 'string' && tipo.trim() ? tipo : 'Documento';
}

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
  const [linkBloqueado, setLinkBloqueado] = useState<{ id: string; url: string } | null>(null);

  const {
    data: arquivos = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['documentos-admissao', admissaoId],
    queryFn: () => documentosAdmissaoService.listar(admissaoId),
    enabled: Boolean(admissaoId),
    // O candidato pode enviar/trocar um documento enquanto o RH tem os detalhes
    // abertos: sem isso o cache de 5 minutos esconderia o envio novo.
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const abrir = useCallback(async (arquivo: Tables<'documentos_admissao'>) => {
    setErro(null);
    setLinkBloqueado(null);
    setAbrindoId(arquivo.id);
    // A aba precisa nascer no gesto do clique: depois do await o navegador não
    // considera mais ação do usuário e o pop-up é bloqueado sem erro visível.
    const janela = window.open('about:blank', '_blank');
    if (janela) janela.opener = null;
    try {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(arquivo.url, 300);
      if (error || !data?.signedUrl) throw error ?? new Error('URL assinada indisponível');
      if (janela) {
        janela.location.replace(data.signedUrl);
      } else {
        setLinkBloqueado({ id: arquivo.id, url: data.signedUrl });
        setErro('O navegador bloqueou a nova aba. Use o link "Abrir arquivo".');
      }
    } catch {
      janela?.close();
      setErro('Não foi possível abrir o arquivo. Tente novamente.');
    } finally {
      setAbrindoId(null);
    }
  }, []);

  // Envio novo do mesmo tipo não apaga o anterior: a migration
  // 20261126140000 fecha a versão antiga em `substituido_em` (trigger BEFORE
  // INSERT). O RH precisa continuar conseguindo abrir o histórico, então a
  // lista mostra vigentes primeiro e o antigo fica marcado e esmaecido.
  const ordenados = [...arquivos].sort((a, b) => {
    const av = a.substituido_em ? 1 : 0;
    const bv = b.substituido_em ? 1 : 0;
    return av - bv;
  });

  if (isLoading) {
    return (
      <p className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Carregando anexos…
      </p>
    );
  }

  if (isError) {
    return (
      <div className="space-y-1 px-2 py-1">
        <p className="flex items-center gap-1 text-xs text-destructive-vivid">
          <AlertCircle className="h-3 w-3" /> Não foi possível carregar os anexos.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1 rounded-lg px-2 text-[11px]"
          onClick={() => void refetch()}
        >
          Tentar de novo
        </Button>
      </div>
    );
  }

  if (arquivos.length === 0) {
    return (
      <p className="px-2 py-1 text-xs italic text-muted-foreground">Nenhum arquivo enviado pelo candidato ainda.</p>
    );
  }

  return (
    <div className="space-y-1">
      <ul className="divide-y divide-border/60">
        {ordenados.map((arquivo) => {
          const tamanho = formatarTamanho(arquivo.tamanho_bytes);
          const substituido = Boolean(arquivo.substituido_em);
          return (
            <li key={arquivo.id} className={cn('flex items-center gap-2 px-2 py-1', substituido && 'opacity-60')}>
              <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-foreground">
                  {rotuloTipo(arquivo.tipo)}
                  {substituido ? (
                    <span className="ml-2 text-[10px] text-muted-foreground">substituído</span>
                  ) : (
                    arquivo.validado && <span className="ml-2 text-success">validado</span>
                  )}
                </p>
                <p className="truncate text-[10px] text-muted-foreground">
                  {arquivo.nome_arquivo}
                  {tamanho && ` · ${tamanho}`}
                </p>
              </div>
              {linkBloqueado?.id === arquivo.id ? (
                <a
                  href={linkBloqueado.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-7 shrink-0 rounded-lg px-2 text-[11px] font-medium text-primary underline"
                >
                  Abrir arquivo
                </a>
              ) : (
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
              )}
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
