import { useState } from 'react';
import { BeneficiosTab, HoleritesPreviewCard, ContasBancariasTab, HoleritesTab } from '@/components/colaborador-detalhes';
import { AnimatedCascadeDialog } from '@/components/ui/animated-cascade-dialog';
import { DollarSign } from 'lucide-react';

export default function MeasureTestPage() {
  const [holeritesOpen, setHoleritesOpen] = useState(false);
  return (
    <div style={{ background: '#0B131F', padding: 24, display: 'grid', gridTemplateColumns: '1.45fr 1fr', gap: 12, alignItems: 'start' }}>
      <div id="measure-beneficios"><BeneficiosTab colaboradorId="mock-1" /></div>
      <div id="measure-holerites"><HoleritesPreviewCard colaboradorId="mock-1" onVerTodos={() => setHoleritesOpen(true)} /></div>
      <div id="measure-contas"><ContasBancariasTab colaboradorId="mock-1" /></div>
      <AnimatedCascadeDialog
        open={holeritesOpen}
        onOpenChange={setHoleritesOpen}
        title="Holerites"
        titleIcon={DollarSign}
        emptyMessage="Nenhum holerite encontrado."
        items={[<HoleritesTab key="holerites" colaboradorId="mock-1" hideHeader />]}
        className="max-w-2xl"
      />
    </div>
  );
}
