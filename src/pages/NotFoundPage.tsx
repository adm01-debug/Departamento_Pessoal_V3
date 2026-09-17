// V15-472
import { PageTitle } from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, AlertTriangle } from 'lucide-react';
export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <>
    <PageTitle title="Página Não Encontrada" description="A página solicitada não existe" />
    <div className="min-h-[80vh] flex flex-col items-center justify-center">
      <AlertTriangle className="h-16 w-16 text-muted-foreground mb-4" />
      <h1 className="text-6xl font-medium text-muted-foreground/30">404</h1>
      <h2 className="text-2xl font-medium mt-4">Página não encontrada</h2>
      <p className="text-muted-foreground mt-2 text-center max-w-md">A página que você procura não existe, foi movida ou está temporariamente indisponível.</p>
      <div className="flex gap-4 mt-8"><Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4 mr-2" />Voltar</Button><Button onClick={() => navigate('/dashboard')}><Home className="h-4 w-4 mr-2" />Dashboard</Button></div>
    </div>
    </>
  );
}
