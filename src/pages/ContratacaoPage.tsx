import { PageTitle } from '@/components/PageTitle';
import { sanitizeContractHtml } from '@/utils/sanitizeHtml';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import {
  FileText,
  Upload,
  CheckCircle2,
  User,
  PenTool,
  ArrowRight,
  ArrowLeft,
  Loader2,
  ShieldCheck,
  MapPin,
  Phone,
  Mail,
  Fingerprint,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CPFInput } from '@/components/ui/cpf-input';
import { CEPInput, Address } from '@/components/ui/cep-input';
import { PhoneInput } from '@/components/ui/phone-input';
import { SignaturePad } from '@/components/admissao/SignaturePad';
import { motion, AnimatePresence } from 'framer-motion';
import { useDocumentOCR, OCRResult } from '@/hooks/useDocumentOCR';
import { contratacaoService } from '@/services/contratacaoService';
import { TokenInput } from '@/components/contratacao/TokenInput';

const STEPS = [
  { id: 'dados', label: 'Dados', icon: User },
  { id: 'documentos', label: 'Documentos', icon: Upload },
  { id: 'contrato', label: 'Contrato', icon: FileText },
  { id: 'assinatura', label: 'Assinatura', icon: PenTool },
] as const;

function ContratacaoWorkflow({ token }: { token: string }) {
  const [step, setStep] = useState(0);
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    nome_completo: '',
    cpf: '',
    data_nascimento: '',
    email: '',
    telefone: '',
    cep: '',
    logradouro: '',
    numero: '',
    bairro: '',
    cidade: '',
    uf: '',
  });
  const [signature, setSignature] = useState<string | null>(null);
  const [contractHtml, setContractHtml] = useState<string | null>(null);
  const [uploadedDocs, setUploadedDocs] = useState<
    Record<string, { name: string; status: 'uploading' | 'success' | 'error'; result?: OCRResult }>
  >({});
  const { processDocument, isProcessing: isOCRProcessing } = useDocumentOCR();

  const { data: tokenData, isLoading } = useQuery({
    queryKey: ['contratacao-token', token],
    queryFn: async () => {
      // Lookup via RPC (não leitura direta da tabela): a função exige o
      // token exato como argumento, então não há como listar/enumerar
      // tokens sem já conhecer um — ver 20260718220000_rls_remediacao_auditoria.sql.
      const { data, error } = await supabase.rpc('get_admissao_por_token', { _token: token });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.token_row) return null;
      // Achata para o mesmo formato que o restante do componente já espera
      // (spread da linha de admissao_tokens + `admissao` aninhado).
      return { ...row.token_row, admissao: row.admissao };
    },
  });

  useEffect(() => {
    if (tokenData?.admissao) {
      const adm = tokenData.admissao as any;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData(prev => ({
        ...prev,
        nome_completo: adm.nome || '',
        cpf: adm.cpf || '',
        data_nascimento: adm.data_nascimento || '',
        email: adm.email || '',
        telefone: adm.telefone || '',
      }));

      // Determine step based on status
      if (tokenData.contrato_assinado) setStep(3);
      else if (tokenData.documentos_enviados) setStep(2);
      else if (tokenData.dados_preenchidos) setStep(1);

      // Load contract template
      contratacaoService.gerarTemplateContrato(adm.id).then(setContractHtml);
    }
  }, [tokenData]);

  const saveDados = useMutation({
    mutationFn: async () => {
      if (!tokenData?.id) return;

      // Update tokens status
      const { error: tokenError } = await supabase
        .from('admissao_tokens')
        .update({
          dados_preenchidos: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tokenData.id);

      if (tokenError) throw tokenError;

      // Also update the admission record with the new data
      const { error: admError } = await supabase
        .from('admissoes')
        .update({
          nome: formData.nome_completo,
          cpf: formData.cpf,
          data_nascimento: formData.data_nascimento,
          email: formData.email,
          telefone: formData.telefone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tokenData.admissao_id);

      if (admError) throw admError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratacao-token'] });
      toast.success('Dados pessoais salvos com sucesso!');
      setStep(1);
      window.scrollTo(0, 0);
    },
    onError: (err: any) => toast.error(safeErrorMessage(err, 'Erro ao salvar dados.')),
  });

  const markDocsUploaded = useMutation({
    mutationFn: async () => {
      if (!tokenData?.id) return;
      const { error } = await supabase
        .from('admissao_tokens')
        .update({
          documentos_enviados: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tokenData.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratacao-token'] });
      toast.success('Documentos enviados para análise!');
      setStep(2);
      window.scrollTo(0, 0);
    },
    onError: (err: any) => toast.error(safeErrorMessage(err, 'Erro ao processar contratação.')),
  });

  const signContract = useMutation({
    mutationFn: async () => {
      if (!tokenData?.id || !signature) return;
      const { error } = await supabase
        .from('admissao_tokens')
        .update({
          contrato_assinado: true,
          assinado_em: new Date().toISOString(),
          assinatura_base64: signature,
          ip_assinatura: 'client-ip', // In production, this would be the actual IP
          updated_at: new Date().toISOString(),
        })
        .eq('id', tokenData.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratacao-token'] });
      toast.success('Contrato assinado digitalmente!');
      setStep(3);
      window.scrollTo(0, 0);
    },
    onError: (err: any) => toast.error(safeErrorMessage(err, 'Erro ao processar contratação.')),
  });

  const handleAddressFound = (addr: Address) => {
    setFormData((prev) => ({
      ...prev,
      logradouro: addr.logradouro,
      bairro: addr.bairro,
      cidade: addr.cidade,
      uf: addr.uf,
    }));
  };
  const handleFileUpload = async (docId: string, docType: string, file: File) => {
    setUploadedDocs((prev) => ({ ...prev, [docId]: { name: file.name, status: 'uploading' } }));

    try {
      const result = await processDocument(file, docType);

      if (result.valid) {
        // 1. Upload real para o storage
        const ext = file.name.split('.').pop();
        // eslint-disable-next-line react-hooks/purity
        const storagePath = `admissao_${tokenData?.admissao_id}/${docType}_${Date.now()}.${ext}`;

        const { error: uploadErr } = await supabase.storage.from('documentos').upload(storagePath, file);

        if (uploadErr) throw uploadErr;

        // 2. Registrar na tabela documentos_admissao
        const { error: dbErr } = await supabase.from('documentos_admissao').insert({
          admissao_id: tokenData?.admissao_id,
          tipo_documento: docType,
          storage_path: storagePath,
          status: 'pendente',
        } as any);

        if (dbErr) throw dbErr;

        setUploadedDocs((prev) => ({
          ...prev,
          [docId]: { name: file.name, status: 'success', result },
        }));
        toast.success(`${docType.toUpperCase()} enviado com sucesso!`);

        if (result.extractedData) {
          const data = result.extractedData;
          if (data.nome && !formData.nome_completo) setFormData((p) => ({ ...p, nome_completo: data.nome! }));
          if (data.cpf && !formData.cpf) setFormData((p) => ({ ...p, cpf: data.cpf! }));
          if (data.cep && !formData.cep) setFormData((p) => ({ ...p, cep: data.cep! }));
        }
      } else {
        setUploadedDocs((prev) => ({
          ...prev,
          [docId]: { name: file.name, status: 'error', result },
        }));
        toast.error(`Atenção: ${result.error || 'Não foi possível validar o documento.'}`);
      }
    } catch (error: any) {
      console.error(error);
      setUploadedDocs(prev => ({ ...prev, [docId]: { name: file.name, status: 'error' } }));
      toast.error(safeErrorMessage(error, 'Erro no upload do documento.'));
    }
  };

  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );

  const progress = ((step + (step === 3 ? 1 : 0)) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Mobile Top Header */}
      <div className="bg-white border-b border-slate-200 p-4 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-slate-800">Contratação Digital</span>
          </div>
          <Badge variant="secondary" className="font-mono text-[10px] tracking-widest bg-slate-100">
            #{token.slice(0, 8).toUpperCase()}
          </Badge>
        </div>
      </div>

      <div className="flex-1 max-w-3xl w-full mx-auto p-4 md:p-8 space-y-6">
        {/* Stepper Card */}
        <Card className="border-0 shadow-xs rounded-3xl overflow-hidden bg-white">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center px-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Etapa {step + 1} de {STEPS.length}
                </span>
                <span className="text-xs font-bold text-primary">{Math.round(progress)}% Concluído</span>
              </div>
              <Progress value={progress} className="h-2 bg-slate-100" />
              <div className="flex justify-between relative pt-2">
                {STEPS.map((s, i) => (
                  <div key={s.id} className="flex flex-col items-center gap-2 z-10">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500',
                        i < step
                          ? 'bg-success text-white shadow-success/20 shadow-lg'
                          : i === step
                            ? 'bg-primary text-white shadow-glow'
                            : 'bg-slate-100 text-slate-400'
                      )}
                    >
                      {i < step ? <CheckCircle2 className="w-5 h-5" /> : <s.icon className="w-5 h-5" />}
                    </div>
                    <span
                      className={cn(
                        'text-[10px] font-bold uppercase tracking-tight hidden sm:block',
                        i <= step ? 'text-slate-800' : 'text-slate-400'
                      )}
                    >
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Area with AnimatePresence */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-0 shadow-xl rounded-3xl overflow-hidden bg-white min-h-[400px]">
              <CardContent className="p-6 md:p-8">
                {step === 0 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                      <div className="p-2 rounded-xl bg-primary/10 text-primary">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-xl font-display font-bold">Dados Pessoais</h2>
                        <p className="text-xs text-muted-foreground">Confirme e complete suas informações básicas.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2 md:col-span-2">
                        <Label className="font-bold flex items-center gap-2">
                          <Fingerprint className="w-4 h-4 text-muted-foreground" /> Nome Completo
                        </Label>
                        <Input
                          value={formData.nome_completo}
                          onChange={(e) => setFormData((p) => ({ ...p, nome_completo: e.target.value }))}
                          className="h-12 rounded-xl"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="font-bold flex items-center gap-2">
                          <Fingerprint className="w-4 h-4 text-muted-foreground" /> CPF
                        </Label>
                        <CPFInput
                          value={formData.cpf}
                          onChange={(v) => setFormData((p) => ({ ...p, cpf: v }))}
                          className="h-12 rounded-xl"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="font-bold flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" /> Data de Nascimento
                        </Label>
                        <Input
                          type="date"
                          value={formData.data_nascimento}
                          onChange={(e) => setFormData((p) => ({ ...p, data_nascimento: e.target.value }))}
                          className="h-12 rounded-xl"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="font-bold flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground" /> E-mail
                        </Label>
                        <Input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                          className="h-12 rounded-xl"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="font-bold flex items-center gap-2">
                          <Phone className="w-4 h-4 text-muted-foreground" /> Celular
                        </Label>
                        <PhoneInput
                          value={formData.telefone}
                          onChange={(v) => setFormData((p) => ({ ...p, telefone: v }))}
                          className="h-12 rounded-xl"
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <div className="h-px bg-slate-100 my-2" />
                        <Label className="font-bold flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground" /> CEP para busca de Endereço
                        </Label>
                        <CEPInput
                          value={formData.cep}
                          onChange={(v) => setFormData((p) => ({ ...p, cep: v }))}
                          onAddressFound={handleAddressFound}
                          className="h-12 rounded-xl"
                        />
                      </div>

                      {formData.logradouro && (
                        <>
                          <div className="space-y-2 md:col-span-2">
                            <Label className="font-bold">Logradouro</Label>
                            <Input value={formData.logradouro} readOnly className="h-12 rounded-xl bg-slate-50" />
                          </div>
                          <div className="space-y-2">
                            <Label className="font-bold text-primary">Número *</Label>
                            <Input
                              value={formData.numero}
                              onChange={(e) => setFormData((p) => ({ ...p, numero: e.target.value }))}
                              placeholder="Digite o número"
                              className="h-12 rounded-xl border-primary/50"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="font-bold">Cidade / UF</Label>
                            <Input
                              value={`${formData.cidade} - ${formData.uf}`}
                              readOnly
                              className="h-12 rounded-xl bg-slate-50"
                            />
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex justify-end pt-6 border-t border-slate-100">
                      <Button
                        onClick={() => saveDados.mutate()}
                        disabled={saveDados.isPending || !formData.nome_completo || !formData.cpf}
                        className="h-14 px-10 rounded-2xl text-lg font-bold shadow-glow"
                      >
                        {saveDados.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                        Próxima Etapa <ArrowRight className="w-5 h-5 ml-2" />
                      </Button>
                    </div>
                  </div>
                )}

                {step === 1 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                      <div className="p-2 rounded-xl bg-primary/10 text-primary">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-xl font-display font-bold">Documentos Digitais</h2>
                        <p className="text-xs text-muted-foreground">Tire fotos legíveis ou envie arquivos PDF.</p>
                      </div>
                    </div>

                    <div className="grid gap-4">
                      {[
                        {
                          id: 'rg',
                          label: 'RG ou CNH (Frente e Verso)',
                          icon: Fingerprint,
                          required: true,
                          type: 'rg',
                        },
                        { id: 'cpf', label: 'CPF', icon: ShieldCheck, required: true, type: 'cpf' },
                        {
                          id: 'residencia',
                          label: 'Comprovante de Residência',
                          icon: MapPin,
                          required: true,
                          type: 'residencia',
                        },
                        { id: 'foto', label: 'Sua Foto (Selfie)', icon: User, required: true, type: 'foto' },
                        { id: 'ctps', label: 'CTPS Digital', icon: FileText, required: false, type: 'ctps' },
                      ].map((doc) => {
                        const status = uploadedDocs[doc.id];
                        return (
                          <div
                            key={doc.id}
                            className={cn(
                              'group flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl border-2 transition-all bg-white gap-4',
                              status?.status === 'success'
                                ? 'border-success/30 bg-success/5'
                                : status?.status === 'error'
                                  ? 'border-destructive/30 bg-destructive/5'
                                  : 'border-slate-100 hover:border-primary/30'
                            )}
                          >
                            <div className="flex items-center gap-4">
                              <div
                                className={cn(
                                  'w-12 h-12 rounded-xl flex items-center justify-center transition-colors',
                                  status?.status === 'success'
                                    ? 'bg-success/20 text-success'
                                    : status?.status === 'error'
                                      ? 'bg-destructive/20 text-destructive'
                                      : 'bg-slate-50 text-slate-400 group-hover:bg-primary/10 group-hover:text-primary'
                                )}
                              >
                                {status?.status === 'success' ? (
                                  <CheckCircle2 className="w-6 h-6" />
                                ) : (
                                  <doc.icon className="w-6 h-6" />
                                )}
                              </div>
                              <div>
                                <p className="font-bold text-slate-800">{doc.label}</p>
                                <div className="flex gap-2 items-center">
                                  {doc.required && (
                                    <Badge
                                      variant="secondary"
                                      className="text-[10px] uppercase bg-slate-100 text-slate-500"
                                    >
                                      Obrigatório
                                    </Badge>
                                  )}
                                  {status?.status === 'uploading' && (
                                    <span className="text-[10px] text-primary animate-pulse font-bold uppercase">
                                      Validando IA...
                                    </span>
                                  )}
                                  {status?.status === 'success' && (
                                    <span className="text-[10px] text-success font-bold uppercase">Validado</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <input
                                type="file"
                                id={`file-${doc.id}`}
                                className="hidden"
                                accept="image/*,.pdf"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleFileUpload(doc.id, doc.type, file);
                                }}
                              />
                              <Button
                                variant={status?.status === 'success' ? 'secondary' : 'outline'}
                                className="flex-1 sm:flex-none rounded-xl border-slate-200 h-10"
                                onClick={() => document.getElementById(`file-${doc.id}`)?.click()}
                                disabled={status?.status === 'uploading'}
                              >
                                {status?.status === 'uploading' ? (
                                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                ) : (
                                  <Upload className="w-4 h-4 mr-2" />
                                )}
                                {status?.status === 'success' ? 'Trocar' : 'Enviar'}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex justify-between pt-6 border-t border-slate-100">
                      <Button variant="ghost" onClick={() => setStep(0)} className="h-12 rounded-xl">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
                      </Button>
                      <Button
                        onClick={() => markDocsUploaded.mutate()}
                        disabled={markDocsUploaded.isPending}
                        className="h-14 px-10 rounded-2xl text-lg font-bold shadow-glow"
                      >
                        Tudo Pronto <ArrowRight className="w-5 h-5 ml-2" />
                      </Button>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                      <div className="p-2 rounded-xl bg-primary/10 text-primary">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-xl font-display font-bold">Contrato de Trabalho</h2>
                        <p className="text-xs text-muted-foreground">Leia atentamente as cláusulas do seu contrato.</p>
                      </div>
                    </div>

                    <div className="p-6 md:p-10 rounded-3xl border-2 border-slate-100 bg-slate-50 shadow-inner max-h-[500px] overflow-y-auto">
                      {contractHtml ? (
                        <div
                          dangerouslySetInnerHTML={{ __html: sanitizeContractHtml(contractHtml) }}
                          className="prose prose-sm max-w-none"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center py-12 gap-4">
                          <Loader2 className="w-8 h-8 animate-spin text-primary" />
                          <p className="text-sm text-muted-foreground">Gerando seu contrato personalizado...</p>
                        </div>
                      )}

                      <div className="h-px bg-slate-200 my-8" />

                      <div className="space-y-6">
                        <h4 className="font-bold text-sm uppercase text-slate-800 tracking-wider">
                          Assinatura Eletrônica
                        </h4>
                        <p className="text-sm italic">
                          Ao assinar abaixo, você declara que leu e concorda com todos os termos deste contrato.
                        </p>

                        <SignaturePad onSave={setSignature} onClear={() => setSignature(null)} />
                      </div>
                    </div>

                    <div className="flex justify-between pt-6 border-t border-slate-100">
                      <Button variant="ghost" onClick={() => setStep(1)} className="h-12 rounded-xl">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
                      </Button>
                      <Button
                        onClick={() => signContract.mutate()}
                        disabled={signContract.isPending || !signature}
                        className={cn(
                          'h-14 px-10 rounded-2xl text-lg font-bold transition-all',
                          signature
                            ? 'bg-success hover:bg-success/90 text-white shadow-success/20 shadow-lg'
                            : 'bg-slate-200 text-slate-400'
                        )}
                      >
                        {signContract.isPending ? (
                          <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        ) : (
                          <PenTool className="w-5 h-5 mr-2" />
                        )}
                        Assinar Contrato
                      </Button>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="text-center space-y-8 py-10">
                    <motion.div
                      initial={{ scale: 0.5 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', damping: 10 }}
                    >
                      <div className="w-24 h-24 rounded-[2.5rem] bg-success/10 flex items-center justify-center mx-auto shadow-inner">
                        <CheckCircle2 className="w-12 h-12 text-success" />
                      </div>
                    </motion.div>

                    <div className="space-y-3">
                      <h2 className="text-3xl font-display font-bold text-slate-800">Tudo Pronto!</h2>
                      <p className="text-lg text-muted-foreground max-w-md mx-auto">
                        Sua admissão digital foi concluída com sucesso. Seus dados e o contrato assinado já estão com o
                        RH.
                      </p>
                    </div>

                    <div className="p-6 bg-slate-50 rounded-3xl border-2 border-slate-100 max-w-sm mx-auto space-y-4">
                      <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Próximos Passos</p>
                      <div className="space-y-3 text-left">
                        <div className="flex gap-3 items-center">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                            1
                          </div>
                          <p className="text-xs font-medium">Análise de documentos pelo RH</p>
                        </div>
                        <div className="flex gap-3 items-center opacity-50">
                          <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold">
                            2
                          </div>
                          <p className="text-xs font-medium">Envio ao eSocial</p>
                        </div>
                        <div className="flex gap-3 items-center opacity-50">
                          <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold">
                            3
                          </div>
                          <p className="text-xs font-medium">Liberação de acessos aos sistemas</p>
                        </div>
                      </div>
                    </div>

                    <Button variant="outline" className="rounded-2xl h-12" onClick={() => window.location.reload()}>
                      Sair do Portal
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer Branding */}
      <div className="p-8 text-center text-slate-400">
        <div className="flex items-center justify-center gap-2 mb-2">
          <ShieldCheck className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Processo Seguro & Criptografado</span>
        </div>
        <p className="text-[10px]">
          © {new Date().getFullYear()} Plataforma DP Inteligente. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}

export default function ContratacaoPage(): React.ReactElement {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token');
  const [validToken, setValidToken] = useState<string | null>(tokenFromUrl);

  return (
    <>
      <PageTitle title="Admissão Digital" description="Portal de Contratação do Candidato" />
      {!validToken ? <TokenInput onValidToken={setValidToken} /> : <ContratacaoWorkflow token={validToken} />}
    </>
  );
}
