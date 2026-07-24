import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, FileText, Calendar, Trash2, Edit2, AlertCircle, History, Copy, CheckCircle2 } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useAfastamentos } from '@/hooks/useAfastamentos';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const statusColors: Record<string, string> = {
  ativo: 'bg-blue-100 text-blue-700 border-blue-200',
  aprovado: 'bg-green-100 text-green-700 border-green-200',
  finalizado: 'bg-gray-100 text-gray-700 border-gray-200',
  pendente: 'bg-orange-100 text-orange-700 border-orange-200',
  rejeitado: 'bg-red-100 text-red-700 border-red-200',
};

const tipoLabels: Record<string, string> = {
  doenca: 'Doença',
  acidente_trabalho: 'Acidente Trabalho',
  acidente_trajeto: 'Acidente Trajeto',
  licenca_maternidade: 'L. Maternidade',
  licenca_paternidade: 'L. Paternidade',
  licenca_casamento: 'L. Casamento',
  licenca_obito: 'L. Óbito',
  licenca_nao_remunerada: 'L. Não Remunerada',
  servico_militar: 'Serviço Militar',
  mandato_sindical: 'Mandato Sindical',
  suspensao_disciplinar: 'Suspensão Disc.',
  outros: 'Outros',
};

interface AfastamentoTableProps {
  data: any[];
  onEdit: (afastamento: any) => void;
  onProrrogacao: (afastamento: any) => void;
  onDocuments: (afastamento: any) => void;
  onTimeline: (afastamento: any) => void;
}

export function AfastamentoTable({ data, onEdit, onProrrogacao, onDocuments, onTimeline }: AfastamentoTableProps) {
  const { excluir } = useAfastamentos();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleExcluir = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este registro?')) {
      await excluir(id);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="rounded-xl border border-border/50 overflow-hidden bg-card">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="w-[250px] font-semibold">Colaborador</TableHead>
            <TableHead className="font-semibold">Tipo / CID</TableHead>
            <TableHead className="font-semibold">Período</TableHead>
            <TableHead className="font-semibold text-center">Dias</TableHead>
            <TableHead className="font-semibold">INSS</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((af) => (
            <TableRow key={af.id} className="hover:bg-accent/5 transition-colors">
              <TableCell>
                <div className="font-medium text-foreground">{af.colaborador?.nome_completo || '—'}</div>
                <div className="text-xs text-muted-foreground">ID: {af.id.split('-')[0]}</div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-normal">
                    {tipoLabels[af.tipo] || af.tipo}
                  </Badge>
                  {af.cid && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className={`text-xs font-mono px-1.5 py-0.5 rounded cursor-help border transition-all duration-300 ${
                            af.cid?.codigo?.toLowerCase().includes(window.location.search.toLowerCase()) || 
                            af.cid?.descricao?.toLowerCase().includes(window.location.search.toLowerCase())
                              ? "bg-orange-500 text-white border-orange-600 scale-110 shadow-xs"
                              : "bg-muted text-muted-foreground border-border/50"
                          }`}>
                            {af.cid?.codigo || af.cid}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="bg-popover border-border shadow-xl">
                          <p className="font-bold text-primary">{af.cid?.codigo}</p>
                          <p className="text-xs max-w-[220px] leading-relaxed">{af.cid?.descricao || 'Sem descrição detalhada'}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  {format(new Date(af.data_inicio), 'dd/MM/yyyy')} 
                  <span className="text-muted-foreground mx-1">→</span>
                  {format(new Date(af.data_fim_prevista), 'dd/MM/yyyy')}
                </div>
              </TableCell>
              <TableCell className="text-center">
                <div className="font-bold text-primary">{af.dias_total}</div>
                <div className="text-[10px] text-muted-foreground">dias totais</div>
              </TableCell>
              <TableCell>
                {af.dias_inss > 0 ? (
                  <div className="flex flex-col gap-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1 text-warning font-semibold text-sm cursor-help">
                            <AlertCircle className="h-4 w-4" />
                            {af.dias_inss} dias
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>O colaborador deve ser encaminhado ao INSS.</p>
                          <p className="text-xs text-muted-foreground">Excedeu o limite de {af.dias_empresa} dias pagos pela empresa.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    {af.protocolo_inss && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                        onClick={() => copyToClipboard(af.protocolo_inss, af.id)}
                      >
                        {copiedId === af.id ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                        {af.protocolo_inss}
                      </Button>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-full">Empresa</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Badge className={`capitalize shadow-none ${statusColors[af.status] || 'bg-muted text-muted-foreground'}`}>
                    {af.status}
                  </Badge>
                  {af.documentos_count > 0 && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary">
                            <FileText className="h-3 w-3" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{af.documentos_count} documento(s) anexado(s)</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Mais opções" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Ações</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => onEdit(af)}>
                      <Edit2 className="mr-2 h-4 w-4" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onTimeline(af)}>
                      <History className="mr-2 h-4 w-4" /> Ver Linha do Tempo
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDocuments(af)}>
                      <FileText className="mr-2 h-4 w-4" /> Documentos
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onProrrogacao(af)}>
                      <Calendar className="mr-2 h-4 w-4" /> Prorrogar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => handleExcluir(af.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
