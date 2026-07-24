import { PageTitle } from '@/components/PageTitle';
import { useState, useRef } from 'react';
import { PageLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, XCircle, Download, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { useImportacaoColaboradores } from '@/hooks/useImportacaoColaboradores';
import { downloadTemplate as downloadImportTemplate } from '@/utils/importacao/template';

export default function ImportacaoPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'done'>('upload');
  const { rows, progress, isImporting, processarArquivo, importar, setRows } = useImportacaoColaboradores();

  const [importResult, setImportResult] = useState({ success: 0, errors: 0, duplicates: 0 });

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await processarArquivo(file);
      setStep('preview');
    } catch (err) {
      console.error('Erro ao processar arquivo:', err);
      toast.error('Falha ao processar o arquivo. Verifique o formato e tente novamente.');
    }
  };

  const handleImport = async () => {
    await importar();
    setImportResult({
      success: rows.filter((r) => r.status === 'valido').length,
      errors: rows.filter((r) => r.status === 'erro').length,
      duplicates: rows.filter((r) => r.status === 'duplicado').length,
    });
    setStep('done');
  };

  const downloadTemplate = async () => {
    try {
      await downloadImportTemplate();
      toast.success('Modelo baixado!');
    } catch (err: any) {
      toast.error(safeErrorMessage(err, 'Erro ao gerar modelo de importação.'));
    }
  };

  const validCount = rows.filter(r => r.status === 'valido').length;
  const errorCount = rows.filter(r => r.status === 'erro').length;
  const dupCount = rows.filter(r => r.status === 'duplicado').length;

  return (
    <>
    <PageTitle title="Importação" description="Importação de dados em massa" />
    <PageLayout
      title="Importação em Massa"
      description="Importe colaboradores via Excel ou CSV"
      icon={<Upload className="h-5 w-5 text-primary-foreground" />}
      gradient="from-info to-success"
    >
      {step === 'upload' && (
        <div className="max-w-xl mx-auto space-y-4">
          <Card className="border-border/30 rounded-2xl">
            <CardContent className="p-8">
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-border/50 rounded-2xl p-12 text-center cursor-pointer hover:border-primary/50 transition-colors"
              >
                <FileSpreadsheet className="h-16 w-16 mx-auto text-primary/40 mb-4" />
                <p className="font-display font-semibold">Arraste ou clique para selecionar</p>
                <p className="text-sm text-muted-foreground font-body mt-1">Formatos: .xlsx, .xls, .csv</p>
                <p className="text-xs text-muted-foreground/60 font-body mt-1">Máximo 1000 registros por importação</p>
              </div>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
            </CardContent>
          </Card>

          <Card className="border-border/30 rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display font-semibold text-sm">Modelo de Planilha</p>
                  <p className="text-xs text-muted-foreground font-body">Baixe o modelo com as colunas corretas</p>
                </div>
                <Button variant="outline" onClick={downloadTemplate} className="rounded-xl font-body">
                  <Download className="h-4 w-4 mr-2" />Baixar Modelo
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/30 rounded-2xl">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-display">Colunas Reconhecidas</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {['Nome', 'CPF', 'Email', 'Telefone', 'Cargo', 'Departamento', 'Salário', 'Admissão', 'Nascimento', 'PIS', 'RG'].map(col => (
                  <Badge key={col} variant="outline" className="text-[10px] font-body">{col}</Badge>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground font-body mt-2">O sistema mapeia automaticamente variações como "Função", "Setor", "Celular", etc.</p>
            </CardContent>
          </Card>
        </div>
      )}

      {step === 'preview' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="border-border/30 rounded-2xl"><CardContent className="p-3 flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-success" />
              <div><p className="text-lg font-bold font-display">{validCount}</p><p className="text-[10px] text-muted-foreground font-body">Válidos</p></div>
            </CardContent></Card>
            <Card className="border-border/30 rounded-2xl"><CardContent className="p-3 flex items-center gap-3">
              <XCircle className="h-8 w-8 text-destructive" />
              <div><p className="text-lg font-bold font-display">{errorCount}</p><p className="text-[10px] text-muted-foreground font-body">Erros</p></div>
            </CardContent></Card>
            <Card className="border-border/30 rounded-2xl"><CardContent className="p-3 flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-warning" />
              <div><p className="text-lg font-bold font-display">{dupCount}</p><p className="text-[10px] text-muted-foreground font-body">Duplicados</p></div>
            </CardContent></Card>
          </div>

          {/* Table */}
          <Card className="rounded-2xl border-border/30 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="font-display">Status</TableHead>
                  <TableHead className="font-display">Nome</TableHead>
                  <TableHead className="font-display">CPF</TableHead>
                  <TableHead className="font-display">Cargo</TableHead>
                  <TableHead className="font-display">Departamento</TableHead>
                  <TableHead className="font-display">Salário</TableHead>
                  <TableHead className="font-display">Erros</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, 100).map((row, i) => (
                  <TableRow key={i} className={cn("transition-colors", row.status === 'erro' && 'bg-destructive/5', row.status === 'duplicado' && 'bg-warning/5')}>
                    <TableCell>
                      <Badge className={cn("border-0 font-body text-[10px]",
                        row.status === 'valido' ? 'bg-success/15 text-success' :
                        row.status === 'duplicado' ? 'bg-warning/15 text-warning' : 'bg-destructive/15 text-destructive'
                      )}>
                        {row.status === 'valido' ? '✓' : row.status === 'duplicado' ? '⚠' : '✗'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-body text-sm font-medium">{row.nome_completo || '—'}</TableCell>
                    <TableCell className="font-body text-xs">{row.cpf || '—'}</TableCell>
                    <TableCell className="font-body text-xs">{row.cargo || '—'}</TableCell>
                    <TableCell className="font-body text-xs">{row.departamento || '—'}</TableCell>
                    <TableCell className="font-body text-xs">{row.salario_base ? `R$ ${Number(row.salario_base).toLocaleString('pt-BR')}` : '—'}</TableCell>
                    <TableCell className="text-[10px] text-destructive font-body">{row.erros.join(', ')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {rows.length > 100 && <div className="p-2 text-center text-xs text-muted-foreground font-body">Mostrando 100 de {rows.length} registros</div>}
          </Card>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => { setStep('upload'); setRows([]); }} className="rounded-xl font-body">Cancelar</Button>
            <Button onClick={handleImport} disabled={!validCount} className="rounded-xl bg-gradient-to-r from-success to-info font-body">
              <Upload className="h-4 w-4 mr-2" />Importar {validCount} Colaboradores
            </Button>
          </div>
        </motion.div>
      )}

      {step === 'importing' && (
        <div className="max-w-md mx-auto text-center space-y-4 py-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="font-display font-semibold">Importando colaboradores...</p>
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-muted-foreground font-body">{progress}% concluído</p>
        </div>
      )}

      {step === 'done' && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md mx-auto text-center space-y-4 py-12">
          <CheckCircle className="h-16 w-16 text-success mx-auto" />
          <p className="font-display font-bold text-xl">Importação Concluída!</p>
          <div className="grid grid-cols-3 gap-3">
            <Card className="border-border/30 rounded-xl"><CardContent className="p-3"><p className="text-lg font-bold text-success">{importResult.success}</p><p className="text-[10px] font-body text-muted-foreground">Importados</p></CardContent></Card>
            <Card className="border-border/30 rounded-xl"><CardContent className="p-3"><p className="text-lg font-bold text-destructive">{importResult.errors}</p><p className="text-[10px] font-body text-muted-foreground">Erros</p></CardContent></Card>
            <Card className="border-border/30 rounded-xl"><CardContent className="p-3"><p className="text-lg font-bold text-warning">{importResult.duplicates}</p><p className="text-[10px] font-body text-muted-foreground">Duplicados</p></CardContent></Card>
          </div>
          <Button onClick={() => { setStep('upload'); setRows([]); }} className="rounded-xl font-body">Nova Importação</Button>
        </motion.div>
      )}
    </PageLayout>
    </>
  );
}
