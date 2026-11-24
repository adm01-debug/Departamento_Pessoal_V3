import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Trash2 } from 'lucide-react';
import type { WfNode } from './WorkflowDesigner';

interface NodeInspectorProps {
  selectedNode: WfNode;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<WfNode>) => void;
  onDelete: (id: string) => void;
}

export function NodeInspector({ selectedNode, onClose, onUpdate, onDelete }: NodeInspectorProps) {
  return (
    <Card className="w-64 flex-shrink-0 rounded-2xl border-border/30 overflow-hidden">
      <div className="bg-muted/30 px-3 py-2 border-b border-border/30 flex items-center justify-between">
        <p className="text-xs font-bold font-display text-muted-foreground uppercase tracking-wide">Propriedades</p>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-lg" onClick={onClose}>
          <X className="h-3 w-3" />
        </Button>
      </div>
      <CardContent className="p-3 space-y-3">
        <div>
          <Label className="text-xs font-body">Nome</Label>
          <Input
            className="h-8 rounded-lg text-xs font-body"
            value={selectedNode.label}
            onChange={(e) => onUpdate(selectedNode.id, { label: e.target.value })}
          />
        </div>

        {selectedNode.type === 'aprovador' && (
          <>
            <div>
              <Label className="text-xs font-body">Nível</Label>
              <Input
                className="h-8 rounded-lg text-xs font-body"
                type="number"
                value={(selectedNode.config.nivel as number) ?? 1}
                onChange={(e) =>
                  onUpdate(selectedNode.id, { config: { ...selectedNode.config, nivel: Number(e.target.value) } })
                }
              />
            </div>
            <div>
              <Label className="text-xs font-body">SLA (horas)</Label>
              <Input
                className="h-8 rounded-lg text-xs font-body"
                type="number"
                value={(selectedNode.config.sla_horas as number) ?? 48}
                onChange={(e) =>
                  onUpdate(selectedNode.id, {
                    config: { ...selectedNode.config, sla_horas: Number(e.target.value) },
                  })
                }
              />
            </div>
            <div>
              <Label className="text-xs font-body">Papel</Label>
              <select
                className="w-full h-8 rounded-lg border border-input bg-background px-2 text-xs font-body"
                value={(selectedNode.config.papel as string) ?? 'gestor'}
                onChange={(e) =>
                  onUpdate(selectedNode.id, { config: { ...selectedNode.config, papel: e.target.value } })
                }
              >
                <option value="gestor">Gestor Direto</option>
                <option value="rh">RH / DP</option>
                <option value="diretoria">Diretoria</option>
                <option value="financeiro">Financeiro</option>
              </select>
            </div>
          </>
        )}

        {selectedNode.type === 'email' && (
          <>
            <div>
              <Label className="text-xs font-body">Template</Label>
              <select
                className="w-full h-8 rounded-lg border border-input bg-background px-2 text-xs font-body"
                value={(selectedNode.config.template as string) ?? 'default'}
                onChange={(e) =>
                  onUpdate(selectedNode.id, { config: { ...selectedNode.config, template: e.target.value } })
                }
              >
                <option value="default">Notificação Padrão</option>
                <option value="aprovacao">Solicitação de Aprovação</option>
                <option value="aprovado">Confirmação de Aprovação</option>
                <option value="rejeitado">Notificação de Rejeição</option>
                <option value="escalacao">Alerta de Escalação SLA</option>
              </select>
            </div>
            <div>
              <Label className="text-xs font-body">Destinatário</Label>
              <Input
                className="h-8 rounded-lg text-xs font-body font-mono"
                value={(selectedNode.config.destinatario as string) ?? ''}
                onChange={(e) =>
                  onUpdate(selectedNode.id, { config: { ...selectedNode.config, destinatario: e.target.value } })
                }
              />
            </div>
          </>
        )}

        {selectedNode.type === 'delay' && (
          <>
            <div>
              <Label className="text-xs font-body">Duração (horas)</Label>
              <Input
                className="h-8 rounded-lg text-xs font-body"
                type="number"
                value={(selectedNode.config.duracao_horas as number) ?? 24}
                onChange={(e) =>
                  onUpdate(selectedNode.id, {
                    config: { ...selectedNode.config, duracao_horas: Number(e.target.value) },
                  })
                }
              />
            </div>
            <div>
              <Label className="text-xs font-body">Tipo</Label>
              <select
                className="w-full h-8 rounded-lg border border-input bg-background px-2 text-xs font-body"
                value={(selectedNode.config.tipo as string) ?? 'fixo'}
                onChange={(e) =>
                  onUpdate(selectedNode.id, { config: { ...selectedNode.config, tipo: e.target.value } })
                }
              >
                <option value="fixo">Fixo (horas)</option>
                <option value="dias_uteis">Dias Úteis</option>
                <option value="proximo_dia_util">Próximo Dia Útil</option>
              </select>
            </div>
          </>
        )}

        {selectedNode.type === 'webhook' && (
          <>
            <div>
              <Label className="text-xs font-body">URL</Label>
              <Input
                className="h-8 rounded-lg text-xs font-body font-mono"
                value={(selectedNode.config.url as string) ?? ''}
                onChange={(e) => onUpdate(selectedNode.id, { config: { ...selectedNode.config, url: e.target.value } })}
              />
            </div>
            <div>
              <Label className="text-xs font-body">Método</Label>
              <select
                className="w-full h-8 rounded-lg border border-input bg-background px-2 text-xs font-body"
                value={(selectedNode.config.metodo as string) ?? 'POST'}
                onChange={(e) =>
                  onUpdate(selectedNode.id, { config: { ...selectedNode.config, metodo: e.target.value } })
                }
              >
                <option value="POST">POST</option>
                <option value="GET">GET</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
              </select>
            </div>
          </>
        )}

        {selectedNode.type === 'gateway_xor' && (
          <div className="bg-warning/10 rounded-lg p-2 border border-warning/20">
            <p className="text-[10px] font-body text-muted-foreground">
              Conecte as saídas do gateway a diferentes alvos. Cada conexão representa uma condição (ex: "Aprovado" /
              "Rejeitado").
            </p>
          </div>
        )}

        <div className="border-t border-border/30 pt-2">
          <Button
            variant="destructive"
            size="sm"
            className="w-full h-7 rounded-lg text-xs font-body"
            onClick={() => onDelete(selectedNode.id)}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Remover Nó
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
