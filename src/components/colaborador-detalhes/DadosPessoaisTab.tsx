import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IdCard, MapPin } from 'lucide-react';
import { usePiiMask } from '@/hooks/usePiiMask';
import { registrarAcessoPII } from '@/services/piiAccessLogService';
import type { Colaborador } from '@/types/entities';

/** Rótulos do enum `estado_civil` do banco. */
const ESTADO_CIVIL_LABEL: Record<string, string> = {
  solteiro: 'Solteiro(a)',
  casado: 'Casado(a)',
  divorciado: 'Divorciado(a)',
  viuvo: 'Viúvo(a)',
  separado: 'Separado(a)',
  uniao_estavel: 'União estável',
};

function formatarData(iso: string | null | undefined): string {
  if (!iso) return '';
  // `T12:00:00` evita o recuo de um dia por fuso em datas puras (ver utils/dateLocal).
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR');
}

/** Campo somente-leitura. Valor vazio aparece como "—", não como espaço em branco. */
function CampoInfo({ label, valor }: { label: string; valor?: string | null }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-sm font-body truncate" title={valor || undefined}>
        {valor || '—'}
      </p>
    </div>
  );
}

/**
 * Identificação e contato do colaborador, em leitura. Resgatada da branch
 * `muri`, onde a versão original mostrava CPF, RG, e-mail, telefone e endereço
 * SEM máscara nenhuma (0 usos de `usePiiMask`/`registrarAcessoPII`) — num
 * repositório público. Aqui cada campo sensível passa pelo contrato de PII da
 * main e a abertura da aba é registrada na trilha de acesso.
 *
 * Antes disso, nada deste conjunto aparecia no dossiê: nome social, RG, estado
 * civil, e-mail pessoal, CEP, logradouro e complemento só eram visíveis
 * abrindo o formulário de edição do colaborador.
 */
export function DadosPessoaisTab({ colaborador }: { colaborador: Colaborador | null | undefined }) {
  const pii = usePiiMask();

  useEffect(() => {
    if (!colaborador?.id) return;
    // Quem pode ver PII e abriu a ficha fica registrado; quem vê mascarado não
    // acessou dado sensível, então não polui a trilha.
    if (!pii.canViewPii) return;
    void registrarAcessoPII('colaboradores', 'select', {
      empresaId: colaborador.empresa_id,
      registroId: colaborador.id,
    });
  }, [colaborador?.id, colaborador?.empresa_id, pii.canViewPii]);

  const endereco = [colaborador?.logradouro, colaborador?.numero].filter(Boolean).join(', ');

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <Card className="border border-border/30 rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-display flex items-center gap-2">
            <IdCard className="h-4 w-4 text-primary" /> Identificação Pessoal
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-3">
          <CampoInfo label="Nome completo" valor={colaborador?.nome_completo} />
          <CampoInfo label="Nome social" valor={colaborador?.nome_social} />
          <CampoInfo label="CPF" valor={pii.cpf(colaborador?.cpf)} />
          <CampoInfo label="RG" valor={pii.rg(colaborador?.rg)} />
          <CampoInfo label="Órgão emissor" valor={colaborador?.rg_orgao_emissor} />
          <CampoInfo label="UF do RG" valor={colaborador?.rg_uf} />
          <CampoInfo label="Data de nascimento" valor={formatarData(colaborador?.data_nascimento)} />
          <CampoInfo
            label="Estado civil"
            valor={
              colaborador?.estado_civil
                ? (ESTADO_CIVIL_LABEL[colaborador.estado_civil] ?? colaborador.estado_civil)
                : ''
            }
          />
          <CampoInfo label="Matrícula" valor={colaborador?.matricula} />
        </CardContent>
      </Card>

      <Card className="border border-border/30 rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-display flex items-center gap-2">
            <MapPin className="h-4 w-4 text-info" /> Contato e Endereço
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-3">
          <CampoInfo label="E-mail pessoal" valor={pii.email(colaborador?.email_pessoal)} />
          <CampoInfo label="Telefone" valor={pii.phone(colaborador?.telefone)} />
          <CampoInfo label="Celular" valor={pii.phone(colaborador?.celular)} />
          <CampoInfo label="CEP" valor={pii.endereco(colaborador?.cep)} />
          <CampoInfo label="Endereço" valor={pii.endereco(endereco)} />
          <CampoInfo label="Complemento" valor={pii.endereco(colaborador?.complemento)} />
          <CampoInfo label="Bairro" valor={colaborador?.bairro} />
          <CampoInfo label="Cidade" valor={colaborador?.cidade} />
          <CampoInfo label="UF" valor={colaborador?.uf} />
        </CardContent>
      </Card>
    </div>
  );
}
