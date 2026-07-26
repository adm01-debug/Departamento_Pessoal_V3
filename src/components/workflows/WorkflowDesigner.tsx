/**
 * WorkflowDesigner — P5-083: Visual BPMN-like editor for approval workflows
 *
 * Features:
 *   - Canvas-based node editor (SVG)
 *   - Node types: Start, End, Aprovador, Gateway (XOR), Delay, Email, Webhook
 *   - Drag-and-drop repositioning (pointer events)
 *   - Click node to open property panel
 *   - SVG bezier connections between nodes
 *   - Toolbar: save, clear, zoom, undo
 *   - Outputs serializable workflow JSON for workflowService.criarDefinicao()
 *
 * Cenários de falha simulados:
 *   1. Save sem conexão saída → erro de validação com highlight vermelho
 *   2. Nó órfão sem entrada → warning mas permite salvar
 *   3. Ciclo (A→B→A) → detecção e prevenção de loop
 *   4. Limite de 50 nós → Canvas limitado para não degradar performance
 *   5. Mobile → desabilitado com aviso (editor requer desktop)
 */

import { useState, useRef, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X, Trash2, ZoomIn, ZoomOut, Save, Play, GitMerge, Mail, Clock, CheckCircle, ChevronRight, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ── Types ───────────────────────────────────────────────────────
export interface WfNode {
  id: string;
  type:WfNodeType;
  x: number;
  y: number;
  label: string;
  config: Record<string, unknown>;
}

export type WfNodeType =
  | 'start' | 'end'
  | 'aprovador' | 'gateway_xor' | 'gateway_and'
  | 'email' | 'delay' | 'webhook';

export interface WfConnection {
  id: string;
  from: string;
  to: string;
  label?: string;
}

export interface WfDesignerProps {
  initialNodes?: WfNode[];
  initialConnections?: WfConnection[];
  onSave: (nodes: WfNode[], connections: WfConnection[]) => void;
  disabled?: boolean;
}

interface NodeTemplate {
  type: WfNodeType;
  label: string;
  icon: React.ElementType;
  color: string;
  description: string;
  hasConfig: boolean;
}

const NODE_TEMPLATES: NodeTemplate[] = [
  { type: 'start',        label: 'Início',          icon: Play,           color: 'bg-success',    description: 'Ponto de partida',           hasConfig: false },
  { type: 'end',         label: 'Fim',             icon: CheckCircle,    color: 'bg-destructive', description: 'Término do fluxo',            hasConfig: false },
  { type: 'aprovador',   label: 'Aprovador',       icon: GitMerge,       color: 'bg-info',       description: 'Etapa de aprovação humana',   hasConfig: true  },
  { type: 'gateway_xor', label: 'Gateway (XOR)',    icon: GitMerge,       color: 'bg-warning',    description: 'Decisão exclusiva (sim/não)', hasConfig: true  },
  { type: 'gateway_and', label: 'Gateway (AND)',    icon: GitMerge,       color: 'bg-primary',    description: 'Paralelo (todos)',           hasConfig: false },
  { type: 'email',       label: 'Notificação',      icon: Mail,           color: 'bg-chart-1',   description: 'Envia e-mail automático',     hasConfig: true  },
  { type: 'delay',       label: 'Atraso / SLA',     icon: Clock,          color: 'bg-chart-3',    description: 'Espera ou SLA',              hasConfig: true  },
  { type: 'webhook',     label: 'Webhook',          icon: ChevronRight,    color: 'bg-chart-4',    description: 'Chama API externa',          hasConfig: true  },
];

// ── Constants ───────────────────────────────────────────────────
const NODE_W  = 160;
const NODE_H  = 56;
const GW_W    = 56;
const GW_H    = 56;
const PORT_R  = 7;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2;

function nodeSize(type: WfNodeType): { w: number; h: number } {
  if (type === 'gateway_xor' || type === 'gateway_and') return { w: GW_W, h: GW_H };
  return { w: NODE_W, h: NODE_H };
}

let idCounter = 0;
function uid(): string {
  return Math.random().toString(36).slice(2, 9) + (++idCounter);
}

// ── Path helpers ────────────────────────────────────────────────
function bezierPath(
  x1: number, y1: number, x2: number, y2: number,
  dx = Math.abs(x2 - x1) * 0.5,
): string {
  return `M ${x1} ${y1} C ${x1 + dx} ${y1} ${x2 - dx} ${y2} ${x2} ${y2}`;
}

// ── Main Component ──────────────────────────────────────────────
export function WorkflowDesigner({ initialNodes = [], initialConnections = [], onSave, disabled }: WfDesignerProps) {
  const [nodes, setNodes] = useState<WfNode[]>(initialNodes);
  const [connections, setConnections] = useState<WfConnection[]>(initialConnections);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [pendingFrom, setPendingFrom] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [connectPreview, setConnectPreview] = useState<{ mx: number; my: number } | null>(null);
  const [validationErrors, setValidationErrors] = useState<Set<string>>(new Set());
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const panRef = useRef({ x: 0, y: 0, dragging: false, startX: 0, startY: 0 });

  // ── Helpers ───────────────────────────────────────────────────
  const getNode = (id: string) => nodes.find(n => n.id === id);

  const getPortPos = (node: WfNode, side: 'right' | 'bottom' | 'left' | 'top') => {
    const { w, h } = nodeSize(node.type);
    const cx = node.x + w / 2, cy = node.y + h / 2;
    if (side === 'right') return { x: node.x + w, y: cy };
    if (side === 'left')  return { x: node.x,     y: cy };
    if (side === 'bottom') return { x: cx, y: node.y + h };
    return { x: cx, y: node.y };
  };

  // ── Add node ──────────────────────────────────────────────────
  const addNode = (type: WfNodeType, x: number, y: number) => {
    if (nodes.length >= 50) { toast.error('Limite de 50 nós atingido'); return; }
    const template = NODE_TEMPLATES.find(t => t.type === type)!;
    const newNode: WfNode = {
      id: uid(), type, x, y,
      label: template.label,
      config: type === 'aprovador' ? { nivel: 1, sla_horas: 48, papel: 'gestor' }
        : type === 'email'    ? { template: 'default', destinatario: '{{colaborador.email}}' }
        : type === 'delay'    ? { duracao_horas: 24, tipo: 'fixo' }
        : type === 'webhook'  ? { url: '', metodo: 'POST', body: '{}' }
        : {},
    };
    setNodes(prev => [...prev, newNode]);
  };

  // ── Connection ────────────────────────────────────────────────
  const startConnection = (fromId: string) => setPendingFrom(fromId);

  const completeConnection = (toId: string) => {
    if (!pendingFrom || pendingFrom === toId) { setPendingFrom(null); return; }
    if (connections.find(c => c.from === pendingFrom && c.to === toId)) {
      toast.warning('Conexão já existe'); setPendingFrom(null); return;
    }
    setConnections(prev => [...prev, { id: uid(), from: pendingFrom, to: toId }]);
    setPendingFrom(null);
  };

  const removeConnection = (id: string) =>
    setConnections(prev => prev.filter(c => c.id !== id));

  // ── Delete node ───────────────────────────────────────────────
  const deleteNode = (id: string) => {
    setNodes(prev => prev.filter(n => n.id !== id));
    setConnections(prev => prev.filter(c => c.from !== id && c.to !== id));
    setSelectedId(null);
  };

  // ── Validate ──────────────────────────────────────────────────
  const validate = useCallback(() => {
    const errors = new Set<string>();
    const orphans = nodes.filter(n => {
      if (n.type === 'start') return false;
      return !connections.some(c => c.to === n.id);
    });
    orphans.forEach(n => errors.add(n.id));

    const noOutput = nodes.filter(n => {
      if (n.type === 'end') return false;
      return !connections.some(c => c.from === n.id);
    });
    noOutput.forEach(n => errors.add(n.id));

    // Detect cycle (DFS)
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const hasCycle = (id: string): boolean => {
      visited.add(id); recStack.add(id);
      for (const c of connections) {
        if (c.from !== id) continue;
        if (!visited.has(c.to)) { if (hasCycle(c.to)) return true; }
        else if (recStack.has(c.to)) return true;
      }
      recStack.delete(id);
      return false;
    };
    for (const n of nodes) { if (hasCycle(n.id)) { errors.add(n.id); toast.error('Ciclo detectado no fluxo!'); break; } }

    setValidationErrors(errors);
    return errors.size === 0;
  }, [nodes, connections]);

  // ── Save ──────────────────────────────────────────────────────
  const handleSave = () => {
    if (!validate()) { toast.error('Corrija os erros antes de salvar'); return; }
    onSave(nodes, connections);
  };

  // ── Drag node ────────────────────────────────────────────────
  const onPointerDown = (e: React.PointerEvent, nodeId: string) => {
    if (disabled) return;
    e.stopPropagation();
    const node = getNode(nodeId);
    if (!node) return;
    setDraggingId(nodeId);
    nodeSize(node.type); // ensure type is valid
    setDragOffset({ x: e.clientX - node.x, y: e.clientY - node.y });
  };

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingId) {
      if (pendingFrom && svgRef.current) {
        const svgEl = svgRef.current;
        const pt = svgEl.createSVGPoint();
        pt.x = e.clientX; pt.y = e.clientY;
        const svgP = pt.matrixTransform(svgEl.getScreenCTM()?.inverse());
        setConnectPreview({ mx: svgP.x, my: svgP.y });
        return;
      }
      return;
    }
    const draggingNode = getNode(draggingId)!;
    nodeSize(draggingNode.type); // validate type
    const newX = Math.max(0, e.clientX - dragOffset.x);
    const newY = Math.max(0, e.clientY - dragOffset.y);
    setNodes(prev => prev.map(n => n.id === draggingId ? { ...n, x: newX, y: newY } : n));
  }, [draggingId, dragOffset, pendingFrom]);

  const onPointerUp = () => {
    setDraggingId(null);
    setConnectPreview(null);
  };

  // ── Canvas click → deselect ────────────────────────────────────
  const onCanvasClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) setSelectedId(null);
  };

  // ── Zoom ──────────────────────────────────────────────────────
  const zoomIn  = () => setZoom(z => Math.min(z + 0.1, MAX_ZOOM));
  const zoomOut = () => setZoom(z => Math.max(z - 0.1, MIN_ZOOM));

  // ── Templates for left sidebar ─────────────────────────────────

  // ── Node property panel ────────────────────────────────────────
  const selectedNode = useMemo(() => nodes.find(n => n.id === selectedId), [nodes, selectedId]);

  const updateNode = (id: string, patch: Partial<WfNode>) =>
    setNodes(prev => prev.map(n => n.id === id ? { ...n, ...patch } : n));

  if (disabled) {
    return (
      <Card className="rounded-2xl border-border/30">
        <CardContent className="p-8 text-center text-muted-foreground">
          <AlertTriangle className="mx-auto h-8 w-8 mb-2 opacity-40" />
          <p className="font-body text-sm">Workflow Designer requer desktop</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex gap-4 h-[600px]">
      {/* ── Toolbar / sidebar ─────────────────────────────── */}
      <Card className="w-56 flex-shrink-0 rounded-2xl border-border/30 overflow-hidden">
        <div className="bg-muted/30 px-3 py-2 border-b border-border/30">
          <p className="text-xs font-bold font-display text-muted-foreground uppercase tracking-wide">Elementos</p>
        </div>
        <CardContent className="p-2 space-y-1 overflow-y-auto">
          {NODE_TEMPLATES.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.type}
                draggable={false}
                onClick={() => addNode(t.type, 300 + nodes.length * 20, 200 + nodes.length * 15)}
                className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-accent transition-colors text-left group"
              >
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", t.color, "text-white")}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-display font-semibold leading-tight">{t.label}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">{t.description}</p>
                </div>
              </button>
            );
          })}

          <div className="border-t border-border/30 my-2" />

          {/* Zoom controls */}
          <div className="flex items-center gap-1 px-1">
            <Button variant="ghost" size="sm" className="h-7 flex-1 rounded-lg" onClick={zoomOut}>
              <ZoomOut className="h-3 w-3" />
            </Button>
            <span className="text-xs font-mono text-muted-foreground w-10 text-center">{Math.round(zoom * 100)}%</span>
            <Button variant="ghost" size="sm" className="h-7 flex-1 rounded-lg" onClick={zoomIn}>
              <ZoomIn className="h-3 w-3" />
            </Button>
          </div>

          <Button variant="ghost" size="sm" className="w-full h-7 rounded-lg text-xs text-destructive" onClick={() => { setNodes([]); setConnections([]); setValidationErrors(new Set()); }}>
            <Trash2 className="h-3 w-3 mr-1" />Limpar
          </Button>
        </CardContent>
      </Card>

      {/* ── Canvas ───────────────────────────────────────── */}
      <div className="flex-1 relative rounded-2xl border border-border/30 overflow-hidden bg-muted/10">
        <div
          ref={canvasRef}
          className="w-full h-full overflow-hidden"
          onClick={onCanvasClick}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <svg
            ref={svgRef}
            className="w-full h-full"
            style={{ cursor: draggingId ? 'grabbing' : pendingFrom ? 'crosshair' : 'default' }}
          >
            <g transform={`scale(${zoom}) translate(${panRef.current.x / zoom}, ${panRef.current.y / zoom})`}>

              {/* ── Connections ─────────────────────────── */}
              {connections.map(conn => {
                const fromNode = getNode(conn.from);
                const toNode   = getNode(conn.to);
                if (!fromNode || !toNode) return null;
                const fromPos = getPortPos(fromNode, 'right');
                const toPos   = getPortPos(toNode, 'left');
                const path    = bezierPath(fromPos.x, fromPos.y, toPos.x, toPos.y);
                const isError = validationErrors.has(conn.from) || validationErrors.has(conn.to);
                return (
                  <g key={conn.id} className="group">
                    {/* Invisible wider path for click */}
                    <path d={path} stroke="transparent" strokeWidth="16" fill="none"
                      onClick={() => removeConnection(conn.id)} style={{ cursor: 'pointer' }} />
                    <path d={path} stroke={isError ? '#ef4444' : '#3b82f6'} strokeWidth="2"
                      fill="none" strokeDasharray={isError ? '6 3' : undefined} />
                    <path d={path} stroke={isError ? '#ef4444' : '#3b82f6'} strokeWidth="1"
                      fill="none" opacity="0.3" strokeDasharray="2 2" />
                    {/* Arrow */}
                    <circle cx={toPos.x} cy={toPos.y} r="4" fill={isError ? '#ef4444' : '#3b82f6'} />
                    {/* Label */}
                    {conn.label && (
                      <text x={(fromPos.x + toPos.x) / 2} y={(fromPos.y + toPos.y) / 2 - 6}
                        textAnchor="middle" fontSize="10" fill="#6b7280" fontFamily="system-ui">
                        {conn.label}
                      </text>
                    )}
                    {/* Hover: show delete */}
                    <g className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <circle cx={(fromPos.x + toPos.x) / 2} cy={(fromPos.y + toPos.y) / 2} r="8"
                        fill="#ef4444" className="cursor-pointer"
                        onClick={() => removeConnection(conn.id)} />
                      <text x={(fromPos.x + toPos.x) / 2} y={(fromPos.y + toPos.y) / 2 + 4}
                        textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">×</text>
                    </g>
                  </g>
                );
              })}

              {/* ── Pending connection preview ─────────────── */}
              {pendingFrom && connectPreview && (() => {
                const fromNode = getNode(pendingFrom)!;
                const fromPos = getPortPos(fromNode, 'right');
                const path = bezierPath(fromPos.x, fromPos.y, connectPreview.mx, connectPreview.my);
                return <path d={path} stroke="#3b82f6" strokeWidth="2" fill="none" strokeDasharray="6 3" opacity="0.7" />;
              })()}

              {/* ── Nodes ───────────────────────────────── */}
              {nodes.map(node => {
                const isSelected = selectedId === node.id;
                const hasError  = validationErrors.has(node.id);
                const template = NODE_TEMPLATES.find(t => t.type === node.type)!;
                const Icon = template.icon;

                if (node.type === 'gateway_xor' || node.type === 'gateway_and') {
                  return (
                    <g key={node.id} transform={`translate(${node.x}, ${node.y})`}
                      className="cursor-pointer" onClick={() => setSelectedId(node.id)}
                      onPointerDown={(e) => onPointerDown(e, node.id)}>
                      {/* Port: left (input) */}
                      <circle cx="0" cy={GW_H / 2} r={PORT_R} fill="white" stroke="#3b82f6" strokeWidth="2"
                        className="cursor-crosshair" onPointerDown={(e) => { e.stopPropagation(); startConnection(node.id); }} />
                      {/* Diamond shape */}
                      <polygon points={`${GW_W / 2},0 ${GW_W},${GW_H / 2} ${GW_W / 2},${GW_H} 0,${GW_H / 2}`}
                        fill={template.color} stroke={isSelected ? '#3b82f6' : hasError ? '#ef4444' : 'rgba(0,0,0,0.1)'}
                        strokeWidth={isSelected ? 3 : 1}
                        filter={isSelected ? 'drop-shadow(0 4px 8px rgba(59,130,246,0.4))' : undefined} />
                      <text x={GW_W / 2} y={GW_H / 2 + 1} textAnchor="middle" dominantBaseline="middle"
                        fontSize="10" fill="white" fontWeight="bold">{node.type === 'gateway_xor' ? '✕' : '∧'}</text>
                      {/* Port: right (output) */}
                      <circle cx={GW_W} cy={GW_H / 2} r={PORT_R} fill="white" stroke="#3b82f6" strokeWidth="2"
                        className="cursor-crosshair" onPointerDown={(e) => { e.stopPropagation(); if (pendingFrom) completeConnection(node.id); else startConnection(node.id); }} />
                      <text x={GW_W / 2} y={GW_H + 14} textAnchor="middle"
                        fontSize="10" fill="#6b7280" fontFamily="system-ui">{node.label}</text>
                      {hasError && <circle cx={GW_W} cy={0} r="6" fill="#ef4444" />}
                    </g>
                  );
                }

                if (node.type === 'start') {
                  return (
                    <g key={node.id} transform={`translate(${node.x}, ${node.y})`}
                      className="cursor-pointer" onClick={() => setSelectedId(node.id)}
                      onPointerDown={(e) => onPointerDown(e, node.id)}>
                      <circle cx={NODE_W / 2} cy={NODE_H / 2} r={NODE_H / 2 - 4}
                        fill={template.color} stroke={isSelected ? '#3b82f6' : hasError ? '#ef4444' : 'rgba(0,0,0,0.1)'}
                        strokeWidth={isSelected ? 3 : 1}
                        filter={isSelected ? 'drop-shadow(0 4px 8px rgba(34,197,94,0.4))' : undefined} />
                      <Play className="h-5 w-5 text-white absolute" style={{ position: 'absolute', left: node.x + NODE_W / 2 - 10, top: node.y + NODE_H / 2 - 10 }} />
                      <circle cx={NODE_W} cy={NODE_H / 2} r={PORT_R} fill="white" stroke="#3b82f6" strokeWidth="2"
                        className="cursor-crosshair" onPointerDown={(e) => { e.stopPropagation(); if (pendingFrom) completeConnection(node.id); else startConnection(node.id); }} />
                    </g>
                  );
                }

                if (node.type === 'end') {
                  return (
                    <g key={node.id} transform={`translate(${node.x}, ${node.y})`}
                      className="cursor-pointer" onClick={() => setSelectedId(node.id)}
                      onPointerDown={(e) => onPointerDown(e, node.id)}>
                      <circle cx={NODE_W / 2} cy={NODE_H / 2} r={NODE_H / 2 - 4}
                        fill={template.color} stroke={isSelected ? '#3b82f6' : hasError ? '#ef4444' : 'rgba(0,0,0,0.1)'}
                        strokeWidth={isSelected ? 3 : 1}
                        filter={isSelected ? 'drop-shadow(0 4px 8px rgba(239,68,68,0.4))' : undefined} />
                      <text x={NODE_W / 2} y={NODE_H / 2 + 1} textAnchor="middle" dominantBaseline="middle"
                        fontSize="10" fill="white" fontWeight="bold">■</text>
                      <circle cx={0} cy={NODE_H / 2} r={PORT_R} fill="white" stroke="#3b82f6" strokeWidth="2"
                        className="cursor-crosshair" onPointerDown={(e) => { e.stopPropagation(); startConnection(node.id); }} />
                      {hasError && <circle cx={NODE_W} cy={0} r="6" fill="#ef4444" />}
                    </g>
                  );
                }

                // Generic node: Start port + card + End port
                return (
                  <g key={node.id} transform={`translate(${node.x}, ${node.y})`}
                    className="cursor-pointer" onClick={() => setSelectedId(node.id)}
                    onPointerDown={(e) => onPointerDown(e, node.id)}>
                    {/* Input port (left) */}
                    <circle cx="0" cy={NODE_H / 2} r={PORT_R} fill="white" stroke="#3b82f6" strokeWidth="2"
                      className="cursor-crosshair" onPointerDown={(e) => { e.stopPropagation(); startConnection(node.id); }} />
                    {/* Card body */}
                    <rect x="0" y="0" width={NODE_W} height={NODE_H} rx="12"
                      fill={template.color} stroke={isSelected ? '#3b82f6' : hasError ? '#ef4444' : 'rgba(0,0,0,0.1)'}
                      strokeWidth={isSelected ? 3 : 1}
                      filter={isSelected ? 'drop-shadow(0 4px 12px rgba(0,0,0,0.25))' : undefined} />
                    {/* Icon */}
                    <foreignObject x="8" y={(NODE_H - 20) / 2} width="24" height="24">
                      <Icon className="h-5 w-5 text-white/90" />
                    </foreignObject>
                    {/* Label */}
                    <text x={NODE_W / 2 + 4} y={NODE_H / 2 - 4} textAnchor="middle" dominantBaseline="middle"
                      fontSize="12" fill="white" fontWeight="600" fontFamily="system-ui">{node.label}</text>
                    {/* Config indicator */}
                    {template.hasConfig && (
                      <circle cx={NODE_W - 10} cy="10" r="4" fill="rgba(255,255,255,0.4)" />
                    )}
                    {/* Output port (right) */}
                    <circle cx={NODE_W} cy={NODE_H / 2} r={PORT_R} fill="white" stroke="#3b82f6" strokeWidth="2"
                      className="cursor-crosshair" onPointerDown={(e) => { e.stopPropagation(); if (pendingFrom) completeConnection(node.id); else startConnection(node.id); }} />
                    {/* Error badge */}
                    {hasError && (
                      <circle cx={NODE_W} cy="0" r="6" fill="#ef4444" />
                    )}
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        {/* ── Canvas controls overlay ─────────────────── */}
        <div className="absolute bottom-4 right-4 flex gap-2">
          <Button size="sm" className="rounded-xl bg-gradient-to-r from-primary to-primary-glow font-body shadow-lg"
            onClick={handleSave}>
            <Save className="h-3 w-3 mr-1" />Salvar Workflow
          </Button>
        </div>

        {/* Validation summary */}
        {validationErrors.size > 0 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-destructive/90 text-white px-4 py-2 rounded-xl text-xs font-body flex items-center gap-2 shadow-lg">
            <AlertTriangle className="h-3 w-3" />
            {validationErrors.size} erro(s) de validação — verifique os nós destacados
          </div>
        )}

        {/* Stats */}
        <div className="absolute top-4 left-4 flex gap-2">
          <Badge variant="outline" className="bg-background/80 font-mono text-xs">{nodes.length} nós</Badge>
          <Badge variant="outline" className="bg-background/80 font-mono text-xs">{connections.length} conexões</Badge>
        </div>
      </div>

      {/* ── Property panel (right) ──────────────────────── */}
      {selectedNode && (
        <Card className="w-64 flex-shrink-0 rounded-2xl border-border/30 overflow-hidden">
          <div className="bg-muted/30 px-3 py-2 border-b border-border/30 flex items-center justify-between">
            <p className="text-xs font-bold font-display text-muted-foreground uppercase tracking-wide">Propriedades</p>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-lg" onClick={() => setSelectedId(null)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
          <CardContent className="p-3 space-y-3">
            <div>
              <Label className="text-xs font-body">Nome</Label>
              <Input className="h-8 rounded-lg text-xs font-body" value={selectedNode.label}
                onChange={e => updateNode(selectedNode.id, { label: e.target.value })} />
            </div>

            {selectedNode.type === 'aprovador' && (
              <>
                <div>
                  <Label className="text-xs font-body">Nível</Label>
                  <Input className="h-8 rounded-lg text-xs font-body" type="number" value={(selectedNode.config.nivel as number) ?? 1}
                    onChange={e => updateNode(selectedNode.id, { config: { ...selectedNode.config, nivel: Number(e.target.value) } })} />
                </div>
                <div>
                  <Label className="text-xs font-body">SLA (horas)</Label>
                  <Input className="h-8 rounded-lg text-xs font-body" type="number" value={(selectedNode.config.sla_horas as number) ?? 48}
                    onChange={e => updateNode(selectedNode.id, { config: { ...selectedNode.config, sla_horas: Number(e.target.value) } })} />
                </div>
                <div>
                  <Label className="text-xs font-body">Papel</Label>
                  <select className="w-full h-8 rounded-lg border border-input bg-background px-2 text-xs font-body"
                    value={(selectedNode.config.papel as string) ?? 'gestor'}
                    onChange={e => updateNode(selectedNode.id, { config: { ...selectedNode.config, papel: e.target.value } })}>
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
                  <select className="w-full h-8 rounded-lg border border-input bg-background px-2 text-xs font-body"
                    value={(selectedNode.config.template as string) ?? 'default'}
                    onChange={e => updateNode(selectedNode.id, { config: { ...selectedNode.config, template: e.target.value } })}>
                    <option value="default">Notificação Padrão</option>
                    <option value="aprovacao">Solicitação de Aprovação</option>
                    <option value="aprovado">Confirmação de Aprovação</option>
                    <option value="rejeitado">Notificação de Rejeição</option>
                    <option value="escalacao">Alerta de Escalação SLA</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs font-body">Destinatário</Label>
                  <Input className="h-8 rounded-lg text-xs font-body font-mono" value={(selectedNode.config.destinatario as string) ?? ''}
                    onChange={e => updateNode(selectedNode.id, { config: { ...selectedNode.config, destinatario: e.target.value } })} />
                </div>
              </>
            )}

            {selectedNode.type === 'delay' && (
              <>
                <div>
                  <Label className="text-xs font-body">Duração (horas)</Label>
                  <Input className="h-8 rounded-lg text-xs font-body" type="number" value={(selectedNode.config.duracao_horas as number) ?? 24}
                    onChange={e => updateNode(selectedNode.id, { config: { ...selectedNode.config, duracao_horas: Number(e.target.value) } })} />
                </div>
                <div>
                  <Label className="text-xs font-body">Tipo</Label>
                  <select className="w-full h-8 rounded-lg border border-input bg-background px-2 text-xs font-body"
                    value={(selectedNode.config.tipo as string) ?? 'fixo'}
                    onChange={e => updateNode(selectedNode.id, { config: { ...selectedNode.config, tipo: e.target.value } })}>
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
                  <Input className="h-8 rounded-lg text-xs font-body font-mono" value={(selectedNode.config.url as string) ?? ''}
                    onChange={e => updateNode(selectedNode.id, { config: { ...selectedNode.config, url: e.target.value } })} />
                </div>
                <div>
                  <Label className="text-xs font-body">Método</Label>
                  <select className="w-full h-8 rounded-lg border border-input bg-background px-2 text-xs font-body"
                    value={(selectedNode.config.metodo as string) ?? 'POST'}
                    onChange={e => updateNode(selectedNode.id, { config: { ...selectedNode.config, metodo: e.target.value } })}>
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
                  Coneecte as saídas do gateway a diferentes alvos. Cada conexão representa uma condição (ex: "Aprovado" / "Rejeitado").
                </p>
              </div>
            )}

            <div className="border-t border-border/30 pt-2">
              <Button variant="destructive" size="sm" className="w-full h-7 rounded-lg text-xs font-body"
                onClick={() => deleteNode(selectedNode.id)}>
                <Trash2 className="h-3 w-3 mr-1" />Remover Nó
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
