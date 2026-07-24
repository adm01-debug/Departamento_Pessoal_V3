-- Create the junction table for Time <-> Brinde relationship
CREATE TABLE IF NOT EXISTS public.times_brindes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    time_id UUID NOT NULL REFERENCES public.times(id) ON DELETE CASCADE,
    brinde_id UUID NOT NULL REFERENCES public.promo_brindes(id) ON DELETE CASCADE,
    quantidade_alocada INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(time_id, brinde_id)
);

-- Enable RLS
ALTER TABLE public.times_brindes ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Enable read for all" ON public.times_brindes;
CREATE POLICY "Enable read for all" ON public.times_brindes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable insert for all" ON public.times_brindes;
CREATE POLICY "Enable insert for all" ON public.times_brindes FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Enable update for all" ON public.times_brindes;
CREATE POLICY "Enable update for all" ON public.times_brindes FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Enable delete for all" ON public.times_brindes;
CREATE POLICY "Enable delete for all" ON public.times_brindes FOR DELETE USING (true);
